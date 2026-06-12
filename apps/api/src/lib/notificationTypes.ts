export const NOTIFICATION_TYPES = [
  'conversations',
  'appointments',
  'tasks',
  'reputation',
  'social_planner',
  'custom',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationActionKind =
  | 'conversation'
  | 'appointment'
  | 'task'
  | 'contact'
  | 'opportunity'
  | 'none';

export type NotificationAction = {
  kind: NotificationActionKind;
  conversationId?: string;
  contactId?: string;
  appointmentId?: string;
  taskId?: string;
  taskContactId?: string;
  opportunityId?: string;
};

export type CreateNotificationInput = {
  locationId: string;
  type: NotificationType;
  title: string;
  body: string;
  dedupeKey: string;
  targetGhlUserId?: string;
  action?: NotificationAction;
  /** When the underlying CRM event happened (message time, due date, etc.). */
  occurredAt?: string | Date;
  /** Re-open as unread when the same dedupe key gets new activity (e.g. inbound message). */
  markUnread?: boolean;
};

export function parseNotificationType(value: unknown): NotificationType | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim().toLowerCase();
  return NOTIFICATION_TYPES.find((t) => t === raw);
}

export function parseNotificationStatus(value: unknown): 'read' | 'unread' | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim().toLowerCase();
  if (raw === 'read' || raw === 'unread') return raw;
  return undefined;
}
