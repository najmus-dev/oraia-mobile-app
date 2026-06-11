import {
  addMonths,
  endOfMonth,
  endOfWeekSunday,
  startOfMonth,
  startOfWeekSunday,
  toDateKey,
} from './dates';

export type CalendarViewMode = 'list' | 'weekly' | 'monthly';

export type CalendarListEvent = {
  id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  appointmentStatus?: string;
  calendarId?: string;
};

export type CalendarOption = { id: string; name?: string };

/** Date range to request from the BFF for the active view. */
export function computeCalendarFetchRange(viewMode: CalendarViewMode, anchor: Date) {
  if (viewMode === 'weekly') {
    return { start: startOfWeekSunday(anchor), end: endOfWeekSunday(anchor) };
  }
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  end.setDate(end.getDate() + 14);
  return { start, end };
}

/** Keeps the same day-of-month when moving between months (e.g. Jan 31 → Feb 28). */
export function clampDayInMonth(day: Date, targetMonth: Date) {
  const lastDay = endOfMonth(targetMonth).getDate();
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(day.getDate(), lastDay));
}

export function shiftVisibleMonth(anchor: Date, step: number) {
  return clampDayInMonth(anchor, addMonths(startOfMonth(anchor), step));
}

export function shiftVisibleWeek(anchor: Date, step: number) {
  const next = new Date(anchor);
  next.setDate(next.getDate() + step * 7);
  return next;
}

/** Filters loaded events to what the current view should display. */
export function filterEventsForView(
  events: CalendarListEvent[],
  viewMode: CalendarViewMode,
  anchor: Date,
): CalendarListEvent[] {
  const withTime = events.filter((e) => e.id && e.startTime);
  if (viewMode === 'weekly') {
    const weekStart = startOfWeekSunday(anchor).getTime();
    const weekEnd = endOfWeekSunday(anchor).getTime();
    return withTime.filter((e) => {
      const t = new Date(e.startTime!).getTime();
      return t >= weekStart && t <= weekEnd;
    });
  }
  const monthStart = startOfMonth(anchor).getTime();
  const monthEnd = endOfMonth(anchor).getTime();
  return withTime.filter((e) => {
    const t = new Date(e.startTime!).getTime();
    return t >= monthStart && t <= monthEnd;
  });
}

export function collectMarkedDates(events: Array<{ startTime?: string }>) {
  const set = new Set<string>();
  for (const e of events) {
    if (e.startTime) set.add(toDateKey(new Date(e.startTime)));
  }
  return set;
}

export function mergeCalendarOptions(existing: CalendarOption[], incoming: CalendarOption[]) {
  const map = new Map<string, CalendarOption>();
  for (const cal of existing) map.set(cal.id, cal);
  for (const cal of incoming) {
    if (!cal.id) continue;
    const prev = map.get(cal.id);
    map.set(cal.id, { id: cal.id, name: cal.name?.trim() || prev?.name });
  }
  return Array.from(map.values()).sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
}

export function buildCalendarRangeKey(
  viewMode: CalendarViewMode,
  start: Date,
  end: Date,
  calendarId: string | null,
) {
  return `${viewMode}|${start.toISOString()}|${end.toISOString()}|${calendarId ?? 'all'}`;
}

export function calendarLoadingState(
  loading: boolean,
  loadedRangeKey: string | null,
  rangeKey: string,
) {
  const rangeReady = loadedRangeKey === rangeKey;
  return {
    rangeReady,
    /** First visit — block the whole content area. */
    blocking: loading && loadedRangeKey === null,
    /** Navigating weeks/months or switching views — keep shell, show overlay. */
    updating: loading && loadedRangeKey !== null && !rangeReady,
    /** Safe to show empty state (not while a fetch for this range is in flight). */
    showEmpty: !loading && rangeReady,
  };
}

export type CalendarDaySection = { title: string; data: CalendarListEvent[] };

export function groupEventsByDay(events: CalendarListEvent[], formatDayLabel: (iso: string) => string): CalendarDaySection[] {
  const map = new Map<string, CalendarListEvent[]>();
  for (const e of events) {
    const key = e.startTime ? new Date(e.startTime).toDateString() : 'Unknown';
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([, items]) => ({
      title: formatDayLabel(items[0]?.startTime ?? ''),
      data: items.sort(
        (a, b) => new Date(a.startTime ?? 0).getTime() - new Date(b.startTime ?? 0).getTime(),
      ),
    }));
}
