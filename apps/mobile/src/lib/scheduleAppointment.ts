/** Parse GHL free-slots response into labeled slot options. */
export type AppointmentSlot = {
  startTime: string;
  endTime: string;
  label: string;
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function unwrapSlotsMap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  if (Object.keys(record).some((key) => DATE_KEY_RE.test(key))) return record;

  for (const key of ['slots', 'data', 'availability', 'freeSlots']) {
    const nested = record[key];
    if (nested && typeof nested === 'object') {
      const inner = nested as Record<string, unknown>;
      if (Object.keys(inner).some((k) => DATE_KEY_RE.test(k))) return inner;
    }
  }
  return record;
}

function parseSlotStart(item: unknown): Date | null {
  if (typeof item === 'string' || typeof item === 'number') {
    const date = new Date(item);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (item && typeof item === 'object') {
    const slot = item as { startTime?: string | number; start?: string | number; endTime?: string | number; end?: string | number };
    const startRaw = slot.startTime ?? slot.start;
    if (startRaw == null) return null;
    const date = new Date(startRaw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function parseSlotEnd(item: unknown, start: Date): Date | null {
  if (item && typeof item === 'object') {
    const slot = item as { endTime?: string | number; end?: string | number };
    const endRaw = slot.endTime ?? slot.end;
    if (endRaw != null) {
      const date = new Date(endRaw);
      if (!Number.isNaN(date.getTime()) && date.getTime() > start.getTime()) return date;
    }
  }
  return null;
}

function inferEndsFromStarts(starts: Date[], defaultMinutes = 45): Date[] {
  return starts.map((start, index) => {
    const next = starts[index + 1];
    if (next && next.getTime() > start.getTime()) return next;
    return new Date(start.getTime() + defaultMinutes * 60 * 1000);
  });
}

function formatSlotLabel(start: Date, end: Date) {
  const fmt = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${fmt(start)} - ${fmt(end)}`;
}

function pickDayEntry(map: Record<string, unknown>, dateKey: string): unknown {
  if (map[dateKey] != null) return map[dateKey];
  const dateKeys = Object.keys(map).filter((key) => DATE_KEY_RE.test(key));
  if (dateKeys.length === 1) return map[dateKeys[0]!];
  return undefined;
}

export function parseFreeSlotsForDate(raw: unknown, dateKey: string): AppointmentSlot[] {
  const map = unwrapSlotsMap(raw);
  const day = pickDayEntry(map, dateKey);
  if (!day) return [];

  const slotsRaw = Array.isArray(day) ? day : (day as { slots?: unknown }).slots;
  if (!Array.isArray(slotsRaw)) return [];

  const parsed = slotsRaw
    .map((item) => {
      const start = parseSlotStart(item);
      if (!start) return null;
      const explicitEnd = parseSlotEnd(item, start);
      return { item, start, end: explicitEnd };
    })
    .filter((entry): entry is { item: unknown; start: Date; end: Date | null } => entry != null);

  parsed.sort((a, b) => a.start.getTime() - b.start.getTime());
  const starts = parsed.map((entry) => entry.start);
  const inferredEnds = inferEndsFromStarts(starts);

  return parsed.map((entry, index) => {
    const end = entry.end ?? inferredEnds[index]!;
    return {
      startTime: entry.start.toISOString(),
      endTime: end.toISOString(),
      label: formatSlotLabel(entry.start, end),
    };
  });
}

import type { PickedContact } from '../lib/contacts';
import type { Appointment } from './appointments';

export type ScheduleContact = PickedContact;

export type ScheduleFormState = {
  calendarId: string;
  selectedDate: Date;
  slot: AppointmentSlot | null;
  title: string;
  notes: string;
  mode: 'standard' | 'custom';
  customStartTime: string;
  customEndTime: string;
};

export function defaultScheduleFormState(calendarId = ''): ScheduleFormState {
  const selectedDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);
  return {
    calendarId,
    selectedDate,
    slot: null,
    title: '',
    notes: '',
    mode: 'standard',
    customStartTime: '10:00',
    customEndTime: '10:45',
  };
}

export function appointmentToScheduleFormState(
  appointment: Appointment,
  calendars: { id: string }[],
): ScheduleFormState {
  const start = appointment.startTime ? new Date(appointment.startTime) : new Date();
  const end = appointment.endTime
    ? new Date(appointment.endTime)
    : new Date(start.getTime() + 45 * 60 * 1000);
  const selectedDate = new Date(start);
  selectedDate.setHours(0, 0, 0, 0);
  const calendarId = appointment.calendarId?.trim() || calendars[0]?.id || '';
  return {
    calendarId,
    selectedDate,
    slot: {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      label: formatSlotLabel(start, end),
    },
    title: appointment.title?.trim() ?? '',
    notes: appointment.notes?.trim() ?? '',
    mode: 'standard',
    customStartTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
    customEndTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
  };
}

export function buildCustomAppointmentTimes(
  date: Date,
  startHm: string,
  endHm: string,
): { startTime: string; endTime: string } | null {
  const [sh, sm] = startHm.split(':').map(Number);
  const [eh, em] = endHm.split(':').map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em)) {
    return null;
  }
  const start = new Date(date);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(date);
  end.setHours(eh, em, 0, 0);
  if (end.getTime() <= start.getTime()) return null;
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

export function validateScheduleForm(state: ScheduleFormState): string | null {
  if (!state.calendarId.trim()) return 'Select a calendar.';
  if (state.mode === 'standard' && !state.slot) return 'Select an available time slot.';
  if (state.mode === 'custom') {
    const times = buildCustomAppointmentTimes(
      state.selectedDate,
      state.customStartTime,
      state.customEndTime,
    );
    if (!times) return 'Enter a valid custom time range.';
  }
  return null;
}

export function scheduleFormToPayload(
  state: ScheduleFormState,
  contactId: string,
): Record<string, string> | null {
  let startTime = state.slot?.startTime;
  let endTime = state.slot?.endTime;
  if (state.mode === 'custom') {
    const times = buildCustomAppointmentTimes(
      state.selectedDate,
      state.customStartTime,
      state.customEndTime,
    );
    if (!times) return null;
    startTime = times.startTime;
    endTime = times.endTime;
  }
  if (!startTime || !endTime) return null;
  const payload: Record<string, string> = {
    calendarId: state.calendarId.trim(),
    contactId: contactId.trim(),
    title: state.title.trim() || 'Appointment',
    startTime,
    endTime,
  };
  if (state.notes.trim()) payload.notes = state.notes.trim();
  return payload;
}
