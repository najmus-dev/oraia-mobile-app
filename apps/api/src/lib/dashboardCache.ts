export type DashboardSummaryPayload = {
  locationId: string;
  todayEvents: Array<{ id: string; title?: string; startTime?: string; endTime?: string }>;
  todayAppointmentCount: number;
  unreadCount: number;
  pipelineValue: number;
  pendingTasks: number;
};

type CacheEntry = {
  expiresAt: number;
  data: DashboardSummaryPayload;
};

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export function dashboardCacheKey(locationId: string, tzOffset: number, dayStartIso: string): string {
  const day = dayStartIso.slice(0, 10);
  return `${locationId}:${tzOffset}:${day}`;
}

export function getDashboardCache(key: string): DashboardSummaryPayload | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setDashboardCache(key: string, data: DashboardSummaryPayload): void {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

export function clearDashboardCacheForLocation(locationId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${locationId}:`)) cache.delete(key);
  }
}
