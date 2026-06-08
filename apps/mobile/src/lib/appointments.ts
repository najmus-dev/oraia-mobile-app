import { formatEventRange } from './dates';
import { looksLikePhoneContactId } from './contacts';

export { looksLikePhoneContactId } from './contacts';

export type CalendarOption = { id: string; name?: string };

export type Appointment = {
  id?: string;
  title?: string;
  calendarId?: string;
  contactId?: string;
  startTime?: string;
  endTime?: string;
  appointmentStatus?: string;
  address?: string;
  notes?: string;
};

export type AppointmentFormValues = {
  title: string;
  contactId: string;
  calendarId: string;
  startTime: string;
  endTime: string;
  notes: string;
};

export function defaultStartIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export function defaultEndIso(startIso?: string): string {
  const d = new Date(startIso ?? defaultStartIso());
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

export function emptyAppointmentFormValues(defaults?: Partial<AppointmentFormValues>): AppointmentFormValues {
  const startTime = defaults?.startTime ?? defaultStartIso();
  return {
    title: '',
    contactId: '',
    calendarId: '',
    startTime,
    endTime: defaults?.endTime ?? defaultEndIso(startTime),
    notes: '',
    ...defaults,
  };
}


export function parseIsoDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIsoPreview(iso: string): string {
  if (!iso.trim()) return '';
  return formatEventRange(iso, iso);
}

export function appointmentToFormValues(appointment: Appointment): AppointmentFormValues {
  return {
    title: appointment.title?.trim() ?? '',
    contactId: appointment.contactId?.trim() ?? '',
    calendarId: appointment.calendarId?.trim() ?? '',
    startTime: appointment.startTime?.trim() ?? defaultStartIso(),
    endTime: appointment.endTime?.trim() ?? defaultEndIso(appointment.startTime),
    notes: appointment.notes?.trim() ?? '',
  };
}

export function formValuesToAppointmentPayload(
  values: AppointmentFormValues,
  mode: 'create' | 'update',
): Record<string, string> {
  const payload: Record<string, string> = {
    title: values.title.trim(),
    calendarId: values.calendarId.trim(),
    startTime: values.startTime.trim(),
    endTime: values.endTime.trim(),
  };
  const contactId = values.contactId.trim();
  if (contactId) payload.contactId = contactId;
  else if (mode === 'create') {
    // caller validates before submit
  }
  const notes = values.notes.trim();
  if (notes) payload.notes = notes;
  return payload;
}

export function validateAppointmentForm(values: AppointmentFormValues, mode: 'create' | 'update'): string | null {
  if (!values.title.trim()) return 'Enter an appointment title.';
  if (!values.calendarId.trim()) return 'Select a calendar.';
  if (mode === 'create' && !values.contactId.trim()) {
    return 'Select a contact (use search — a phone number is not a contact ID).';
  }
  if (mode === 'create' && looksLikePhoneContactId(values.contactId)) {
    return 'That looks like a phone number. Use the GHL contact ID from Contacts (Step 4 will add search).';
  }
  const start = parseIsoDate(values.startTime);
  const end = parseIsoDate(values.endTime);
  if (!start) return 'Enter a valid start time (ISO 8601).';
  if (!end) return 'Enter a valid end time (ISO 8601).';
  if (end.getTime() <= start.getTime()) return 'End time must be after start time.';
  return null;
}

export function normalizeAppointment(raw: unknown): Appointment {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const nested =
    record.appointment && typeof record.appointment === 'object'
      ? (record.appointment as Record<string, unknown>)
      : record.event && typeof record.event === 'object'
        ? (record.event as Record<string, unknown>)
        : record;

  const source = nested as Record<string, unknown>;
  return {
    id: typeof source.id === 'string' ? source.id : undefined,
    title: typeof source.title === 'string' ? source.title : undefined,
    calendarId: typeof source.calendarId === 'string' ? source.calendarId : undefined,
    contactId: typeof source.contactId === 'string' ? source.contactId : undefined,
    startTime: typeof source.startTime === 'string' ? source.startTime : undefined,
    endTime: typeof source.endTime === 'string' ? source.endTime : undefined,
    appointmentStatus:
      typeof source.appointmentStatus === 'string' ? source.appointmentStatus : undefined,
    address: typeof source.address === 'string' ? source.address : undefined,
    notes: typeof source.notes === 'string' ? source.notes : undefined,
  };
}
