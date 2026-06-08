import { Router } from 'express';
import { locationGet } from '../middleware/locationRoute';
import { localDayBounds, parseTzOffsetQuery } from '../lib/dashboardDayBounds';
import {
  listAllCalendarEvents,
  sumOpenPipelineValue,
  sumUnreadConversationCount,
} from '../lib/ghlAggregates';
import { getLocationGhlClient } from '../services/tokenVault';

export const dashboardRouter = Router();

async function countPendingTasks(
  ghl: ReturnType<typeof getLocationGhlClient>,
  locationId: string,
): Promise<number> {
  let count = 0;
  let skip = 0;
  for (let page = 0; page < 10; page += 1) {
    const data = await ghl.searchLocationTasks(locationId, {
      completed: false,
      limit: 100,
      skip,
    });
    const batch = data.tasks ?? [];
    count += batch.filter((t) => !t.completed).length;
    if (batch.length < 100) break;
    skip += batch.length;
  }
  return count;
}

locationGet(dashboardRouter, '/summary', async (req, res) => {
  const locationId = req.locationId!;
  const ghl = getLocationGhlClient(locationId);
  const tzOffset = parseTzOffsetQuery(req.query.tzOffset);
  const { start: dayStart, end: dayEnd } = localDayBounds(tzOffset);

  const [allTodayEvents, unreadCount, pipelineValue, pendingTasks] = await Promise.all([
    listAllCalendarEvents(ghl, locationId, {
      startTime: dayStart.toISOString(),
      endTime: dayEnd.toISOString(),
    }),
    sumUnreadConversationCount(ghl, locationId),
    sumOpenPipelineValue(ghl, locationId),
    countPendingTasks(ghl, locationId),
  ]);

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

  const todayAppointmentCount = allTodayEvents.length;

  res.json({
    locationId,
    todayEvents,
    todayAppointmentCount,
    unreadCount,
    pipelineValue,
    pendingTasks,
  });
});
