import { addDays, isSameDay } from './dates';

export type WeekGridEvent = {
  id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
};

export type PlacedWeekEvent = {
  event: WeekGridEvent;
  top: number;
  height: number;
};

export const WEEK_GRID_START_HOUR = 0;
export const WEEK_GRID_END_HOUR = 23;
export const WEEK_GRID_HOUR_HEIGHT = 56;

export const WEEK_GRID_HOURS = Array.from(
  { length: WEEK_GRID_END_HOUR - WEEK_GRID_START_HOUR + 1 },
  (_, i) => WEEK_GRID_START_HOUR + i,
);

export const WEEK_GRID_CONTENT_HEIGHT = WEEK_GRID_HOURS.length * WEEK_GRID_HOUR_HEIGHT;

function startOfDayCopy(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Maps an event start onto the week grid (local device timezone). */
export function placeEventOnWeekGrid(event: WeekGridEvent): PlacedWeekEvent | null {
  if (!event.startTime?.trim()) return null;
  const start = new Date(event.startTime);
  if (Number.isNaN(start.getTime())) return null;

  let end = event.endTime?.trim()
    ? new Date(event.endTime)
    : new Date(start.getTime() + 45 * 60 * 1000);
  if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + 45 * 60 * 1000);
  }

  const gridStartMins = WEEK_GRID_START_HOUR * 60;
  const gridEndMins = (WEEK_GRID_END_HOUR + 1) * 60;

  let startMins = start.getHours() * 60 + start.getMinutes();
  let endMins = end.getHours() * 60 + end.getMinutes();

  if (!isSameDay(start, end)) {
    endMins = gridEndMins;
  } else if (endMins <= startMins) {
    endMins = startMins + 45;
  }

  if (endMins <= gridStartMins || startMins >= gridEndMins) return null;

  const clampedStart = Math.max(startMins, gridStartMins);
  const clampedEnd = Math.min(endMins, gridEndMins);
  const top = ((clampedStart - gridStartMins) / 60) * WEEK_GRID_HOUR_HEIGHT;
  const height = Math.max(((clampedEnd - clampedStart) / 60) * WEEK_GRID_HOUR_HEIGHT, 24);

  return { event, top, height };
}

export function dayIndexInWeek(eventStart: Date, weekStart: Date, dayCount: number) {
  for (let i = 0; i < dayCount; i++) {
    if (isSameDay(addDays(weekStart, i), eventStart)) return i;
  }
  return -1;
}

export function bucketWeekEventsByDay(
  events: WeekGridEvent[],
  weekStart: Date,
  dayCount: number,
): PlacedWeekEvent[][] {
  const cols: PlacedWeekEvent[][] = Array.from({ length: dayCount }, () => []);
  const normalizedWeekStart = startOfDayCopy(weekStart);

  for (const event of events) {
    if (!event.startTime?.trim()) continue;
    const start = new Date(event.startTime);
    if (Number.isNaN(start.getTime())) continue;

    const dayIndex = dayIndexInWeek(start, normalizedWeekStart, dayCount);
    if (dayIndex < 0) continue;

    const placed = placeEventOnWeekGrid(event);
    if (placed) cols[dayIndex].push(placed);
  }

  return cols;
}

export function earliestWeekEventTop(cols: PlacedWeekEvent[][]) {
  let top = Infinity;
  for (const col of cols) {
    for (const placed of col) {
      top = Math.min(top, placed.top);
    }
  }
  return Number.isFinite(top) ? top : null;
}
