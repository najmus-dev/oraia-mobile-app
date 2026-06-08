import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { logger } from '../lib/logger';
import { config } from '../config';
import { PushDedup } from '../models/PushDedup';
import { PushToken } from '../models/PushToken';
import { User } from '../models/User';

const expo = new Expo();

export type ConversationPushPayload = {
  locationId: string;
  conversationId: string;
  contactId?: string;
  messageId?: string;
  assignedTo?: string;
  title: string;
  body: string;
};

export async function registerPushToken(input: {
  userId: string;
  locationId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
}): Promise<void> {
  if (!Expo.isExpoPushToken(input.token)) {
    throw new Error('Invalid Expo push token');
  }
  await PushToken.findOneAndUpdate(
    { token: input.token },
    {
      userId: input.userId,
      locationId: input.locationId,
      token: input.token,
      platform: input.platform,
      deviceName: input.deviceName,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  await PushToken.deleteOne({ userId, token });
}

async function resolveTargetUserIds(
  locationId: string,
  assignedTo?: string,
): Promise<string[] | null> {
  const ghlUserId = assignedTo?.trim();
  if (!ghlUserId) return null;

  const users = await User.find({ ghlUserId }).select('_id allowedLocationIds role').lean();
  const ids = users
    .filter(
      (u) =>
        u.role === 'agency_admin' ||
        !u.allowedLocationIds?.length ||
        u.allowedLocationIds.includes(locationId),
    )
    .map((u) => String(u._id));

  return ids.length > 0 ? ids : null;
}

async function removeStaleTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await PushToken.deleteMany({ token: { $in: tokens } });
  logger.info('Removed stale push tokens', { count: tokens.length });
}

function collectStaleTokensFromTickets(
  messages: ExpoPushMessage[],
  tickets: ExpoPushTicket[],
): string[] {
  const stale: string[] = [];
  for (let i = 0; i < tickets.length; i += 1) {
    const ticket = tickets[i];
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      const to = messages[i]?.to;
      if (typeof to === 'string') stale.push(to);
    }
  }
  return stale;
}

export async function sendConversationPush(payload: ConversationPushPayload): Promise<number> {
  if (!config.push.enabled) {
    logger.info('Push disabled — skipping conversation notification', {
      locationId: payload.locationId,
      conversationId: payload.conversationId,
    });
    return 0;
  }

  const messageId = payload.messageId?.trim();
  if (messageId) {
    const existing = await PushDedup.findOne({ messageId }).lean();
    if (existing) {
      logger.info('Push dedup — message already notified', { messageId });
      return 0;
    }
  }

  const targetUserIds = await resolveTargetUserIds(payload.locationId, payload.assignedTo);
  const tokenQuery =
    targetUserIds && targetUserIds.length > 0
      ? { locationId: payload.locationId, userId: { $in: targetUserIds } }
      : { locationId: payload.locationId };

  const tokens = await PushToken.find(tokenQuery).lean();
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t.token));
  if (valid.length === 0) return 0;

  const messages: ExpoPushMessage[] = valid.map((entry) => ({
    to: entry.token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: {
      type: 'conversation',
      locationId: payload.locationId,
      conversationId: payload.conversationId,
      contactId: payload.contactId ?? '',
    },
  }));

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  const staleTokens: string[] = [];

  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    sent += tickets.filter((t) => t.status === 'ok').length;
    staleTokens.push(...collectStaleTokensFromTickets(chunk, tickets));
  }

  await removeStaleTokens(staleTokens);

  if (messageId && sent > 0) {
    await PushDedup.create({
      messageId,
      locationId: payload.locationId,
      conversationId: payload.conversationId,
    }).catch(() => {
      // Race on webhook retry — treat as dedup success.
    });
  }

  logger.info('Push notifications sent', {
    locationId: payload.locationId,
    conversationId: payload.conversationId,
    assignedTo: payload.assignedTo ?? null,
    count: sent,
  });
  return sent;
}
