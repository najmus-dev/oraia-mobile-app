import { api, type ApiAuth, withAuthHeaders } from './api';

export type DashboardEvent = {
  id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
};

export type DashboardSummary = {
  todayEvents: DashboardEvent[];
  todayAppointmentCount: number;
  unreadCount: number;
  pipelineValue: number;
  pendingTasks: number;
};

export const EMPTY_DASHBOARD_SUMMARY: DashboardSummary = {
  todayEvents: [],
  todayAppointmentCount: 0,
  unreadCount: 0,
  pipelineValue: 0,
  pendingTasks: 0,
};

type CacheEntry = {
  locationId: string;
  dayKey: string;
  data: DashboardSummary;
  fetchedAt: number;
};

let memoryCache: CacheEntry | null = null;
const CACHE_MAX_AGE_MS = 90_000;

export function clientDashboardDayKey(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function readDashboardCache(
  locationId: string,
  dayKey = clientDashboardDayKey(),
): DashboardSummary | null {
  if (!memoryCache) return null;
  if (memoryCache.locationId !== locationId || memoryCache.dayKey !== dayKey) return null;
  if (Date.now() - memoryCache.fetchedAt > CACHE_MAX_AGE_MS) return null;
  return memoryCache.data;
}

export function writeDashboardCache(
  locationId: string,
  data: DashboardSummary,
  dayKey = clientDashboardDayKey(),
): void {
  memoryCache = { locationId, dayKey, data, fetchedAt: Date.now() };
}

export function clearDashboardCache(): void {
  memoryCache = null;
}

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
