import cron from 'node-cron';
import { normalizeConversationDate } from '../lib/conversationDates';
import { ghlStyleNotificationCopy } from '../lib/inboundNotificationCopy';
import { logger } from '../lib/logger';
import { config } from '../config';
import { conversationEventDedupeKey } from '../lib/notificationHelpers';
import { LocationToken } from '../models/LocationToken';
import { PushDedup } from '../models/PushDedup';
import { PushToken } from '../models/PushToken';
import { User } from '../models/User';
import { getLocationGhlClient } from '../services/tokenVault';
import { sendConversationPush } from '../services/pushService';
import { upsertNotification } from '../services/notificationService';
import type { GhlConversation } from '../services/ghl/types';

const RECENT_MS = 30 * 60 * 1000;
const POLL_DEDUP_WINDOW_MS = 12 * 60 * 1000;
const MIN_POLL_GAP_MS = 40_000;

let lastPollAt = 0;
let pollInFlight: Promise<void> | null = null;

function isRecent(isoOrEpoch?: string): boolean {
  // Missing dates still notify — GHL sometimes omits lastMessageDate on call rows.
  if (!isoOrEpoch) return true;
  const at = new Date(isoOrEpoch).getTime();
  if (!Number.isFinite(at)) return true;
  return Date.now() - at <= RECENT_MS;
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

async function notifyConversation(locationId: string, convo: GhlConversation): Promise<number> {
  if (!convo.id) return 0;
  const occurredAt = normalizeConversationDate(convo.lastMessageDate);
  if (!isRecent(occurredAt)) return 0;
  if (await alreadyNotifiedRecently(convo.id)) return 0;

  const copy = ghlStyleNotificationCopy({
    contactName: convo.contactName || convo.fullName,
    lastMessageType: convo.lastMessageType,
    lastMessageBody: convo.lastMessageBody,
    phone: convo.phone,
  });
  const stamp = occurredAt || copy.body.slice(0, 40) || convo.lastMessageType || 'event';

  await upsertNotification({
    locationId,
    type: 'conversations',
    title: copy.title,
    body: copy.body,
    dedupeKey: conversationEventDedupeKey(convo.id, stamp),
    targetGhlUserId: convo.assignedTo,
    occurredAt,
    markUnread: true,
    action: {
      kind: 'conversation',
      conversationId: convo.id,
      contactId: convo.contactId,
    },
  });

  return sendConversationPush({
    locationId,
    conversationId: convo.id,
    contactId: convo.contactId,
    messageId: `poll:${convo.id}:${stamp}`,
    assignedTo: convo.assignedTo,
    title: copy.title,
    body: copy.body,
    channel: copy.channel,
  });
}

async function pollLocation(locationId: string): Promise<number> {
  const ghl = getLocationGhlClient(locationId);

  // Inbound messages + inbound calls (after a missed call the last row is often outbound SMS).
  const [inbound, inboundCalls] = await Promise.all([
    ghl.searchConversations(locationId, {
      limit: 25,
      status: 'unread',
      lastMessageDirection: 'inbound',
      sort: 'desc',
      sortBy: 'last_message_date',
    }),
    ghl.searchConversations(locationId, {
      limit: 15,
      status: 'unread',
      lastMessageType: 'TYPE_CALL',
      lastMessageDirection: 'inbound',
      sort: 'desc',
      sortBy: 'last_message_date',
    }),
  ]);

  const byId = new Map<string, GhlConversation>();
  for (const convo of [...(inboundCalls.conversations ?? []), ...(inbound.conversations ?? [])]) {
    if (convo.id) byId.set(convo.id, convo);
  }

  let sent = 0;
  for (const convo of byId.values()) {
    sent += await notifyConversation(locationId, convo);
  }
  return sent;
}

export async function runUnreadPushPoll(source: string): Promise<number> {
  if (!config.push.enabled) {
    logger.info('Unread push poll skipped — push disabled', { source });
    return 0;
  }

  const locationIds = await resolvePollLocationIds();
  if (locationIds.length === 0) {
    logger.info('Unread push poll — no registered devices', { source });
    return 0;
  }

  let totalSent = 0;
  for (const locationId of locationIds) {
    try {
      totalSent += await pollLocation(locationId);
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
  return totalSent;
}

/** Last-registered location plus every location those device users can access. */
async function resolvePollLocationIds(): Promise<string[]> {
  const tokens = await PushToken.find({}).select('userId locationId').lean();
  if (tokens.length === 0) return [];

  const ids = new Set<string>();
  for (const token of tokens) {
    if (token.locationId?.trim()) ids.add(token.locationId.trim());
  }

  const userIds = [...new Set(tokens.map((token) => token.userId).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('role allowedLocationIds')
    .lean();

  let hasAdminDevice = false;
  for (const user of users) {
    if (user.role === 'agency_admin') {
      hasAdminDevice = true;
      continue;
    }
    for (const locationId of user.allowedLocationIds ?? []) {
      if (typeof locationId === 'string' && locationId.trim()) ids.add(locationId.trim());
    }
  }

  if (hasAdminDevice) {
    const provisioned = await LocationToken.distinct('locationId');
    for (const locationId of provisioned) {
      if (typeof locationId === 'string' && locationId.trim()) ids.add(locationId.trim());
    }
  }

  return [...ids];
}

/**
 * Throttled entry point so /health, sync, and token register can wake the poller
 * on Render (which sleeps when idle — cron alone is not enough).
 */
export function requestUnreadPushPoll(source: string): void {
  const now = Date.now();
  if (now - lastPollAt < MIN_POLL_GAP_MS) return;
  if (pollInFlight) return;
  lastPollAt = now;
  pollInFlight = runUnreadPushPoll(source)
    .catch((err) => {
      logger.warn('Unread push poll request failed', {
        source,
        message: err instanceof Error ? err.message : String(err),
      });
    })
    .finally(() => {
      pollInFlight = null;
    });
}

/**
 * Backup path when marketplace InboundMessage webhooks fail or are delayed.
 * Polls GHL unread conversations for locations that have Oraia push tokens.
 */
export function startUnreadPushPollJob(): void {
  requestUnreadPushPoll('startup');

  cron.schedule('* * * * *', () => {
    requestUnreadPushPoll('cron');
  });
  logger.info('Unread push poll cron scheduled (every minute)');
}
