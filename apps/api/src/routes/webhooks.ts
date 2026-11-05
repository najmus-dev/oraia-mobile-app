import { Router } from 'express';
import { config } from '../config';
import { logger } from '../lib/logger';
import {
  classifyInboundChannel,
  inboundMessagePreview,
  isAppointmentCreateEvent,
  isConversationUnreadEvent,
  isInboundDirection,
  isInboundMessageEvent,
  isTaskCreateEvent,
  normalizeWebhookEventType,
  parseAppointmentCreate,
  parseConversationUnread,
  parseInboundMessage,
  parseTaskCreate,
  unwrapWebhookPayload,
} from '../lib/ghlWebhookEvents';
import { ghlStyleNotificationCopy } from '../lib/inboundNotificationCopy';
import { assertGhlWebhookAuthorized } from '../lib/webhookAuth';
import {
  recordWebhookAccepted,
  recordWebhookError,
  recordWebhookReceived,
} from '../lib/webhookTelemetry';
import { upsertNotification } from '../services/notificationService';
import {
  appointmentNotificationDedupeKey,
  conversationEventDedupeKey,
  taskNotificationDedupeKey,
} from '../lib/notificationHelpers';
import { sendAppointmentPush, sendConversationPush, sendTaskPush } from '../services/pushService';
import { tokenVault, getLocationGhlClient } from '../services/tokenVault';
import { requestUnreadPushPoll } from '../jobs/unreadPushPoll';
import { ingestConversationAlert, mergeConversations } from '../services/conversationAlertIngest';

export const webhooksRouter = Router();

type GhlWebhookBody = {
  type?: string;
  event?: string;
  locationId?: string;
  companyId?: string;
  installType?: string;
  id?: string;
};

function parseWebhookBody(req: { body: unknown }): GhlWebhookBody {
  const raw = req.body;
  if (Buffer.isBuffer(raw)) {
    return JSON.parse(raw.toString('utf8')) as GhlWebhookBody;
  }
  return (raw ?? {}) as GhlWebhookBody;
}

function rawBodyBuffer(req: { body: unknown }): Buffer {
  if (Buffer.isBuffer(req.body)) return req.body;
  return Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
}

/**
 * GHL marketplace webhooks.
 * Point your app webhook URL to: POST /webhooks/ghl
 *
 * Enable InboundMessage in GHL app advanced settings for SMS and call push notifications.
 */
