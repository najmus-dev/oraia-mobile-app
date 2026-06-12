/** One notification row per unread conversation — matches GHL mobile behavior. */
export function conversationNotificationDedupeKey(conversationId: string): string {
  return `conversation:unread:${conversationId.trim()}`;
}

/** Coerce GHL task/event timestamps (may be unknown due to index signatures). */
export function coerceNotificationOccurredAt(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

export function firstNotificationOccurredAt(...values: unknown[]): string | undefined {
  for (const value of values) {
    const coerced = coerceNotificationOccurredAt(value);
    if (coerced) return coerced;
  }
  return undefined;
}

export function resolveNotificationOccurredAt(
  primary?: string | Date | null,
  fallback?: string | Date | null,
): Date {
  for (const candidate of [primary, fallback]) {
    if (!candidate) continue;
    const date = candidate instanceof Date ? candidate : new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}
