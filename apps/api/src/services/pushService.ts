import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { logger } from '../lib/logger';
import { config } from '../config';
import { AppError } from '../lib/errors';
import { selectPushRecipientIds } from '../lib/pushRecipients';
import { PushDedup } from '../models/PushDedup';
import { PushToken } from '../models/PushToken';
import { User } from '../models/User';

const expo = new Expo();

export type PushChannel = 'messages' | 'calls' | 'tasks' | 'appointments';

export type NotificationPushPayload = {
  locationId: string;
  channel: PushChannel;
  title: string;
  body: string;
  assignedTo?: string;
  /** Unique id for dedup (message id, task id, appointment id). */
  dedupeId?: string;
  data: Record<string, string>;
};

export type ConversationPushPayload = {
  locationId: string;
  conversationId: string;
  contactId?: string;
  messageId?: string;
  assignedTo?: string;
  title: string;
  body: string;
  channel?: PushChannel;
};

const CHANNEL_BY_KIND: Record<string, PushChannel> = {
  conversation: 'messages',
  call: 'calls',
  task: 'tasks',
  appointment: 'appointments',
};

export function buildExpoPushMessages(
  tokens: { token: string }[],
  payload: NotificationPushPayload,
): ExpoPushMessage[] {
  return tokens.map((entry) => ({
    to: entry.token,
    sound: 'default' as const,
    title: payload.title,
    body: payload.body,
    priority: 'high' as const,
    channelId: payload.channel,
    data: {
      type: payload.data.type ?? 'conversation',
      locationId: payload.locationId,
      ...payload.data,
    },
  }));
}

export async function registerPushToken(input: {
  userId: string;
  locationId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
}): Promise<void> {
  if (!Expo.isExpoPushToken(input.token)) {
    throw new AppError(400, 'Invalid Expo push token', 'VALIDATION_ERROR');
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
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
}

export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  await PushToken.deleteOne({ userId, token });
}

async function resolveTargetUserIds(
  locationId: string,
  assignedTo?: string,
): Promise<string[]> {
  const users = await User.find({
    status: { $ne: 'rejected' },
    $or: [{ role: 'agency_admin' }, { allowedLocationIds: locationId }],
  })
    .select('_id role status allowedLocationIds ghlUserId')
    .lean();

  return selectPushRecipientIds(users, locationId, assignedTo);
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

async function deliverPush(
  tokens: { token: string }[],
  payload: NotificationPushPayload,
): Promise<number> {
  const valid = tokens.filter((entry) => Expo.isExpoPushToken(entry.token));
  if (valid.length === 0) return 0;

  const messages = buildExpoPushMessages(valid, payload);
  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  const staleTokens: string[] = [];

  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    sent += tickets.filter((ticket) => ticket.status === 'ok').length;
    staleTokens.push(...collectStaleTokensFromTickets(chunk, tickets));
  }

  await removeStaleTokens(staleTokens);
  return sent;
}

export async function sendNotificationPush(payload: NotificationPushPayload): Promise<number> {
  if (!config.push.enabled) {
    logger.info('Push disabled — skipping notification', {
      locationId: payload.locationId,
      type: payload.data.type,
    });
    return 0;
  }

  const dedupeId = payload.dedupeId?.trim();
  if (dedupeId) {
    const existing = await PushDedup.findOne({ messageId: dedupeId }).lean();
    if (existing) {
      logger.info('Push dedup — already notified', { dedupeId });
      return 0;
    }
  }

  const targetUserIds = await resolveTargetUserIds(payload.locationId, payload.assignedTo);
  if (targetUserIds.length === 0) {
    logger.info('No ORAIA users to notify', {
      locationId: payload.locationId,
      type: payload.data.type,
      assignedTo: payload.assignedTo ?? null,
    });
    return 0;
  }

  const tokens = await PushToken.find({ userId: { $in: targetUserIds } }).lean();
  const sent = await deliverPush(tokens, payload);
  if (sent === 0) {
    logger.info('No push tokens for notification', {
      locationId: payload.locationId,
      type: payload.data.type,
      assignedTo: payload.assignedTo ?? null,
      users: targetUserIds.length,
    });
    return 0;
  }

  if (dedupeId) {
    await PushDedup.create({
      messageId: dedupeId,
      locationId: payload.locationId,
      conversationId: payload.data.conversationId ?? payload.dedupeId,
    }).catch(() => {
      // Race on webhook retry — treat as dedup success.
    });
  }

  logger.info('Push notifications sent', {
    locationId: payload.locationId,
    type: payload.data.type,
    channel: payload.channel,
    assignedTo: payload.assignedTo ?? null,
    count: sent,
  });
  return sent;
}

export async function sendConversationPush(payload: ConversationPushPayload): Promise<number> {
  return sendNotificationPush({
    locationId: payload.locationId,
    channel: payload.channel ?? CHANNEL_BY_KIND.conversation,
    title: payload.title,
    body: payload.body,
    assignedTo: payload.assignedTo,
    dedupeId:
      payload.messageId?.trim() ||
      `conversation:${payload.conversationId}:${payload.title}:${payload.body}`.slice(0, 180),
    data: {
      type: 'conversation',
      conversationId: payload.conversationId,
      contactId: payload.contactId ?? '',
    },
  });
}

export async function sendTestPushToUser(input: {
  userId: string;
  locationId: string;
}): Promise<number> {
  if (!config.push.enabled) {
    throw new AppError(503, 'Push notifications are disabled on the API', 'PUSH_DISABLED');
  }

  const tokens = await PushToken.find({ userId: input.userId }).lean();
  const payload: NotificationPushPayload = {
    locationId: input.locationId,
    channel: 'messages',
    title: 'Oraia test notification',
    body: 'SMS and call alerts are working on this device.',
    data: {
      type: 'test',
      locationId: input.locationId,
    },
  };
  const sent = await deliverPush(tokens, payload);
  if (sent === 0) {
    throw new AppError(
      400,
      'No push token on this account. Open Oraia on a physical phone and allow notifications.',
      'PUSH_TOKEN_MISSING',
    );
  }
  return sent;
}

export async function sendTaskPush(input: {
  locationId: string;
  taskId: string;
  contactId?: string;
  assignedTo?: string;
  title: string;
  body: string;
}): Promise<number> {
  return sendNotificationPush({
    locationId: input.locationId,
    channel: CHANNEL_BY_KIND.task,
    title: input.title,
    body: input.body,
    assignedTo: input.assignedTo,
    dedupeId: `task:${input.taskId}`,
    data: {
      type: 'task',
      taskId: input.taskId,
      contactId: input.contactId ?? '',
    },
  });
}

export async function sendAppointmentPush(input: {
  locationId: string;
  appointmentId: string;
  contactId?: string;
  assignedTo?: string;
  title: string;
  body: string;
}): Promise<number> {
  return sendNotificationPush({
    locationId: input.locationId,
    channel: CHANNEL_BY_KIND.appointment,
    title: input.title,
    body: input.body,
    assignedTo: input.assignedTo,
    dedupeId: `appointment:${input.appointmentId}`,
    data: {
      type: 'appointment',
      appointmentId: input.appointmentId,
      contactId: input.contactId ?? '',
    },
  });
}
