import { Router } from 'express';
import { config } from '../config';
import { logger } from '../lib/logger';
import {
  inboundMessagePreview,
  isAppointmentCreateEvent,
  isInboundMessageEvent,
  isTaskCreateEvent,
  normalizeWebhookEventType,
  parseAppointmentCreate,
  parseInboundMessage,
  parseTaskCreate,
} from '../lib/ghlWebhookEvents';
import { assertGhlWebhookAuthorized } from '../lib/webhookAuth';
import { upsertNotification } from '../services/notificationService';
import { conversationNotificationDedupeKey } from '../lib/notificationHelpers';
import { sendConversationPush } from '../services/pushService';
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
 * Enable InboundMessage in GHL app advanced settings for push notifications.
 */
webhooksRouter.post('/ghl', async (req, res, next) => {
  try {
    const rawBody = rawBodyBuffer(req);
    assertGhlWebhookAuthorized(req, rawBody);
    const body = parseWebhookBody(req);
    const type = normalizeWebhookEventType(body);
    const locationId = body.locationId ?? body.id;
    const companyId = body.companyId ?? config.ghl.companyId;

    logger.info('GHL webhook received', { type, locationId, companyId });

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
      if (inbound?.locationId && inbound.conversationId) {
        const preview = inboundMessagePreview(inbound);
        const fromLabel = inbound.from?.trim();
        const title = fromLabel ? `Message from ${fromLabel}` : 'New message';
        await upsertNotification({
          locationId: inbound.locationId,
          type: 'conversations',
          title,
          body: preview,
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
          messageId: inbound.messageId,
          assignedTo: inbound.assignedTo,
          title,
          body: preview,
        });
        res.json({ ok: true, action: 'inbound_message_push', sent });
        return;
      }
      res.json({ ok: true, action: 'inbound_message_ignored', reason: 'missing ids' });
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
          dedupeKey: `appointment:create:${appt.appointmentId}`,
          targetGhlUserId: appt.assignedUserId,
          action: {
            kind: 'appointment',
            appointmentId: appt.appointmentId,
            contactId: appt.contactId,
          },
        });
        res.json({ ok: true, action: 'appointment_create_notification' });
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
          dedupeKey: `task:create:${task.taskId}`,
          targetGhlUserId: task.assignedTo,
          action: {
            kind: 'task',
            taskId: task.taskId,
            taskContactId: task.contactId,
            contactId: task.contactId,
          },
        });
        res.json({ ok: true, action: 'task_create_notification' });
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
