export type InboundChannel = 'sms' | 'call' | 'voicemail' | 'email' | 'other';

export type InboundMessageWebhook = {
  type?: string;
  locationId?: string;
  conversationId?: string;
  contactId?: string;
  messageId?: string;
  assignedTo?: string;
  body?: string;
  messageType?: string;
  messageTypeString?: string;
  direction?: string;
  from?: string;
  contactName?: string;
  subject?: string;
  dateAdded?: string;
  status?: string;
  callStatus?: string;
  callDuration?: number;
};

export type ConversationUnreadWebhook = {
  locationId: string;
  conversationId: string;
  contactId?: string;
  assignedTo?: string;
  unreadCount: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function compactType(type: string): string {
  return type.replace(/[\s_-]/g, '').toUpperCase();
}

/** GHL sometimes wraps event fields in `data` / `payload`. */
export function unwrapWebhookPayload(body: unknown): Record<string, unknown> {
  if (!isPlainObject(body)) return {};
  let nested: Record<string, unknown> = {};
  for (const key of ['data', 'payload', 'message'] as const) {
    if (isPlainObject(body[key])) {
      nested = { ...nested, ...body[key] };
    }
  }
  const top: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'data' || key === 'payload' || key === 'message') continue;
    top[key] = value;
  }
  return { ...nested, ...top };
}

export function normalizeWebhookEventType(body: Record<string, unknown> | {
  type?: string;
  event?: string;
  installType?: string;
}): string {
  const type = typeof body.type === 'string' ? body.type : '';
  const event = typeof body.event === 'string' ? body.event : '';
  const installType = typeof body.installType === 'string' ? body.installType : '';
  return (type || event || installType).trim();
}

export function isInboundMessageEvent(type: string): boolean {
  const compact = compactType(type);
  return compact === 'INBOUNDMESSAGE' || compact === 'INBOUNDMESSAGEWEBHOOK';
}

export function isConversationUnreadEvent(type: string): boolean {
  const compact = compactType(type);
  return compact === 'CONVERSATIONUNREADUPDATE' || compact === 'CONVERSATIONUNREAD';
}

export function isAppointmentCreateEvent(type: string): boolean {
  return compactType(type) === 'APPOINTMENTCREATE';
}

export function isTaskCreateEvent(type: string): boolean {
  return compactType(type) === 'TASKCREATE';
}

export function isInboundDirection(direction?: string): boolean {
  if (!direction?.trim()) return true;
  const value = direction.trim().toLowerCase();
  return value === 'inbound' || value === 'incoming';
}

export function parseInboundMessage(body: unknown): InboundMessageWebhook | null {
  if (!isPlainObject(body)) return null;
  const record = unwrapWebhookPayload(body);
  const locationId = readString(record, 'locationId') ?? '';
  const conversationId = readString(record, 'conversationId') ?? '';
  if (!locationId || !conversationId) return null;
  return {
    type: readString(record, 'type', 'event'),
    locationId,
    conversationId,
    contactId: readString(record, 'contactId'),
    messageId: readString(record, 'messageId', 'id'),
    assignedTo: readString(record, 'assignedTo', 'userId', 'assignedUserId'),
    body: typeof record.body === 'string' ? record.body : undefined,
    messageType: readString(record, 'messageType'),
    messageTypeString: readString(record, 'messageTypeString'),
    direction: readString(record, 'direction'),
    from: readString(record, 'from'),
    contactName: readString(record, 'contactName', 'fullName', 'name'),
    subject: typeof record.subject === 'string' ? record.subject : undefined,
    dateAdded: readString(record, 'dateAdded', 'timestamp'),
    status: readString(record, 'status'),
    callStatus: readString(record, 'callStatus'),
    callDuration: readNumber(record, 'callDuration'),
  };
}

export function parseConversationUnread(body: unknown): ConversationUnreadWebhook | null {
  if (!isPlainObject(body)) return null;
  const record = unwrapWebhookPayload(body);
  const locationId = readString(record, 'locationId') ?? '';
  const conversationId = readString(record, 'conversationId', 'id') ?? '';
  if (!locationId || !conversationId) return null;
  const unreadCount = readNumber(record, 'unreadCount') ?? 0;
  return {
    locationId,
    conversationId,
    contactId: readString(record, 'contactId'),
    assignedTo: readString(record, 'assignedTo', 'userId', 'assignedUserId'),
    unreadCount,
  };
}

