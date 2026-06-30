import type { UserDocument } from '../models/User';
import { Notification, type NotificationDocument } from '../models/Notification';
import type { CreateNotificationInput, NotificationType } from '../lib/notificationTypes';
import { normalizeConversationDate } from '../lib/conversationDates';
import {
  appointmentNotificationDedupeKey,
  conversationNotificationDedupeKey,
  firstNotificationOccurredAt,
  notificationVisibilityFilter,
  resolveNotificationOccurredAt,
  taskNotificationDedupeKey,
} from '../lib/notificationHelpers';
import { listAllCalendarEvents } from '../lib/ghlAggregates';
import { localDayBounds } from '../lib/dashboardDayBounds';
import type { GhlClient } from './ghl/ghlClient';

export type NotificationDto = {
  id: string;
  locationId: string;
  type: NotificationType;
  status: 'read' | 'unread';
  title: string;
  body: string;
  action: NotificationDocument['action'];
  occurredAt: string;
  createdAt: string;
  readAt?: string;
};

function notificationSortTime(doc: Pick<NotificationDocument, 'occurredAt' | 'createdAt'>): Date {
  return doc.occurredAt ?? doc.createdAt;
}

function toDto(doc: NotificationDocument): NotificationDto {
  const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
  const occurred = notificationSortTime(doc);
  const safeOccurred = Number.isNaN(occurred.getTime()) ? createdAt : occurred;
  return {
    id: String(doc._id),
    locationId: doc.locationId,
    type: doc.type,
    status: doc.status,
    title: doc.title,
    body: doc.body,
    action: doc.action ?? { kind: 'none' },
    occurredAt: safeOccurred.toISOString(),
    createdAt: createdAt.toISOString(),
    readAt: doc.readAt?.toISOString(),
  };
}

function visibilityFilter(user: UserDocument) {
  return notificationVisibilityFilter({
    role: user.role,
    ghlUserId: user.ghlUserId,
  });
}

function buildListQuery(input: {
  user: UserDocument;
  locationId: string;
  type?: NotificationType;
  status?: 'read' | 'unread';
  cursor?: string;
}): Record<string, unknown> {
  const query: Record<string, unknown> = {
    locationId: input.locationId,
  };
  if (input.type) query.type = input.type;
  if (input.status) query.status = input.status;

  const visibility = visibilityFilter(input.user);
  const andClauses: Record<string, unknown>[] = [];
  if (Object.keys(visibility).length > 0) {
    andClauses.push(visibility);
  }

  if (input.cursor) {
    const cursorDate = new Date(input.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      andClauses.push({
        $or: [
          { occurredAt: { $lt: cursorDate } },
          { occurredAt: { $exists: false }, createdAt: { $lt: cursorDate } },
        ],
      });
    }
  }

  if (andClauses.length === 1) {
    Object.assign(query, andClauses[0]);
  } else if (andClauses.length > 1) {
    query.$and = andClauses;
  }

  return query;
}

export async function upsertNotification(input: CreateNotificationInput): Promise<NotificationDto | null> {
  const occurredAt = resolveNotificationOccurredAt(input.occurredAt);
  const update: Record<string, unknown> = {
    $set: {
      locationId: input.locationId,
      type: input.type,
      title: input.title,
      body: input.body,
      targetGhlUserId: input.targetGhlUserId?.trim() || undefined,
      action: input.action ?? { kind: 'none' },
      occurredAt,
    },
    $setOnInsert: {
      dedupeKey: input.dedupeKey,
      status: 'unread',
    },
  };

  if (input.markUnread) {
    (update.$set as Record<string, unknown>).status = 'unread';
    update.$unset = { readAt: '' };
  }

  const doc = await Notification.findOneAndUpdate({ dedupeKey: input.dedupeKey }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  return doc ? toDto(doc) : null;
}

export async function listNotifications(input: {
  user: UserDocument;
  locationId: string;
  type?: NotificationType;
  status?: 'read' | 'unread';
  limit?: number;
  cursor?: string;
}): Promise<{ notifications: NotificationDto[]; nextCursor?: string; unreadCount: number }> {
  const limit = Math.min(input.limit ?? 30, 100);
  const query = buildListQuery(input);

  const [rows, unreadCount] = await Promise.all([
    Notification.find(query).sort({ occurredAt: -1, createdAt: -1 }).limit(limit + 1),
    Notification.countDocuments({
      locationId: input.locationId,
      status: 'unread',
      ...visibilityFilter(input.user),
    }),
  ]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const notifications = page.map((row) => toDto(row));
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? notificationSortTime(last).toISOString() : undefined;

  return { notifications, nextCursor, unreadCount };
}

export async function countUnreadNotifications(
  user: UserDocument,
  locationId: string,
): Promise<number> {
  return Notification.countDocuments({
    locationId,
    status: 'unread',
    ...visibilityFilter(user),
  });
}

export async function markNotificationRead(
  user: UserDocument,
  locationId: string,
  notificationId: string,
): Promise<NotificationDto | null> {
  const doc = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      locationId,
      ...visibilityFilter(user),
    },
    { $set: { status: 'read', readAt: new Date() } },
    { new: true },
  );
  return doc ? toDto(doc) : null;
}

