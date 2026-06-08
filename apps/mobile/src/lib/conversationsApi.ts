import { api, withAuthHeaders, type ApiAuth } from './api';
import type { Conversation, ConversationLookupResponse, SmsPhoneNumber } from './conversations';

export type UploadAttachmentResponse = { urls: string[] };

export async function lookupConversationForContact(
  auth: ApiAuth,
  contactId: string,
): Promise<Conversation | null> {
  const res = await api.getJson<ConversationLookupResponse>(
    `/api/conversations/lookup?contactId=${encodeURIComponent(contactId)}`,
    { headers: withAuthHeaders(auth) },
  );
  return res.conversation ?? null;
}

export async function fetchSmsPhoneNumbers(
  auth: ApiAuth,
  search?: string,
): Promise<SmsPhoneNumber[]> {
  const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  const res = await api.getJson<{ numbers: SmsPhoneNumber[] }>(
    `/api/conversations/phone-numbers${qs}`,
    { headers: withAuthHeaders(auth) },
  );
  return res.numbers ?? [];
}

/** Mark thread read in GHL (unreadCount → 0). */
export async function markConversationRead(auth: ApiAuth, conversationId: string): Promise<void> {
  await api.putJson(
    `/api/conversations/${encodeURIComponent(conversationId)}`,
    { unreadCount: 0 },
    { headers: withAuthHeaders(auth) },
  );
}

/** Fire-and-forget mark read (e.g. on thread open). */
export function markConversationReadBestEffort(auth: ApiAuth, conversationId: string): void {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  markConversationRead(auth, conversationId).catch(() => {});
}

export async function markConversationUnread(
  auth: ApiAuth,
  conversationId: string,
): Promise<void> {
  await api.putJson(
    `/api/conversations/${encodeURIComponent(conversationId)}`,
    { unreadCount: 1 },
    { headers: withAuthHeaders(auth) },
  );
}

export async function uploadMessageAttachment(
  auth: ApiAuth,
  params: { contactId: string; conversationId?: string },
  file: { uri: string; name: string; type: string },
): Promise<string[]> {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  form.append('contactId', params.contactId);
  if (params.conversationId) form.append('conversationId', params.conversationId);

  const res = await fetch(`${api.getBaseUrl()}/api/conversations/attachments`, {
    method: 'POST',
    headers: withAuthHeaders(auth),
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    const { parseApiError } = await import('./errors');
    throw parseApiError(text || `HTTP ${res.status}`, res.status);
  }
  const data = text ? (JSON.parse(text) as UploadAttachmentResponse) : { urls: [] };
  return data.urls ?? [];
}

export async function setConversationStarred(
  auth: ApiAuth,
  conversationId: string,
  starred: boolean,
): Promise<void> {
  await api.putJson(
    `/api/conversations/${encodeURIComponent(conversationId)}`,
    { starred },
    { headers: withAuthHeaders(auth) },
  );
}
