import type { ConversationMessage } from './conversations';
import { stripSmsComplianceFooter } from './smsCompliance';

export type ThreadRow =
  | { kind: 'day'; key: string; label: string }
  | {
      kind: 'message';
      key: string;
      message: ConversationMessage;
      pending?: boolean;
      failed?: boolean;
    };

function formatDay(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function sortMessagesChronologically(list: ConversationMessage[]): ConversationMessage[] {
  return list.slice().sort((a, b) => {
    const ta = new Date(a.dateAdded ?? 0).getTime();
    const tb = new Date(b.dateAdded ?? 0).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

/** Rows for an inverted FlatList: index 0 = newest message at the bottom. */
export function buildInvertedThreadRows(messages: ConversationMessage[]): ThreadRow[] {
  const sorted = sortMessagesChronologically(messages);
  const rows: ThreadRow[] = [];

  for (let i = sorted.length - 1; i >= 0; i--) {
    const message = sorted[i];
    const olderMsg = i > 0 ? sorted[i - 1] : null;
    const day = formatDay(message.dateAdded);
    const olderDay = olderMsg ? formatDay(olderMsg.dateAdded) : null;
    const pending = message.id.startsWith('pending-');
    const failed = message.id.startsWith('failed-');

    rows.push({ kind: 'message', key: message.id, message, pending, failed });

    if (day && (i === 0 || day !== olderDay)) {
      rows.push({ kind: 'day', key: `day-${day}-${message.id}`, label: day });
    }
  }

  return rows;
}

function isPendingOrFailed(message: ConversationMessage) {
  return message.id.startsWith('pending-') || message.id.startsWith('failed-');
}

function normalizeBodyForMatch(body: string): string {
  return stripSmsComplianceFooter(body).toLowerCase();
}

function isOptimisticDuplicate(
  pending: ConversationMessage,
  server: ConversationMessage,
): boolean {
  const pendingBody = (pending.body ?? '').trim();
  const serverBody = (server.body ?? '').trim();
  if (!pendingBody || !serverBody) return false;
  if (pending.direction !== server.direction) return false;

  const pendingNorm = normalizeBodyForMatch(pendingBody);
  const serverNorm = normalizeBodyForMatch(serverBody);
  const bodiesMatch =
    pendingNorm === serverNorm ||
    serverNorm.startsWith(pendingNorm) ||
    pendingBody === serverBody;
  if (!bodiesMatch) return false;

  const pendingTime = new Date(pending.dateAdded ?? 0).getTime();
  const serverTime = new Date(server.dateAdded ?? 0).getTime();
  return Math.abs(serverTime - pendingTime) < 120_000;
}

/** Merge a fresh API page with existing state without dropping paginated history. */
export function mergeThreadMessages(
  prev: ConversationMessage[],
  latestPage: ConversationMessage[],
): ConversationMessage[] {
  const map = new Map<string, ConversationMessage>();

  for (const message of prev) {
    if (!isPendingOrFailed(message)) {
      map.set(message.id, message);
    }
  }
  for (const message of latestPage) {
    map.set(message.id, message);
  }

  const merged = sortMessagesChronologically([...map.values()]);
  const pendingOrFailed = prev.filter(isPendingOrFailed);
  const keptPending = pendingOrFailed.filter((pending) => {
    if (pending.id.startsWith('failed-')) return true;
    return !latestPage.some((server) => isOptimisticDuplicate(pending, server));
  });

  return sortMessagesChronologically([...merged, ...keptPending]);
}

export function prependOlderMessages(
  prev: ConversationMessage[],
  olderPage: ConversationMessage[],
): ConversationMessage[] {
  const ids = new Set(prev.map((m) => m.id));
  const older = olderPage.filter((m) => !ids.has(m.id));
  return sortMessagesChronologically([...older, ...prev]);
}
