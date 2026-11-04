export type PushNavigationTarget =
  | { type: 'conversation'; conversationId: string; contactId?: string }
  | { type: 'task'; taskId: string; contactId?: string }
  | { type: 'appointment'; appointmentId: string; contactId?: string };

function readString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function extractPushNavigationTarget(
  data: Record<string, unknown> | undefined,
): PushNavigationTarget | null {
  if (!data) return null;
  const type = readString(data, 'type');

  if (type === 'conversation') {
    const conversationId = readString(data, 'conversationId');
    if (!conversationId) return null;
    return {
      type: 'conversation',
      conversationId,
      contactId: readString(data, 'contactId'),
    };
  }

  if (type === 'task') {
    const taskId = readString(data, 'taskId');
    if (!taskId) return null;
    return {
      type: 'task',
      taskId,
      contactId: readString(data, 'contactId'),
    };
  }

  if (type === 'appointment') {
    const appointmentId = readString(data, 'appointmentId');
    if (!appointmentId) return null;
    return {
      type: 'appointment',
      appointmentId,
      contactId: readString(data, 'contactId'),
    };
  }

  return null;
}

/** @deprecated Use extractPushNavigationTarget */
export function extractConversationPushData(
  data: Record<string, unknown> | undefined,
): { conversationId: string; contactId?: string } | null {
  const target = extractPushNavigationTarget(data);
  if (!target || target.type !== 'conversation') return null;
  return { conversationId: target.conversationId, contactId: target.contactId };
}
