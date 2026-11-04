import { Router } from 'express';
import { config } from '../config';
import { logger } from '../lib/logger';
import {
  inboundNotificationCopy,
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
import { assertGhlWebhookAuthorized } from '../lib/webhookAuth';
import { upsertNotification } from '../services/notificationService';
import {
  appointmentNotificationDedupeKey,
  conversationNotificationDedupeKey,
  taskNotificationDedupeKey,
} from '../lib/notificationHelpers';
import { sendAppointmentPush, sendConversationPush, sendTaskPush } from '../services/pushService';
import { tokenVault } from '../services/tokenVault';

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

    logger.info('GHL webhook received', {
      type,
      locationId,
      companyId,
      messageType: typeof body.messageType === 'string' ? body.messageType : undefined,
    });

    if (type.toUpperCase() === 'INSTALL' && locationId) {
      await tokenVault.provisionLocationOnInstall(locationId);
      res.json({ ok: true, action: 'location_token_provisioned', locationId });
      return;
    }

    if (type.toUpperCase() === 'UNINSTALL' && locationId) {
      await tokenVault.removeLocationOnUninstall(locationId);
      res.json({ ok: true, action: 'location_token_removed', locationId });
      return;
    }

    if (isInboundMessageEvent(type)) {
      const inbound = parseInboundMessage(body);
      if (inbound?.locationId && inbound.conversationId && isInboundDirection(inbound.direction)) {
        const copy = inboundNotificationCopy(inbound);
        await upsertNotification({
          locationId: inbound.locationId,
          type: 'conversations',
          title: copy.title,
          body: copy.body,
          dedupeKey: conversationNotificationDedupeKey(inbound.conversationId),
          targetGhlUserId: inbound.assignedTo,
          occurredAt: inbound.dateAdded,
          markUnread: true,
          action: {
            kind: 'conversation',
            conversationId: inbound.conversationId,
            contactId: inbound.contactId,
          },
        });
        const sent = await sendConversationPush({
          locationId: inbound.locationId,
          conversationId: inbound.conversationId,
          contactId: inbound.contactId,
          messageId:
            inbound.messageId ||
            `${inbound.conversationId}:${inbound.dateAdded ?? inbound.body ?? copy.body}`,
          assignedTo: inbound.assignedTo,
          title: copy.title,
          body: copy.body,
          channel: copy.channel,
        });
        res.json({ ok: true, action: 'inbound_message_push', sent });
        return;
      }
      res.json({
        ok: true,
        action: 'inbound_message_ignored',
        reason: inbound && !isInboundDirection(inbound.direction) ? 'outbound' : 'missing ids',
      });
      return;
    }

    if (isConversationUnreadEvent(type)) {
      const unread = parseConversationUnread(body);
      if (unread?.locationId && unread.conversationId && unread.unreadCount > 0) {
        await upsertNotification({
          locationId: unread.locationId,
          type: 'conversations',
          title: 'New message',
          body: 'Unread conversation',
          dedupeKey: conversationNotificationDedupeKey(unread.conversationId),
          targetGhlUserId: unread.assignedTo,
          markUnread: true,
          action: {
            kind: 'conversation',
            conversationId: unread.conversationId,
            contactId: unread.contactId,
          },
        });
        res.json({ ok: true, action: 'conversation_unread_recorded' });
        return;
      }
      res.json({ ok: true, action: 'conversation_unread_ignored' });
      return;
    }

    if (isAppointmentCreateEvent(type)) {
      const appt = parseAppointmentCreate(body);
      if (appt?.locationId && appt.appointmentId) {
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
        const sent = await sendAppointmentPush({
          locationId: appt.locationId,
          appointmentId: appt.appointmentId,
          contactId: appt.contactId,
          assignedTo: appt.assignedUserId,
          title,
          body: startLabel,
        });
        res.json({ ok: true, action: 'appointment_create_notification', sent });
        return;
      }
      res.json({ ok: true, action: 'appointment_create_ignored', reason: 'missing ids' });
      return;
    }

    if (isTaskCreateEvent(type)) {
      const task = parseTaskCreate(body);
      if (task?.locationId && task.taskId) {
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
        const sent = await sendTaskPush({
          locationId: task.locationId,
          taskId: task.taskId,
          contactId: task.contactId,
          assignedTo: task.assignedTo,
          title,
          body: bodyText.slice(0, 200),
        });
        res.json({ ok: true, action: 'task_create_notification', sent });
        return;
      }
      res.json({ ok: true, action: 'task_create_ignored', reason: 'missing ids' });
      return;
    }

    res.json({ ok: true, action: 'ignored', type });
  } catch (err) {
    next(err);
  }
});
