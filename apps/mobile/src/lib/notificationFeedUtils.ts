import type { NotificationStatus, NotificationType } from './notifications';

export function buildNotificationsQuery(input: {
  type?: NotificationType;
  status?: NotificationStatus;
  cursor?: string;
  sync?: boolean;
  limit?: number;
  tzOffset?: number;
}): string {
  const parts: string[] = [];
  if (input.type && input.type !== 'all') parts.push(`type=${encodeURIComponent(input.type)}`);
  if (input.status && input.status !== 'all') parts.push(`status=${encodeURIComponent(input.status)}`);
  if (input.cursor) parts.push(`cursor=${encodeURIComponent(input.cursor)}`);
  if (input.sync) parts.push('sync=1');
  const tz = input.tzOffset ?? -new Date().getTimezoneOffset();
  parts.push(`tzOffset=${tz}`);
  if (input.limit) parts.push(`limit=${input.limit}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function notificationTypeIcon(
  type: NotificationType,
): 'chatbubble-outline' | 'calendar-outline' | 'checkbox-outline' | 'star-outline' | 'share-social-outline' | 'notifications-outline' {
  switch (type) {
    case 'conversations':
      return 'chatbubble-outline';
    case 'appointments':
      return 'calendar-outline';
    case 'tasks':
      return 'checkbox-outline';
    case 'reputation':
      return 'star-outline';
    case 'social_planner':
      return 'share-social-outline';
    default:
      return 'notifications-outline';
  }
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
