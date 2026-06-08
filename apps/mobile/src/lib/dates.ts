export function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfWeek(d = new Date()) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** US-style week starting Sunday (matches GHL weekly calendar). */
export function startOfWeekSunday(d = new Date()) {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfWeekSunday(d = new Date()) {
  const start = startOfWeekSunday(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function addDays(d: Date, count: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + count);
  return date;
}

export function formatWeekRange(start: Date, end: Date) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endFmt = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startFmt} – ${endFmt}`;
}

export function timezoneAbbrev(d = new Date()) {
  const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(d);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}

export function startOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function toIso(d: Date) {
  return d.toISOString();
}

export function formatEventRange(start?: string, end?: string) {
  if (!start) return '';
  try {
    const s = new Date(start);
    const e = end ? new Date(end) : null;
    const datePart = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const startTime = s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const endTime = e
      ? e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : '';
    return endTime ? `${datePart} · ${startTime} – ${endTime}` : `${datePart} · ${startTime}`;
  } catch {
    return start;
  }
}

export function formatDayLabel(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function startOfMonth(d = new Date()) {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfMonth(d = new Date()) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addMonths(d: Date, count: number) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + count);
  return date;
}

export function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD for a calendar day in an IANA timezone (matches GHL free-slots keys). */
export function toDateKeyInTimezone(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function zonedDateTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [y, m, day] = dateKey.split('-').map(Number);
  const [hh, mm, ssMs] = time.split(':');
  const [ss, ms = '0'] = (ssMs ?? '0').split('.');
  let utcGuess = Date.UTC(y!, m! - 1, day!, Number(hh), Number(mm), Number(ss), Number(ms));

  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utcGuess));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
    const actual = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    const target = Date.UTC(y!, m! - 1, day!, Number(hh), Number(mm), Number(ss), Number(ms));
    const diff = target - actual;
    if (diff === 0) break;
    utcGuess += diff;
  }
  return new Date(utcGuess);
}

/** Start/end of a day in an IANA timezone as UTC instants (for GHL startDate/endDate). */
export function dayBoundsInTimezone(d: Date, timeZone: string) {
  const dateKey = toDateKeyInTimezone(d, timeZone);
  return {
    start: zonedDateTimeToUtc(dateKey, '00:00:00.000', timeZone),
    end: zonedDateTimeToUtc(dateKey, '23:59:59.999', timeZone),
  };
}

export function formatShortDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMonthYear(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function unixSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

/** GHL calendar free-slots API expects unix timestamps in milliseconds. */
export function unixMillis(d: Date) {
  return d.getTime();
}

export function formatTimeRange(start: Date, end: Date) {
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${startTime} - ${endTime}`;
}
