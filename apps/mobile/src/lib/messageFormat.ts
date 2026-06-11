import type { ConversationMessage, MessageChannel } from './conversations';
export { formatMessageBodyForDisplay, stripSmsComplianceFooter } from './smsCompliance';

export function isOutboundMessage(direction?: string): boolean {
  const d = direction?.toLowerCase();
  return d === 'outbound' || d === 'outgoing';
}

export function isUndeliveredMessage(message: Pick<ConversationMessage, 'direction' | 'status' | 'messageType'>): boolean {
  if (isActivityMessage(message.messageType) || !isOutboundMessage(message.direction)) return false;
  const status = (message.status ?? '').toLowerCase();
  return status === 'failed' || status === 'undelivered';
}

/** Human-readable delivery label for outbound messages. */
export function formatDeliveryStatus(status?: string): string | undefined {
  if (!status) return undefined;
  const s = status.toLowerCase();
  const map: Record<string, string> = {
    sent: 'Sent',
    delivered: 'Delivered',
    read: 'Read',
    opened: 'Opened',
    pending: 'Pending',
    scheduled: 'Scheduled',
    failed: 'Failed',
    undelivered: 'Not delivered',
    connected: 'Connected',
  };
  return map[s] ?? status;
}

export function formatMessageChannelLabel(messageType?: string): string {
  const t = (messageType ?? 'SMS').toUpperCase();
  if (t.includes('EMAIL')) return 'Email';
  if (t.includes('SMS')) return 'SMS';
  if (t.includes('CALL')) return 'Call';
  if (t.includes('VOICEMAIL')) return 'Voicemail';
  if (t.includes('ACTIVITY')) return 'Activity';
  return t.length > 12 ? t.slice(0, 12) : t;
}

export function isActivityMessage(messageType?: string): boolean {
  return (messageType ?? '').toUpperCase().includes('ACTIVITY');
}

export function formatMessageMeta(message: ConversationMessage): string {
  const channel = formatMessageChannelLabel(message.messageType);
  const time = formatMessageTime(message.dateAdded);
  const delivery =
    !isActivityMessage(message.messageType) && isOutboundMessage(message.direction)
      ? formatDeliveryStatus(message.status)
      : undefined;
  const parts = [channel, time, delivery].filter(Boolean);
  return parts.join(' · ');
}

/** Channels the contact can receive on (SMS / Email). */
export function resolveSendChannels(
  contactPhone?: string,
  contactEmail?: string,
): MessageChannel[] {
  const channels: MessageChannel[] = [];
  if (canSendSms(contactPhone).ok) channels.push('SMS');
  if (canSendEmail(contactEmail).ok) channels.push('Email');
  return channels;
}

/** Pick a send channel that is valid for the contact, falling back when needed. */
export function resolveMessageChannel(
  preferred: MessageChannel,
  contactPhone?: string,
  contactEmail?: string,
): MessageChannel {
  const available = resolveSendChannels(contactPhone, contactEmail);
  if (available.length === 0) return preferred;
  if (available.includes(preferred)) return preferred;
  return available[0];
}

export function formatMessageTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** GSM-style segment estimate (160 chars per segment for basic Latin). */
export function smsSegmentInfo(text: string): { length: number; segments: number } {
  const length = text.length;
  const singleLimit = 160;
  const segments = length === 0 ? 0 : Math.ceil(length / singleLimit);
  return { length, segments };
}

export function canSendEmail(contactEmail?: string): { ok: boolean; reason?: string } {
  if (!contactEmail?.trim()) {
    return { ok: false, reason: 'This contact has no email on file. Add one in GHL or pick another contact.' };
  }
  return { ok: true };
}

export function isImageAttachmentUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|heic|bmp)(\?|$)/i.test(url) || /\/image\//i.test(url);
}

export function canSendSms(contactPhone?: string): { ok: boolean; reason?: string } {
  if (!contactPhone?.trim()) {
    return { ok: false, reason: 'This contact has no phone number. SMS cannot be sent until one is added in GHL.' };
  }
  return { ok: true };
}
