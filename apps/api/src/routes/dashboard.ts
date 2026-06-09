import { Router } from 'express';
import { locationGet } from '../middleware/locationRoute';
import { localDayBounds, parseTzOffsetQuery } from '../lib/dashboardDayBounds';
import {
  dashboardCacheKey,
  getDashboardCache,
  setDashboardCache,
  type DashboardSummaryPayload,
} from '../lib/dashboardCache';
import { countPendingLocationTasks } from '../lib/dashboardTasks';
import {
  listAllCalendarEvents,
  sumOpenPipelineValue,
  sumUnreadConversationCount,
} from '../lib/ghlAggregates';
import { logger } from '../lib/logger';
import { getLocationGhlClient } from '../services/tokenVault';

export const dashboardRouter = Router();

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === 'fulfilled') return result.value;
  logger.warn('Dashboard aggregate failed', { reason: result.reason });
  return fallback;
}

async function buildDashboardSummary(
  locationId: string,
  tzOffset: number,
): Promise<DashboardSummaryPayload> {
  const ghl = getLocationGhlClient(locationId);
  const { start: dayStart, end: dayEnd } = localDayBounds(tzOffset);

  const [eventsResult, unreadResult, pipelineResult, tasksResult] = await Promise.allSettled([
    listAllCalendarEvents(ghl, locationId, {
      startTime: dayStart.toISOString(),
      endTime: dayEnd.toISOString(),
    }),
    sumUnreadConversationCount(ghl, locationId),
    sumOpenPipelineValue(ghl, locationId, { maxPages: 8 }),
    countPendingLocationTasks(ghl, locationId),
  ]);

  const allTodayEvents = settledValue(eventsResult, []);
  const unreadCount = settledValue(unreadResult, 0);
  const pipelineValue = settledValue(pipelineResult, 0);
  const pendingTasks = settledValue(tasksResult, 0);

  const todayEvents = allTodayEvents
    .filter((e) => e.id)
    .map((e) => ({
      id: e.id!,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
    }))
    .sort((a, b) => new Date(a.startTime ?? 0).getTime() - new Date(b.startTime ?? 0).getTime())
    .slice(0, 3);

  return {
    locationId,
    todayEvents,
    todayAppointmentCount: allTodayEvents.length,
    unreadCount,
    pipelineValue,
    pendingTasks,
  };
}

locationGet(dashboardRouter, '/summary', async (req, res) => {
  const locationId = req.locationId!;
  const tzOffset = parseTzOffsetQuery(req.query.tzOffset);
  const { start: dayStart } = localDayBounds(tzOffset);
  const cacheKey = dashboardCacheKey(locationId, tzOffset, dayStart.toISOString());
  const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

  if (!forceRefresh) {
    const cached = getDashboardCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
  }

  const summary = await buildDashboardSummary(locationId, tzOffset);
  setDashboardCache(cacheKey, summary);
  res.json(summary);
});
