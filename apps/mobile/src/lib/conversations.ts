import { formatMessageBodyForDisplay } from './smsCompliance';

export type MessageChannel = 'SMS' | 'Email';

export type InboxFilter = 'all' | 'recents' | 'unread' | 'starred';

export type InboxTab = 'team' | 'mine';

export type Conversation = {
  id: string;
  contactId?: string;
  contactName?: string;
  lastMessageBody?: string;
  lastMessageDate?: string;
  lastMessageType?: string;
  unreadCount?: number;
  starred?: boolean;
  assignedTo?: string;
  assignedToName?: string;
};

export type ConversationsListResponse = {
  conversations: Conversation[];
  total?: number;
  nextStartAfterDate?: string;
};

export type ConversationLookupResponse = {
  conversation: Conversation | null;
};

export type ConversationMessage = {
  id: string;
  body?: string;
  direction?: string;
  status?: string;
  messageType?: string;
  dateAdded?: string;
  contactId?: string;
  attachments?: string[];
};

export type SmsPhoneNumber = {
  id: string;
  phoneNumber: string;
  friendlyName?: string;
  isDefault?: boolean;
  assignedTo?: string;
  label?: string;
};

export type SendMessageResponse = {
  conversationId?: string;
  messageId?: string;
};

export function resolveConversationContactId(
  explicit?: string,
  messages?: Array<{ contactId?: string }>,
): string | undefined {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  return messages?.find((m) => m.contactId?.trim())?.contactId?.trim();
}

/** GHL may return lastMessageDate as ISO string or epoch ms — normalize for pagination. */
export function normalizeConversationCursor(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return undefined;
}

/** Query string for GET /api/conversations (without leading `?`). */
export function buildConversationsQuery(params: {
  limit?: number;
  query?: string;
  filter?: InboxFilter;
  assignedTo?: string;
  startAfterDate?: string | number;
}): string {
  const limit = Math.min(Math.max(params.limit ?? 60, 1), 100);
  const parts = [`limit=${limit}`];
  const q = params.query?.trim();
  if (q) parts.push(`query=${encodeURIComponent(q)}`);
  if (params.filter === 'unread') parts.push('status=unread');
  else if (params.filter === 'starred') parts.push('status=starred');
  else if (params.filter === 'recents') parts.push('status=recents');
  if (params.assignedTo?.trim()) {
    parts.push(`assignedTo=${encodeURIComponent(params.assignedTo.trim())}`);
  }
  const cursor = normalizeConversationCursor(params.startAfterDate);
  if (cursor) {
    parts.push(`startAfterDate=${encodeURIComponent(cursor)}`);
  }
  return parts.join('&');
}

export function conversationNameInitials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

export function conversationChannelKind(lastMessageType?: string): 'sms' | 'email' | 'call' | 'other' {
  const t = (lastMessageType ?? '').toUpperCase();
  if (t.includes('EMAIL')) return 'email';
  if (t.includes('CALL') || t.includes('VOICEMAIL') || t.includes('IVR')) return 'call';
  if (t.includes('SMS') || t.includes('WHATSAPP') || t.includes('CHAT')) return 'sms';
  return 'other';
}

export function formatConversationPreview(item: Conversation): string {
  const kind = conversationChannelKind(item.lastMessageType);
  if (kind === 'call') return 'Call';
  const body = formatMessageBodyForDisplay(item.lastMessageBody);
  if (body) return body;
  if (kind === 'email') return 'Email';
  if (kind === 'sms') return 'Text message';
  return 'No messages yet';
}

export function formatConversationWhen(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  } catch {
    return '';
  }
}

export function channelPlaceholder(channel: MessageChannel): string {
  return channel === 'Email' ? 'Type and send via Email' : 'Type and send via SMS';
}

export function buildSendMessagePayload(params: {
  channel: MessageChannel;
  contactId: string;
  message: string;
  conversationId?: string;
  subject?: string;
  fromNumber?: string;
  toNumber?: string;
  attachments?: string[];
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: params.channel,
    contactId: params.contactId,
    message: params.message,
  };
  if (params.conversationId?.trim()) body.conversationId = params.conversationId.trim();
  if (params.attachments?.length) body.attachments = params.attachments;
  if (params.channel === 'Email') {
    const subject = params.subject?.trim() || 'Message from ORAIA';
    body.subject = subject;
    body.html = `<p>${escapeHtml(params.message).replace(/\n/g, '<br/>')}</p>`;
  }
  if (params.fromNumber?.trim()) body.fromNumber = params.fromNumber.trim();
  if (params.toNumber?.trim()) body.toNumber = params.toNumber.trim();
  return body;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
