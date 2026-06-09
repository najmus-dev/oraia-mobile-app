export type NotificationType =
  | 'all'
  | 'conversations'
  | 'appointments'
  | 'tasks'
  | 'reputation'
  | 'social_planner'
  | 'custom';

export type NotificationStatus = 'all' | 'unread' | 'read';

export const NOTIFICATION_TYPE_OPTIONS: { key: NotificationType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'reputation', label: 'Reputation' },
  { key: 'social_planner', label: 'Social Planner' },
  { key: 'custom', label: 'Custom' },
];

export const NOTIFICATION_STATUS_OPTIONS: { key: NotificationStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_OPTIONS.find((o) => o.key === type)?.label ?? 'All';
}

export function notificationStatusLabel(status: NotificationStatus): string {
  return NOTIFICATION_STATUS_OPTIONS.find((o) => o.key === status)?.label ?? 'All';
}
