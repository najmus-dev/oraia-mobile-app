import type { GhlCalendarEvent } from '../services/ghl/types';

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function coerceCalendarTimestamp(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

/** Normalize one GHL calendar event / appointment record for mobile display. */
export function normalizeCalendarEvent(raw: unknown): GhlCalendarEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const nested =
    record.appointment && typeof record.appointment === 'object'
      ? (record.appointment as Record<string, unknown>)
      : record.event && typeof record.event === 'object'
        ? (record.event as Record<string, unknown>)
        : record;

  const id =
    readString(nested, 'id') ??
    readString(nested, '_id') ??
    readString(nested, 'eventId') ??
    readString(nested, 'appointmentId');
  const startTime =
    coerceCalendarTimestamp(nested.startTime) ??
    coerceCalendarTimestamp(nested.start) ??
    coerceCalendarTimestamp(nested.startDate);
  const endTime =
    coerceCalendarTimestamp(nested.endTime) ??
    coerceCalendarTimestamp(nested.end) ??
    coerceCalendarTimestamp(nested.endDate);

  if (!id && !startTime) return null;

  return {
    id: id ?? `evt_${startTime ?? 'unknown'}`,
    title: readString(nested, 'title') ?? readString(nested, 'name'),
    calendarId: readString(nested, 'calendarId'),
    locationId: readString(nested, 'locationId'),
    contactId: readString(nested, 'contactId'),
    startTime,
    endTime,
    appointmentStatus:
      readString(nested, 'appointmentStatus') ?? readString(nested, 'status'),
  };
}

export function normalizeCalendarEventsResponse(data: unknown): GhlCalendarEvent[] {
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const list = record.events ?? record.appointments ?? record.data;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => normalizeCalendarEvent(item))
    .filter((item): item is GhlCalendarEvent => item != null);
}
