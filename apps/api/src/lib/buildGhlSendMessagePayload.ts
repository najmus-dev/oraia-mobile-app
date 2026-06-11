/** Build GHL POST /conversations/messages body from our BFF request. */
export function buildGhlSendMessagePayload(body: Record<string, unknown>): Record<string, unknown> {
  const messageText = typeof body.message === 'string' ? body.message.trim() : '';
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
    : [];

  const payload: Record<string, unknown> = {
    type: body.type,
    contactId: body.contactId,
    message: messageText || ' ',
  };

  const optionalStringFields = [
    'conversationId',
    'conversationProviderId',
    'fromNumber',
    'toNumber',
    'subject',
    'html',
    'emailFrom',
    'emailTo',
    'replyMessageId',
  ] as const;

  for (const key of optionalStringFields) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) {
      payload[key] = value.trim();
    }
  }

  if (attachments.length > 0) payload.attachments = attachments;

  return payload;
}
