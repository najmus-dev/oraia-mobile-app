export type InboundMessageWebhook = {
  type?: string;
  locationId?: string;
  conversationId?: string;
  contactId?: string;
  messageId?: string;
  assignedTo?: string;
  body?: string;
  messageType?: string;
  direction?: string;
  from?: string;
  subject?: string;
};

export function normalizeWebhookEventType(body: { type?: string; event?: string; installType?: string }): string {
  return (body.type ?? body.event ?? body.installType ?? '').trim();
}

export function isInboundMessageEvent(type: string): boolean {
  return type.toUpperCase() === 'INBOUNDMESSAGE';
}

export function parseInboundMessage(body: unknown): InboundMessageWebhook | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const locationId = typeof record.locationId === 'string' ? record.locationId.trim() : '';
  const conversationId = typeof record.conversationId === 'string' ? record.conversationId.trim() : '';
  if (!locationId || !conversationId) return null;
  return {
    type: typeof record.type === 'string' ? record.type : undefined,
    locationId,
    conversationId,
    contactId: typeof record.contactId === 'string' ? record.contactId.trim() : undefined,
    messageId:
      typeof record.messageId === 'string'
        ? record.messageId.trim()
        : typeof record.id === 'string'
          ? record.id.trim()
          : undefined,
    assignedTo: typeof record.assignedTo === 'string' ? record.assignedTo.trim() : undefined,
    body: typeof record.body === 'string' ? record.body : undefined,
    messageType: typeof record.messageType === 'string' ? record.messageType : undefined,
    direction: typeof record.direction === 'string' ? record.direction : undefined,
    from: typeof record.from === 'string' ? record.from : undefined,
    subject: typeof record.subject === 'string' ? record.subject : undefined,
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

export function isAppointmentCreateEvent(type: string): boolean {
  return type.toUpperCase() === 'APPOINTMENTCREATE';
}

export function isTaskCreateEvent(type: string): boolean {
  return type.toUpperCase() === 'TASKCREATE';
}

export function parseAppointmentCreate(body: unknown): AppointmentCreateWebhook | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const locationId = typeof record.locationId === 'string' ? record.locationId.trim() : '';
  const appointment =
    record.appointment && typeof record.appointment === 'object'
      ? (record.appointment as Record<string, unknown>)
      : record;
  const appointmentId =
    typeof appointment.id === 'string'
      ? appointment.id.trim()
      : typeof record.id === 'string'
        ? record.id.trim()
        : '';
  if (!locationId || !appointmentId) return null;
  return {
    locationId,
    appointmentId,
    title: typeof appointment.title === 'string' ? appointment.title : undefined,
    contactId: typeof appointment.contactId === 'string' ? appointment.contactId : undefined,
    assignedUserId:
      typeof appointment.assignedUserId === 'string' ? appointment.assignedUserId : undefined,
    startTime: typeof appointment.startTime === 'string' ? appointment.startTime : undefined,
  };
}

export function parseTaskCreate(body: unknown): TaskCreateWebhook | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const locationId = typeof record.locationId === 'string' ? record.locationId.trim() : '';
  const taskId =
    typeof record.id === 'string'
      ? record.id.trim()
      : typeof record.taskId === 'string'
        ? record.taskId.trim()
        : '';
  if (!locationId || !taskId) return null;
  return {
    locationId,
    taskId,
    title: typeof record.title === 'string' ? record.title : undefined,
    body: typeof record.body === 'string' ? record.body : undefined,
    contactId: typeof record.contactId === 'string' ? record.contactId : undefined,
    assignedTo: typeof record.assignedTo === 'string' ? record.assignedTo : undefined,
  };
}

export function inboundMessagePreview(msg: InboundMessageWebhook): string {
  const channel = msg.messageType?.trim() || 'Message';
  if (msg.messageType?.toUpperCase() === 'EMAIL') {
    const subject = msg.subject?.trim();
    if (subject) return subject;
  }
  const raw = msg.body?.trim();
  if (raw) {
    const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain) return plain.slice(0, 120);
  }
  if (msg.messageType?.toUpperCase() === 'CALL') return 'Incoming call';
  return `New ${channel}`;
}
