import { api, type ApiAuth, withAuthHeaders } from './api';
import {
  type DashboardEvent,
  type DashboardSummary,
  EMPTY_DASHBOARD_SUMMARY,
  clientDashboardDayKey,
  readDashboardCache,
  writeDashboardCache,
  clearDashboardCache,
} from './dashboardSummaryCache';

export type { DashboardEvent, DashboardSummary };
export {
  EMPTY_DASHBOARD_SUMMARY,
  clientDashboardDayKey,
  readDashboardCache,
  writeDashboardCache,
  clearDashboardCache,
};

function clientTzOffset(): number {
  return -new Date().getTimezoneOffset();
}

export async function fetchDashboardSummary(
  auth: ApiAuth,
  opts?: { force?: boolean },
): Promise<DashboardSummary> {
  const tzOffset = clientTzOffset();
  const refresh = opts?.force ? '&refresh=1' : '';
  const summary = await api.getJson<DashboardSummary>(
    `/api/dashboard/summary?tzOffset=${tzOffset}${refresh}`,
    { headers: withAuthHeaders(auth) },
  );
  if (auth.locationId) {
    writeDashboardCache(auth.locationId, {
      todayEvents: summary.todayEvents ?? [],
      todayAppointmentCount: summary.todayAppointmentCount ?? summary.todayEvents?.length ?? 0,
      unreadCount: summary.unreadCount ?? 0,
      pipelineValue: summary.pipelineValue ?? 0,
      pendingTasks: summary.pendingTasks ?? 0,
    });
  }
  return {
    todayEvents: summary.todayEvents ?? [],
    todayAppointmentCount: summary.todayAppointmentCount ?? summary.todayEvents?.length ?? 0,
    unreadCount: summary.unreadCount ?? 0,
    pipelineValue: summary.pipelineValue ?? 0,
    pendingTasks: summary.pendingTasks ?? 0,
  };
}

/** Warm the dashboard cache as soon as main tabs mount. */
export function prefetchDashboardSummary(auth: ApiAuth): void {
  if (!auth.token || !auth.locationId) return;
  const cached = readDashboardCache(auth.locationId);
  if (cached) return;
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  fetchDashboardSummary(auth).catch(() => {
    /* best-effort prefetch */
  });
}
