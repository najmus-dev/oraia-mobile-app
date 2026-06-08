/** Local calendar day bounds from client tz offset (minutes east of UTC, i.e. -Date.getTimezoneOffset()). */
export function localDayBounds(tzOffsetMinutes: number, date = new Date()): { start: Date; end: Date } {
  const offsetMs = tzOffsetMinutes * 60_000;
  const localMs = date.getTime() + offsetMs;
  const local = new Date(localMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const start = new Date(Date.UTC(y, m, d) - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60_000 - 1);
  return { start, end };
}

export function parseTzOffsetQuery(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-840, Math.min(840, Math.trunc(n)));
}
