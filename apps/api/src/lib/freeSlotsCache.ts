/** Short-lived cache for GHL calendar free-slots (same day/calendar queried often while scheduling). */
const TTL_MS = 45_000;

type Entry = { expiresAt: number; slots: unknown };

const cache = new Map<string, Entry>();

export function freeSlotsCacheKey(
  locationId: string,
  calendarId: string,
  startDate: number,
  endDate: number,
): string {
  return `${locationId}:${calendarId}:${startDate}:${endDate}`;
}

export function readFreeSlotsCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.slots;
}

export function writeFreeSlotsCache(key: string, slots: unknown): void {
  cache.set(key, { slots, expiresAt: Date.now() + TTL_MS });
}

export function clearFreeSlotsCache(): void {
  cache.clear();
}
