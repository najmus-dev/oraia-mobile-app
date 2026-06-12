import type { NotificationType } from './notifications';

export type NotificationAction = {
  kind: 'conversation' | 'appointment' | 'task' | 'contact' | 'opportunity' | 'none';
  conversationId?: string;
  contactId?: string;
  appointmentId?: string;
  taskId?: string;
  taskContactId?: string;
  opportunityId?: string;
};

export type NotificationItem = {
  id: string;
  locationId: string;
  type: NotificationType;
  status: 'read' | 'unread';
  title: string;
  body: string;
  action: NotificationAction;
  /** CRM event time — prefer over createdAt for display and sorting. */
  occurredAt?: string;
  createdAt: string;
  readAt?: string;
};

export type NotificationsResponse = {
  locationId: string;
  notifications: NotificationItem[];
  nextCursor?: string;
  unreadCount: number;
};
