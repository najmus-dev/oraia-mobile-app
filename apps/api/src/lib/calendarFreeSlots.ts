/** GHL calendar endpoints (free-slots, appointments) use this Version header. */
export const GHL_CALENDAR_API_VERSION = '2021-04-15';
export const GHL_FREE_SLOTS_MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

/** Normalize query timestamps to unix milliseconds (GHL requirement). */
export function normalizeFreeSlotsRange(startDate: number, endDate: number): { startDate: number; endDate: number } {
  const toMs = (value: number) => (value < 1e12 ? value * 1000 : value);
  return { startDate: toMs(startDate), endDate: toMs(endDate) };
}

export function assertFreeSlotsRange(startDate: number, endDate: number): void {
  if (endDate < startDate) {
    throw new Error('endDate must be on or after startDate.');
  }
  if (endDate - startDate > GHL_FREE_SLOTS_MAX_RANGE_MS) {
    throw new Error('Date range cannot exceed 31 days.');
  }
}

export type FreeSlotsQuery = {
  startDate: number;
  endDate: number;
  timezone?: string;
  userId?: string;
};

export function parseFreeSlotsQuery(query: Record<string, unknown>): FreeSlotsQuery {
  const rawStart = Number(query.startDate);
  const rawEnd = Number(query.endDate);
  if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) {
    throw new Error('startDate and endDate query params are required (unix milliseconds).');
  }
  const { startDate, endDate } = normalizeFreeSlotsRange(rawStart, rawEnd);
  assertFreeSlotsRange(startDate, endDate);

  const timezone = typeof query.timezone === 'string' && query.timezone.trim() ? query.timezone.trim() : undefined;
  const userId = typeof query.userId === 'string' && query.userId.trim() ? query.userId.trim() : undefined;
  return { startDate, endDate, timezone, userId };
}
