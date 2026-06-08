export type ContactDndSettings = {
  Call?: { status?: string };
  Email?: { status?: string };
  SMS?: { status?: string };
};

export type ContactWriteBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  timezone?: string;
  type?: string;
  dnd?: boolean;
  dndSettings?: ContactDndSettings;
  tags?: string[];
};

export function hasContactIdentifier(body: ContactWriteBody): boolean {
  return Boolean(
    body.firstName?.trim() ||
      body.lastName?.trim() ||
      body.email?.trim() ||
      body.phone?.trim(),
  );
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readDndSettings(value: unknown): ContactDndSettings | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const channels = ['Call', 'Email', 'SMS'] as const;
  const settings: ContactDndSettings = {};
  for (const channel of channels) {
    const raw = record[channel];
    if (raw && typeof raw === 'object') {
      const status = (raw as Record<string, unknown>).status;
      if (typeof status === 'string') {
        settings[channel] = { status };
      }
    }
  }
  return Object.keys(settings).length > 0 ? settings : undefined;
}

function readTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  return tags.length > 0 ? tags : undefined;
}

export function validateContactCreateBody(body: unknown, partial = false): ContactWriteBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Provide at least firstName, lastName, email, or phone');
  }
  const record = body as Record<string, unknown>;
  const normalized: ContactWriteBody = {
    firstName: readString(record, 'firstName'),
    lastName: readString(record, 'lastName'),
    email: readString(record, 'email'),
    phone: readString(record, 'phone'),
    companyName: readString(record, 'companyName'),
    timezone: readString(record, 'timezone'),
    type: readString(record, 'type'),
    dnd: readBoolean(record, 'dnd'),
    dndSettings: readDndSettings(record.dndSettings),
    tags: readTags(record.tags),
  };
  if (!partial && !hasContactIdentifier(normalized)) {
    throw new Error('Provide at least firstName, lastName, email, or phone');
  }
  return normalized;
}
