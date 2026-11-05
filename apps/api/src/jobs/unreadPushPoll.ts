import cron from 'node-cron';
import { normalizeConversationDate } from '../lib/conversationDates';
import { logger } from '../lib/logger';
import { config } from '../config';
import { PushDedup } from '../models/PushDedup';
import { PushToken } from '../models/PushToken';
import { getLocationGhlClient } from '../services/tokenVault';
import { sendConversationPush } from '../services/pushService';
import { upsertNotification } from '../services/notificationService';
import { conversationNotificationDedupeKey } from '../lib/notificationHelpers';

const RECENT_MS = 20 * 60 * 1000;
const POLL_DEDUP_WINDOW_MS = 12 * 60 * 1000;

function isRecent(isoOrEpoch?: string): boolean {
  if (!isoOrEpoch) return false;
  const at = new Date(isoOrEpoch).getTime();
  if (!Number.isFinite(at)) return false;
  return Date.now() - at <= RECENT_MS;
}

function titleForConversation(input: {
  contactName?: string;
  lastMessageType?: string;
}): { title: string; channel: 'messages' | 'calls' } {
  const from = input.contactName?.trim() || 'a contact';
  const type = (input.lastMessageType ?? '').toUpperCase();
  if (type.includes('VOICEMAIL')) {
    return { title: `Voicemail from ${from}`, channel: 'calls' };
  }
  if (type.includes('CALL')) {
    return { title: `Missed call from ${from}`, channel: 'calls' };
  }
  if (type.includes('EMAIL')) {
    return { title: `Email from ${from}`, channel: 'messages' };
  }
  if (type.includes('SMS')) {
    return { title: `SMS from ${from}`, channel: 'messages' };
  }
  return { title: `Message from ${from}`, channel: 'messages' };
}

async function alreadyNotifiedRecently(conversationId: string): Promise<boolean> {
  const since = new Date(Date.now() - POLL_DEDUP_WINDOW_MS);
  const existing = await PushDedup.findOne({
    conversationId,
    createdAt: { $gte: since },
  })
    .select('_id')
    .lean();
  return Boolean(existing);
}

async function pollLocation(locationId: string): Promise<number> {
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.searchConversations(locationId, {
    limit: 25,
    status: 'unread',
  });

  let sent = 0;
  for (const convo of data.conversations ?? []) {
    if (!convo.id) continue;
    const occurredAt = normalizeConversationDate(convo.lastMessageDate);
    if (!isRecent(occurredAt)) continue;
    if (await alreadyNotifiedRecently(convo.id)) continue;

    const copy = titleForConversation({
      contactName: convo.contactName || convo.fullName,
      lastMessageType: convo.lastMessageType,
    });
    const body =
      convo.lastMessageBody?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) ||
      (copy.channel === 'calls' ? 'Missed call' : 'Unread conversation');

    await upsertNotification({
      locationId,
      type: 'conversations',
      title: copy.title,
      body,
      dedupeKey: conversationNotificationDedupeKey(convo.id),
      targetGhlUserId: convo.assignedTo,
      occurredAt,
      markUnread: true,
      action: {
        kind: 'conversation',
        conversationId: convo.id,
        contactId: convo.contactId,
      },
    });

    const count = await sendConversationPush({
      locationId,
      conversationId: convo.id,
      contactId: convo.contactId,
      messageId: `poll:${convo.id}:${occurredAt ?? body}`,
      assignedTo: convo.assignedTo,
      title: copy.title,
      body,
      channel: copy.channel,
    });
    sent += count;
  }
  return sent;
}

async function runUnreadPushPoll(source: 'startup' | 'cron'): Promise<void> {
  if (!config.push.enabled) {
    logger.info('Unread push poll skipped — push disabled', { source });
    return;
  }

  const locationIds = await PushToken.distinct('locationId');
  if (locationIds.length === 0) {
    logger.info('Unread push poll — no registered devices', { source });
    return;
  }

  let totalSent = 0;
  for (const locationId of locationIds) {
    if (typeof locationId !== 'string' || !locationId.trim()) continue;
    try {
      totalSent += await pollLocation(locationId.trim());
    } catch (err) {
      logger.warn('Unread push poll failed for location', {
        locationId,
        source,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('Unread push poll completed', {
    source,
    locations: locationIds.length,
    sent: totalSent,
  });
}

/**
 * Backup path when marketplace InboundMessage webhooks fail or are delayed.
 * Polls GHL unread conversations for locations that have Oraia push tokens.
 */
export function startUnreadPushPollJob(): void {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runUnreadPushPoll('startup');

  cron.schedule('* * * * *', () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runUnreadPushPoll('cron');
  });
  logger.info('Unread push poll cron scheduled (every minute)');
}
