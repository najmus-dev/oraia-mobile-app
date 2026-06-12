import { api, type ApiAuth, withAuthHeaders } from './api';
import { buildNotificationsQuery } from './notificationFeedUtils';
import type { NotificationStatus, NotificationType } from './notifications';

export type { NotificationAction, NotificationItem, NotificationsResponse } from './notificationFeedTypes';
export {
  buildNotificationsQuery,
  dedupeNotificationItems,
  formatNotificationTime,
  notificationActivityTime,
  notificationTypeIcon,
} from './notificationFeedUtils';

import type { NotificationItem, NotificationsResponse } from './notificationFeedTypes';

export async function fetchNotifications(
  auth: ApiAuth,
  query?: Parameters<typeof buildNotificationsQuery>[0],
): Promise<NotificationsResponse> {
  const qs = buildNotificationsQuery({ sync: true, limit: 30, ...query });
  return api.getJson<NotificationsResponse>(`/api/notifications${qs}`, {
    headers: withAuthHeaders(auth),
  });
}

export async function fetchNotificationUnreadCount(auth: ApiAuth): Promise<number> {
  const res = await api.getJson<{ unreadCount: number }>('/api/notifications/unread-count', {
    headers: withAuthHeaders(auth),
  });
  return res.unreadCount ?? 0;
}

export async function markNotificationRead(auth: ApiAuth, notificationId: string): Promise<void> {
  await api.putJson(`/api/notifications/${encodeURIComponent(notificationId)}/read`, undefined, {
    headers: withAuthHeaders(auth),
  });
}

export async function markAllNotificationsRead(auth: ApiAuth): Promise<number> {
  const res = await api.putJson<{ updated: number }>('/api/notifications/read-all', undefined, {
    headers: withAuthHeaders(auth),
  });
  return res.updated ?? 0;
}

export type { NotificationStatus, NotificationType };