webhooksRouter.post('/ghl', async (req, res, next) => {
  try {
    const rawBody = rawBodyBuffer(req);
    assertGhlWebhookAuthorized(req, rawBody);
    const body = unwrapWebhookPayload(parseWebhookBody(req));
    const type = normalizeWebhookEventType(body);
    const locationId =
      (typeof body.locationId === 'string' ? body.locationId : undefined) ??
      (typeof body.id === 'string' ? body.id : undefined);
    const companyId =
      (typeof body.companyId === 'string' ? body.companyId : undefined) ?? config.ghl.companyId;

    recordWebhookReceived(type);
    logger.info('GHL webhook received', {
      type,
      locationId,
      companyId,
      messageType: typeof body.messageType === 'string' ? body.messageType : undefined,
    });

    if (type.toUpperCase() === 'INSTALL' && locationId) {
      await tokenVault.provisionLocationOnInstall(locationId);
      recordWebhookAccepted(type, 'location_token_provisioned');
      res.json({ ok: true, action: 'location_token_provisioned', locationId });
      return;
    }

    if (type.toUpperCase() === 'UNINSTALL' && locationId) {
      await tokenVault.removeLocationOnUninstall(locationId);
      recordWebhookAccepted(type, 'location_token_removed');
      res.json({ ok: true, action: 'location_token_removed', locationId });
      return;
    }

    // Persist the Notifications drawer row BEFORE ack so a crash after 200 cannot
    // leave Conversations updated (GHL) while Oraia's feed stays empty.
    if (isInboundMessageEvent(type)) {
      const inbound = parseInboundMessage(body);
      if (!inbound?.locationId || !inbound.conversationId || !isInboundDirection(inbound.direction)) {
        const action = 'inbound_message_ignored';
        recordWebhookAccepted(type, action);
        res.json({
          ok: true,
          action,
          reason: inbound && !isInboundDirection(inbound.direction) ? 'outbound' : 'missing ids',
        });
        return;
      }
      await persistInboundMessageNotification(inbound);
      recordWebhookAccepted(type, 'inbound_message_accepted');
      res.json({ ok: true, action: 'inbound_message_accepted' });
      void pushInboundMessage(inbound).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        recordWebhookError(type, message);
        logger.error('Inbound message push failed after feed upsert', {
          conversationId: inbound.conversationId,
          message,
        });
      });
      return;
    }

    if (isConversationUnreadEvent(type)) {
      const unread = parseConversationUnread(body);
      if (unread?.locationId && unread.conversationId && unread.unreadCount > 0) {
        await ingestUnreadConversationWebhook(unread).catch((err) => {
          logger.warn('Conversation unread ingest failed — poll will retry', {
            conversationId: unread.conversationId,
            message: err instanceof Error ? err.message : String(err),
          });
        });
        recordWebhookAccepted(type, 'conversation_unread_ingested');
        res.json({ ok: true, action: 'conversation_unread_ingested' });
        requestUnreadPushPoll('conversation-unread-webhook');
        return;
      }
      recordWebhookAccepted(type, 'conversation_unread_ignored');
      res.json({ ok: true, action: 'conversation_unread_ignored' });
      return;
    }

    if (isAppointmentCreateEvent(type)) {
      const appt = parseAppointmentCreate(body);
      if (!appt?.locationId || !appt.appointmentId) {
        recordWebhookAccepted(type, 'appointment_create_ignored');
        res.json({ ok: true, action: 'appointment_create_ignored', reason: 'missing ids' });
        return;
      }
      await persistAppointmentNotification(appt);
      recordWebhookAccepted(type, 'appointment_create_accepted');
      res.json({ ok: true, action: 'appointment_create_accepted' });
      void handleAppointmentPush(appt).catch((err) => {
        logger.error('Appointment push failed after feed upsert', {
          appointmentId: appt.appointmentId,
          message: err instanceof Error ? err.message : String(err),
        });
      });
      return;
    }

    if (isTaskCreateEvent(type)) {
      const task = parseTaskCreate(body);
      if (!task?.locationId || !task.taskId) {
        recordWebhookAccepted(type, 'task_create_ignored');
        res.json({ ok: true, action: 'task_create_ignored', reason: 'missing ids' });
        return;
      }
      await persistTaskNotification(task);
      recordWebhookAccepted(type, 'task_create_accepted');
      res.json({ ok: true, action: 'task_create_accepted' });
      void handleTaskPush(task).catch((err) => {
        logger.error('Task push failed after feed upsert', {
          taskId: task.taskId,
          message: err instanceof Error ? err.message : String(err),
        });
      });
      return;
    }

    recordWebhookAccepted(type, 'ignored');
    res.json({ ok: true, action: 'ignored', type });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordWebhookError('unknown', message);
    next(err);
  }
});

async function persistInboundMessageNotification(
  inbound: NonNullable<ReturnType<typeof parseInboundMessage>>,
): Promise<void> {
  const channel = classifyInboundChannel(inbound);
  const copy = ghlStyleNotificationCopy({
    contactName: inbound.contactName || inbound.from,
    lastMessageType:
      inbound.messageTypeString ||
      inbound.messageType ||
      (channel === 'call'
        ? 'TYPE_CALL'
        : channel === 'voicemail'
          ? 'TYPE_VOICEMAIL'
          : channel === 'email'
            ? 'TYPE_EMAIL'
            : 'TYPE_SMS'),
    lastMessageBody: inboundMessagePreview(inbound),
    phone: inbound.from,
  });
  const stamp =
    inbound.messageId?.trim() ||
    inbound.dateAdded?.trim() ||
    copy.body.slice(0, 40) ||
    'inbound';
  await upsertNotification({
    locationId: inbound.locationId!,
    type: 'conversations',
    title: copy.title,
    body: copy.body,
    dedupeKey: conversationEventDedupeKey(inbound.conversationId!, stamp),
    occurredAt: inbound.dateAdded,
    markUnread: true,
    action: {
      kind: 'conversation',
      conversationId: inbound.conversationId!,
      contactId: inbound.contactId,
    },
  });
}

