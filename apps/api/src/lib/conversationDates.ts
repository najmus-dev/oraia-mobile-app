/** GHL conversation timestamps may arrive as ISO strings or epoch seconds/ms. */
export function normalizeConversationDate(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return undefined;
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) return normalizeConversationDate(numeric);
    }
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return trimmed;
  }
  return undefined;
}
