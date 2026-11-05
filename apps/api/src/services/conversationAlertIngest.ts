import { normalizeConversationDate } from '../lib/conversationDates';
import { ghlStyleNotificationCopy } from '../lib/inboundNotificationCopy';
import { conversationEventDedupeKey } from '../lib/notificationHelpers';
import { logger } from '../lib/logger';
import { Notification } from '../models/Notification';
import { sendConversationPush } from './pushService';
import { upsertNotification } from './notificationService';
import type { GhlConversation } from './ghl/types';

/** How far back poll/sync will create feed rows + attempt push. */
export const CONVERSATION_ALERT_RECENT_MS = 2 * 60 * 60 * 1000;

export function isRecentConversationActivity(
  isoOrEpoch: string | undefined,
  nowMs = Date.now(),
  windowMs = CONVERSATION_ALERT_RECENT_MS,
): boolean {
  // Missing dates still notify — GHL sometimes omits lastMessageDate on call rows.
  if (!isoOrEpoch) return true;
  const at = new Date(isoOrEpoch).getTime();
  if (!Number.isFinite(at)) return true;
  return nowMs - at <= windowMs;
}

/** Skip clear outbound auto-replies; keep calls/voicemail and unknown direction. */
export function shouldIngestConversation(convo: GhlConversation): boolean {
  if (!convo.id) return false;
  const direction = (convo.lastMessageDirection ?? '').toLowerCase();
  const type = (convo.lastMessageType ?? '').toUpperCase();
  const isCall = type.includes('CALL') || type.includes('VOICEMAIL');
  if (direction === 'outbound' && !isCall) return false;
  return true;
}

export type IngestConversationAlertResult = {
  upserted: boolean;
  created: boolean;
  pushed: number;
};

/**
 * Durable notification row + optional Expo push for one GHL conversation.
 * Used by webhooks, unread poll, and notification sync so the drawer never depends
 * on push tokens alone.
 */
export async function ingestConversationAlert(input: {
  locationId: string;
  convo: GhlConversation;
  source: string;
  /** When false, still upsert the feed row but skip Expo delivery. */
  sendPush?: boolean;
}): Promise<IngestConversationAlertResult> {
  const { locationId, convo, source } = input;
  const sendPush = input.sendPush !== false;
  if (!shouldIngestConversation(convo) || !convo.id) {
    return { upserted: false, created: false, pushed: 0 };
  }

  const occurredAt = normalizeConversationDate(convo.lastMessageDate);
  if (!isRecentConversationActivity(occurredAt)) {
    return { upserted: false, created: false, pushed: 0 };
  }

  const copy = ghlStyleNotificationCopy({
    contactName: convo.contactName || convo.fullName,
    lastMessageType: convo.lastMessageType,
    lastMessageBody: convo.lastMessageBody,
    phone: convo.phone,
  });
  const stamp = occurredAt || copy.body.slice(0, 40) || convo.lastMessageType || 'event';
  const dedupeKey = conversationEventDedupeKey(convo.id, stamp);
  const existed = await Notification.findOne({ dedupeKey }).select('_id').lean();

  // Untargeted like HighLevel location feed — every location user can see the row.
  const result = await upsertNotification({
    locationId,
    type: 'conversations',
    title: copy.title,
    body: copy.body.slice(0, 200),
    dedupeKey,
    occurredAt,
    markUnread: true,
    action: {
      kind: 'conversation',
      conversationId: convo.id,
      contactId: convo.contactId,
    },
  });

  let pushed = 0;
  if (sendPush && result && !existed) {
    pushed = await sendConversationPush({
      locationId,
      conversationId: convo.id,
      contactId: convo.contactId,
      messageId: `${source}:${convo.id}:${stamp}`,
      assignedTo: convo.assignedTo,
      title: copy.title,
      body: copy.body,
      channel: copy.channel,
    }).catch((err) => {
      logger.warn('Conversation alert push failed after feed upsert', {
        source,
        conversationId: convo.id,
        message: err instanceof Error ? err.message : String(err),
      });
      return 0;
    });
  }

  return {
    upserted: Boolean(result),
    created: Boolean(result && !existed),
    pushed,
  };
}

export function mergeConversations(
  ...groups: Array<GhlConversation[] | undefined>
): GhlConversation[] {
  const byId = new Map<string, GhlConversation>();
  for (const group of groups) {
    for (const convo of group ?? []) {
      if (!convo.id) continue;
      if (!shouldIngestConversation(convo)) continue;
      const prev = byId.get(convo.id);
      if (!prev) {
        byId.set(convo.id, convo);
        continue;
      }
      // Prefer the row with the newer last message when duplicates appear.
      const prevAt = new Date(normalizeConversationDate(prev.lastMessageDate) ?? 0).getTime();
      const nextAt = new Date(normalizeConversationDate(convo.lastMessageDate) ?? 0).getTime();
      if (!Number.isFinite(prevAt) || nextAt >= prevAt) byId.set(convo.id, convo);
    }
  }
  return [...byId.values()];
}