async function pushInboundMessage(
  inbound: NonNullable<ReturnType<typeof parseInboundMessage>>,
): Promise<void> {
  const channel = classifyInboundChannel(inbound);
  const copy = ghlStyleNotificationCopy({
    contactName: inbound.contactName || inbound.from,
    lastMessageType:
      inbound.messageTypeString ||
      inbound.messageType ||
      (channel === 'call'
        ? 'TYPE_CALL'
        : channel === 'voicemail'
          ? 'TYPE_VOICEMAIL'
          : channel === 'email'
            ? 'TYPE_EMAIL'
            : 'TYPE_SMS'),
    lastMessageBody: inboundMessagePreview(inbound),
    phone: inbound.from,
  });
  const stamp =
    inbound.messageId?.trim() ||
    inbound.dateAdded?.trim() ||
    copy.body.slice(0, 40) ||
    'inbound';
  const sent = await sendConversationPush({
    locationId: inbound.locationId!,
    conversationId: inbound.conversationId!,
    contactId: inbound.contactId,
    messageId: stamp,
    assignedTo: inbound.assignedTo,
    title: copy.title,
    body: copy.body,
    channel: copy.channel,
  });
  logger.info('Inbound message push completed', {
    conversationId: inbound.conversationId,
    sent,
  });
}

async function ingestUnreadConversationWebhook(
  unread: NonNullable<ReturnType<typeof parseConversationUnread>>,
): Promise<void> {
  const ghl = getLocationGhlClient(unread.locationId);
  const [byContact, unreadList, recent] = await Promise.all([
    unread.contactId
      ? ghl.searchConversations(unread.locationId, {
          limit: 10,
          contactId: unread.contactId,
          sort: 'desc',
          sortBy: 'last_message_date',
        })
      : Promise.resolve({ conversations: [] }),
    ghl.searchConversations(unread.locationId, {
      limit: 25,
      status: 'unread',
      sort: 'desc',
      sortBy: 'last_message_date',
    }),
    ghl.searchConversations(unread.locationId, {
      limit: 25,
      sort: 'desc',
      sortBy: 'last_message_date',
    }),
  ]);

  const merged = mergeConversations(
    byContact.conversations,
    unreadList.conversations,
    recent.conversations,
  );
  const match =
    merged.find((c) => c.id === unread.conversationId) ??
    ({
      id: unread.conversationId,
      contactId: unread.contactId,
      assignedTo: unread.assignedTo,
      unreadCount: unread.unreadCount,
      lastMessageBody: 'New message',
      lastMessageType: 'TYPE_SMS',
      lastMessageDirection: 'inbound',
      lastMessageDate: new Date().toISOString(),
    } as const);

  await ingestConversationAlert({
    locationId: unread.locationId,
    convo: match,
    source: 'unread-webhook',
    sendPush: true,
  });
}

async function persistAppointmentNotification(
  appt: NonNullable<ReturnType<typeof parseAppointmentCreate>>,
): Promise<void> {
  const title = appt.title?.trim() || 'New appointment';
  const startLabel = appt.startTime ? new Date(appt.startTime).toLocaleString() : 'Scheduled';
  await upsertNotification({
    locationId: appt.locationId,
    type: 'appointments',
    title,
    body: startLabel,
    dedupeKey: appointmentNotificationDedupeKey(appt.appointmentId),
    targetGhlUserId: appt.assignedUserId,
    markUnread: true,
    action: {
      kind: 'appointment',
      appointmentId: appt.appointmentId,
      contactId: appt.contactId,
    },
  });
}

async function handleAppointmentPush(
  appt: NonNullable<ReturnType<typeof parseAppointmentCreate>>,
): Promise<void> {
  const title = appt.title?.trim() || 'New appointment';
  const startLabel = appt.startTime ? new Date(appt.startTime).toLocaleString() : 'Scheduled';
  await sendAppointmentPush({
    locationId: appt.locationId,
    appointmentId: appt.appointmentId,
    contactId: appt.contactId,
    assignedTo: appt.assignedUserId,
    title,
    body: startLabel,
  });
}

async function persistTaskNotification(
  task: NonNullable<ReturnType<typeof parseTaskCreate>>,
): Promise<void> {
  const title = task.title?.trim() || 'New task';
  const bodyText =
    task.body?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Task assigned';
  await upsertNotification({
    locationId: task.locationId,
    type: 'tasks',
    title,
    body: bodyText.slice(0, 200),
    dedupeKey: taskNotificationDedupeKey(task.taskId),
    targetGhlUserId: task.assignedTo,
    markUnread: true,
    action: {
      kind: 'task',
      taskId: task.taskId,
      taskContactId: task.contactId,
      contactId: task.contactId,
    },
  });
}

async function handleTaskPush(task: NonNullable<ReturnType<typeof parseTaskCreate>>): Promise<void> {
  const title = task.title?.trim() || 'New task';
  const bodyText =
    task.body?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Task assigned';
  await sendTaskPush({
    locationId: task.locationId,
    taskId: task.taskId,
    contactId: task.contactId,
    assignedTo: task.assignedTo,
    title,
    body: bodyText.slice(0, 200),
  });
}
