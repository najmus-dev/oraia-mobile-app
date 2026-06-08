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