export type AppointmentCreateWebhook = {
  locationId: string;
  appointmentId: string;
  title?: string;
  contactId?: string;
  assignedUserId?: string;
  startTime?: string;
};

export type TaskCreateWebhook = {
  locationId: string;
  taskId: string;
  title?: string;
  body?: string;
  contactId?: string;
  assignedTo?: string;
};

export function parseAppointmentCreate(body: unknown): AppointmentCreateWebhook | null {
  if (!isPlainObject(body)) return null;
  const record = unwrapWebhookPayload(body);
  const locationId = readString(record, 'locationId') ?? '';
  const appointment = isPlainObject(record.appointment) ? record.appointment : record;
  const appointmentId = readString(appointment, 'id') ?? readString(record, 'id') ?? '';
  if (!locationId || !appointmentId) return null;
  return {
    locationId,
    appointmentId,
    title: readString(appointment, 'title'),
    contactId: readString(appointment, 'contactId'),
    assignedUserId: readString(appointment, 'assignedUserId', 'assignedTo', 'userId'),
    startTime: readString(appointment, 'startTime'),
  };
}

export function parseTaskCreate(body: unknown): TaskCreateWebhook | null {
  if (!isPlainObject(body)) return null;
  const record = unwrapWebhookPayload(body);
  const locationId = readString(record, 'locationId') ?? '';
  const taskId = readString(record, 'id', 'taskId') ?? '';
  if (!locationId || !taskId) return null;
  return {
    locationId,
    taskId,
    title: readString(record, 'title'),
    body: typeof record.body === 'string' ? record.body : undefined,
    contactId: readString(record, 'contactId'),
    assignedTo: readString(record, 'assignedTo', 'userId'),
  };
}

export function classifyInboundChannel(msg: {
  messageType?: string;
  messageTypeString?: string;
  callStatus?: string;
  status?: string;
}): InboundChannel {
  const raw = `${msg.messageType ?? ''} ${msg.messageTypeString ?? ''}`.toUpperCase();
  const status = `${msg.callStatus ?? ''} ${msg.status ?? ''}`.toLowerCase();
  if (raw.includes('VOICEMAIL') || status.includes('voicemail')) return 'voicemail';
  if (raw.includes('CALL')) return 'call';
  if (raw.includes('SMS')) return 'sms';
  if (raw.includes('EMAIL')) return 'email';
  return 'other';
}

function inboundFromLabel(msg: InboundMessageWebhook): string {
  return msg.contactName?.trim() || msg.from?.trim() || 'a contact';
}

function formatCallDuration(seconds?: number): string | undefined {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return undefined;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  if (minutes <= 0) return `${remainder}s`;
  return `${minutes}m ${remainder}s`;
}

function isMissedCallStatus(msg: InboundMessageWebhook): boolean {
  const status = `${msg.callStatus ?? ''} ${msg.status ?? ''}`.toLowerCase();
  return /missed|no-?answer|canceled|cancelled|busy|failed/.test(status);
}

export function inboundMessagePreview(msg: InboundMessageWebhook): string {
  const channel = classifyInboundChannel(msg);
  if (channel === 'email') {
    const subject = msg.subject?.trim();
    if (subject) return subject;
  }
  const raw = msg.body?.trim();
  if (raw) {
    const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain) return plain.slice(0, 120);
  }
  if (channel === 'voicemail') return 'New voicemail';
  if (channel === 'call') return isMissedCallStatus(msg) ? 'Missed call' : 'Inbound call';
  if (channel === 'sms') return 'New SMS';
  return 'New message';
}

export function inboundNotificationCopy(msg: InboundMessageWebhook): {
  title: string;
  body: string;
  channel: 'messages' | 'calls';
} {
  const from = inboundFromLabel(msg);
  const channel = classifyInboundChannel(msg);
  if (channel === 'voicemail') {
    return { title: `Voicemail from ${from}`, body: inboundMessagePreview(msg), channel: 'calls' };
  }
  if (channel === 'call') {
    const missed = isMissedCallStatus(msg);
    const duration = formatCallDuration(msg.callDuration);
    return {
      title: missed ? `Missed call from ${from}` : `Call from ${from}`,
      body: duration ?? inboundMessagePreview(msg),
      channel: 'calls',
    };
  }
  if (channel === 'sms') {
    return { title: `SMS from ${from}`, body: inboundMessagePreview(msg), channel: 'messages' };
  }
  return {
    title: `Message from ${from}`,
    body: inboundMessagePreview(msg),
    channel: 'messages',
  };
}
