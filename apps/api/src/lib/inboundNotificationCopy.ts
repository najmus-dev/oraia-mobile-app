/** Shared SMS/call/email copy for sync, poller, and webhooks — closer to HighLevel's feed. */

export function contactLabel(name?: string | null, fallback = 'Unknown'): string {
  const trimmed = name?.trim();
  return trimmed || fallback;
}

export function classifyLastMessageType(lastMessageType?: string | null): {
  kind: 'call' | 'voicemail' | 'sms' | 'email' | 'other';
  channel: 'messages' | 'calls';
} {
  const raw = (lastMessageType ?? '').toUpperCase();
  if (raw.includes('VOICEMAIL')) return { kind: 'voicemail', channel: 'calls' };
  if (raw.includes('CALL')) return { kind: 'call', channel: 'calls' };
  if (raw.includes('EMAIL')) return { kind: 'email', channel: 'messages' };
  if (raw.includes('SMS') || raw.includes('RCS')) return { kind: 'sms', channel: 'messages' };
  return { kind: 'other', channel: 'messages' };
}

export function ghlStyleNotificationCopy(input: {
  contactName?: string | null;
  lastMessageType?: string | null;
  lastMessageBody?: string | null;
  phone?: string | null;
}): { title: string; body: string; channel: 'messages' | 'calls'; typeHint: 'call' | 'message' } {
  const from = contactLabel(input.contactName);
  const classified = classifyLastMessageType(input.lastMessageType);
  const plain =
    input.lastMessageBody?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';

  if (classified.kind === 'voicemail') {
    return {
      title: from,
      body: plain || 'left you a voicemail',
      channel: 'calls',
      typeHint: 'call',
    };
  }
  if (classified.kind === 'call') {
    const callerId = input.phone?.trim();
    return {
      title: from,
      body: callerId ? `called you (${callerId})` : plain || 'called you',
      channel: 'calls',
      typeHint: 'call',
    };
  }
  return {
    title: from,
    body: plain || (classified.kind === 'email' ? 'New email' : 'New message'),
    channel: classified.channel,
    typeHint: 'message',
  };
}
