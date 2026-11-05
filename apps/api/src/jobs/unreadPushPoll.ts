import cron from 'node-cron';
import { logger } from '../lib/logger';
import { config } from '../config';
import {
  createPushPollGateState,
  decidePushPollStart,
  finishPushPoll,
} from '../lib/pushPollGate';
import { LocationToken } from '../models/LocationToken';
import { PushToken } from '../models/PushToken';
import { User } from '../models/User';
import { getLocationGhlClient } from '../services/tokenVault';
import {
  ingestConversationAlert,
  mergeConversations,
} from '../services/conversationAlertIngest';
import type { GhlConversation } from '../services/ghl/types';

const MIN_POLL_GAP_MS = 20_000;

const gate = createPushPollGateState();
let pollInFlight: Promise<void> | null = null;

async function collectRecentConversations(locationId: string): Promise<GhlConversation[]> {
  const ghl = getLocationGhlClient(locationId);

  // Unread + recent-all: Conversations tab shows all recent rows; GHL often clears
  // unread before our sync runs (or omits status), so unread-only misses live SMS.
  const [unread, calls, recent] = await Promise.all([
    ghl.searchConversations(locationId, {
      limit: 40,
      status: 'unread',
      sort: 'desc',
      sortBy: 'last_message_date',
    }),
    ghl.searchConversations(locationId, {
      limit: 20,
      status: 'unread',
      lastMessageType: 'TYPE_CALL',
      sort: 'desc',
      sortBy: 'last_message_date',
    }),
    ghl.searchConversations(locationId, {
      limit: 40,
      sort: 'desc',
      sortBy: 'last_message_date',
    }),
  ]);

  return mergeConversations(calls.conversations, unread.conversations, recent.conversations);
}

async function pollLocation(locationId: string): Promise<{ created: number; pushed: number }> {
  const conversations = await collectRecentConversations(locationId);
  let created = 0;
  let pushed = 0;
  for (const convo of conversations) {
    const result = await ingestConversationAlert({
      locationId,
      convo,
      source: 'poll',
      sendPush: config.push.enabled,
    });
    if (result.created) created += 1;
    pushed += result.pushed;
  }
  return { created, pushed };
}

/** Prefer locations with devices, but always include every provisioned location token. */
async function resolvePollLocationIds(): Promise<string[]> {
  const ids = new Set<string>();

  const provisioned = await LocationToken.distinct('locationId');
  for (const locationId of provisioned) {
    if (typeof locationId === 'string' && locationId.trim()) ids.add(locationId.trim());
  }

  const tokens = await PushToken.find({}).select('userId locationId').lean();
  for (const token of tokens) {
    if (token.locationId?.trim()) ids.add(token.locationId.trim());
  }

  const userIds = [...new Set(tokens.map((token) => token.userId).filter(Boolean))];
  if (userIds.length > 0) {
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
      for (const locationId of provisioned) {
        if (typeof locationId === 'string' && locationId.trim()) ids.add(locationId.trim());
      }
    }
  }

  return [...ids];
}

export async function runUnreadPushPoll(source: string): Promise<number> {
  const locationIds = await resolvePollLocationIds();
  if (locationIds.length === 0) {
    logger.info('Unread push poll — no provisioned locations', { source });
    return 0;
  }

  let totalCreated = 0;
  let totalPushed = 0;
  for (const locationId of locationIds) {
    try {
      const result = await pollLocation(locationId);
      totalCreated += result.created;
      totalPushed += result.pushed;
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
    created: totalCreated,
    sent: totalPushed,
    pushEnabled: config.push.enabled,
  });
  return totalPushed;
}

function startPoll(source: string): void {
  pollInFlight = runUnreadPushPoll(source)
    .then(() => undefined)
    .catch((err) => {
      logger.warn('Unread push poll request failed', {
        source,
        message: err instanceof Error ? err.message : String(err),
      });
    })
    .finally(() => {
      pollInFlight = null;
      const next = finishPushPoll(gate);
      if (next.action === 'start') {
        startPoll(next.source);
      }
    });
}

/**
 * Throttled entry — queues follow-ups so /health, sync, and webhooks never drop a wake.
 */
export function requestUnreadPushPoll(source: string): void {
  const decision = decidePushPollStart(gate, source, Date.now(), MIN_POLL_GAP_MS);
  if (decision.action === 'skip') return;
  if (decision.action === 'queue') {
    logger.info('Unread push poll queued', { source: decision.source });
    return;
  }
  startPoll(decision.source);
}

/**
 * Backup path when marketplace InboundMessage webhooks fail or are delayed.
 * Creates Notifications drawer rows from GHL recent/unread conversations, then pushes.
 */
export function startUnreadPushPollJob(): void {
  requestUnreadPushPoll('startup');

  cron.schedule('* * * * *', () => {
    requestUnreadPushPoll('cron');
  });
  logger.info('Unread push poll cron scheduled (every minute)');
}