export async function markAllNotificationsRead(
  user: UserDocument,
  locationId: string,
): Promise<number> {
  const result = await Notification.updateMany(
    {
      locationId,
      status: 'unread',
      ...visibilityFilter(user),
    },
    { $set: { status: 'read', readAt: new Date() } },
  );
  return result.modifiedCount ?? 0;
}

/** Remove legacy per-message rows now covered by conversation-level notifications. */
async function cleanupLegacyMessageNotifications(locationId: string): Promise<void> {
  await Notification.deleteMany({
    locationId,
    type: 'conversations',
    dedupeKey: { $regex: /^message:/ },
  });
}

/** Backfill occurredAt for older rows created before the field existed. */
async function backfillMissingOccurredAt(locationId: string): Promise<void> {
  const rows = await Notification.find({
    locationId,
    occurredAt: { $exists: false },
  }).select('_id createdAt');

  if (!rows.length) return;

  await Notification.bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: { _id: row._id },
        update: { $set: { occurredAt: row.createdAt } },
      },
    })),
  );
}

/** Backfill from GHL CRM when webhooks were not configured or for historical unread items. */
export async function syncNotificationsFromGhl(input: {
  ghl: GhlClient;
  user: UserDocument;
  locationId: string;
  tzOffset: number;
}): Promise<number> {
  const { ghl, user, locationId, tzOffset } = input;
  let upserted = 0;
  const assignedTo =
    user.role === 'agency_admin' ? undefined : user.ghlUserId?.trim() || undefined;

  await backfillMissingOccurredAt(locationId);

  const convoParams: Parameters<GhlClient['searchConversations']>[1] = {
    limit: 40,
    status: 'unread',
  };
  if (assignedTo) convoParams.assignedTo = assignedTo;

  const [conversations, tasks, { start, end }] = await Promise.all([
    ghl.searchConversations(locationId, convoParams),
    ghl.searchLocationTasks(locationId, {
      completed: false,
      limit: 40,
      ...(assignedTo ? { assignedTo: [assignedTo] } : {}),
    }),
    Promise.resolve(localDayBounds(tzOffset)),
  ]);

  for (const c of conversations.conversations ?? []) {
    if (!c.id) continue;
    const preview = c.lastMessageBody?.trim() || 'Unread conversation';
    const title = c.contactName?.trim() ? `Message from ${c.contactName.trim()}` : 'Unread message';
    const result = await upsertNotification({
      locationId,
      type: 'conversations',
      title,
      body: preview.slice(0, 200),
      dedupeKey: conversationNotificationDedupeKey(c.id),
      targetGhlUserId: c.assignedTo?.trim() || assignedTo,
      occurredAt: normalizeConversationDate(c.lastMessageDate),
      action: {
        kind: 'conversation',
        conversationId: c.id,
        contactId: c.contactId,
      },
    });
    if (result) upserted += 1;
  }

  for (const t of tasks.tasks ?? []) {
    if (!t.id || !t.contactId) continue;
    if (assignedTo && t.assignedTo && t.assignedTo !== assignedTo) continue;
    const title = t.title?.trim() || 'New task';
    const body = (t.body ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Task pending';
    const result = await upsertNotification({
      locationId,
      type: 'tasks',
      title,
      body: body.slice(0, 200),
      dedupeKey: taskNotificationDedupeKey(t.id),
      targetGhlUserId: t.assignedTo?.trim() || undefined,
      occurredAt: firstNotificationOccurredAt(t.dueDate, t.dateAdded),
      action: {
        kind: 'task',
        taskId: t.id,
        taskContactId: t.contactId,
        contactId: t.contactId,
      },
    });
    if (result) upserted += 1;
  }

  const events = await listAllCalendarEvents(ghl, locationId, {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  });

  for (const e of events) {
    if (!e.id) continue;
    const title = e.title?.trim() || 'Appointment today';
    const startLabel = e.startTime ? new Date(e.startTime).toLocaleTimeString() : '';
    const result = await upsertNotification({
      locationId,
      type: 'appointments',
      title,
      body: startLabel ? `Starts at ${startLabel}` : 'Scheduled for today',
      dedupeKey: appointmentNotificationDedupeKey(e.id),
      occurredAt: firstNotificationOccurredAt(e.startTime),
      action: {
        kind: 'appointment',
        appointmentId: e.id,
        contactId: e.contactId,
      },
    });
    if (result) upserted += 1;
  }

  await cleanupLegacyMessageNotifications(locationId);

  return upserted;
}
