import { Router } from 'express';
import { AppError } from '../lib/errors';
import { parseNotificationStatus, parseNotificationType } from '../lib/notificationTypes';
import { parseTzOffsetQuery } from '../lib/dashboardDayBounds';
import { locationGet, locationPut } from '../middleware/locationRoute';
import type { LocationScopedRequest } from '../middleware/location';
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotificationsFromGhl,
} from '../services/notificationService';
import { getLocationGhlClient } from '../services/tokenVault';
import { param } from '../lib/params';

export const notificationsRouter = Router();

const syncThrottleMs = 60_000;
const lastSyncByKey = new Map<string, number>();

locationGet(notificationsRouter, '/', async (req, res) => {
  const locationId = req.locationId!;
  const user = req.user!;
  const type = parseNotificationType(req.query.type);
  const status = parseNotificationStatus(req.query.status);
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : undefined;
  const shouldSync = req.query.sync === '1' || req.query.sync === 'true';

  if (shouldSync) {
    const key = `${user._id.toString()}:${locationId}`;
    const last = lastSyncByKey.get(key) ?? 0;
    if (Date.now() - last >= syncThrottleMs) {
      const ghl = getLocationGhlClient(locationId);
      const tzOffset = parseTzOffsetQuery(req.query.tzOffset);
      await syncNotificationsFromGhl({ ghl, user, locationId, tzOffset });
      lastSyncByKey.set(key, Date.now());
    }
  }

  const result = await listNotifications({
    user,
    locationId,
    type,
    status,
    limit,
    cursor,
  });

  res.json({
    locationId,
    notifications: result.notifications,
    nextCursor: result.nextCursor,
    unreadCount: result.unreadCount,
  });
});

locationGet(notificationsRouter, '/unread-count', async (req, res) => {
  const locationId = req.locationId!;
  const unreadCount = await countUnreadNotifications(req.user!, locationId);
  res.json({ locationId, unreadCount });
});

locationPut(notificationsRouter, '/read-all', async (req, res) => {
  const locationId = req.locationId!;
  const updated = await markAllNotificationsRead(req.user!, locationId);
  res.json({ locationId, updated });
});

locationPut(notificationsRouter, '/:notificationId/read', async (req, res) => {
  const locationId = req.locationId!;
  const notificationId = param(req.params, 'notificationId');
  const updated = await markNotificationRead(req.user!, locationId, notificationId);
  if (!updated) {
    throw new AppError(404, 'Notification not found', 'NOT_FOUND');
  }
  res.json(updated);
});
