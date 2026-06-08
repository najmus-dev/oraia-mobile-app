export type AppointmentWriteBody = {
  title: string;
  calendarId: string;
  startTime: string;
  endTime: string;
  contactId?: string;
  notes?: string;
  address?: string;
};

export function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateAppointmentTimes(startTime: string, endTime: string): void {
  const start = parseIsoDate(startTime);
  const end = parseIsoDate(endTime);
  if (!start) throw new Error('startTime must be a valid ISO 8601 date');
  if (!end) throw new Error('endTime must be a valid ISO 8601 date');
  if (end.getTime() <= start.getTime()) {
    throw new Error('endTime must be after startTime');
  }
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readRequiredString(record: Record<string, unknown>, key: string, label = key): string {
  const value = readOptionalString(record, key);
  if (!value) throw new Error(`${label} is required`);
  return value;
}

export function validateAppointmentCreateBody(body: unknown): AppointmentWriteBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  const record = body as Record<string, unknown>;
  const payload: AppointmentWriteBody = {
    title: readRequiredString(record, 'title', 'title'),
    calendarId: readRequiredString(record, 'calendarId', 'calendarId'),
    startTime: readRequiredString(record, 'startTime', 'startTime'),
    endTime: readRequiredString(record, 'endTime', 'endTime'),
    contactId: readRequiredString(record, 'contactId', 'contactId'),
    notes: readOptionalString(record, 'notes'),
    address: readOptionalString(record, 'address'),
  };
  validateAppointmentTimes(payload.startTime, payload.endTime);
  return payload;
}

export function validateAppointmentUpdateBody(body: unknown): AppointmentWriteBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  const record = body as Record<string, unknown>;
  const payload: AppointmentWriteBody = {
    title: readRequiredString(record, 'title', 'title'),
    calendarId: readRequiredString(record, 'calendarId', 'calendarId'),
    startTime: readRequiredString(record, 'startTime', 'startTime'),
    endTime: readRequiredString(record, 'endTime', 'endTime'),
    contactId: readOptionalString(record, 'contactId'),
    notes: readOptionalString(record, 'notes'),
    address: readOptionalString(record, 'address'),
  };
  validateAppointmentTimes(payload.startTime, payload.endTime);
  return payload;
}
