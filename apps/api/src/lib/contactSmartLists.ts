export type SmartListSource = 'all' | 'smartList' | 'tag';

export type NormalizedSmartList = {
  id: string;
  name: string;
  source: SmartListSource;
};

export function parseSmartListRecords(raw: unknown): NormalizedSmartList[] {
  if (!raw) return [];
  const rows = Array.isArray(raw)
    ? raw
    : typeof raw === 'object'
      ? ((raw as Record<string, unknown>).smartLists ??
          (raw as Record<string, unknown>).lists ??
          (raw as Record<string, unknown>).items ??
          (raw as Record<string, unknown>).data ??
          [])
      : [];

  if (!Array.isArray(rows)) return [];

  const out: NormalizedSmartList[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const id = String(record.id ?? record._id ?? record.smartListId ?? '').trim();
    const name = String(record.name ?? record.title ?? record.label ?? '').trim();
    if (!id || !name) continue;
    out.push({ id: `smart:${id}`, name, source: 'smartList' });
  }
  return out;
}

export function parseTagRecords(
  tags: Array<{ id: string; name: string }>,
): NormalizedSmartList[] {
  return tags
    .filter((t) => t.id && t.name?.trim())
    .map((t) => ({
      id: `tag:${t.id}`,
      name: t.name.trim(),
      source: 'tag' as const,
    }));
}

export function decodeSmartListFilter(filterId: string): {
  source: SmartListSource;
  value?: string;
} {
  if (!filterId || filterId === 'all') return { source: 'all' };
  if (filterId.startsWith('smart:')) {
    return { source: 'smartList', value: filterId.slice('smart:'.length) };
  }
  if (filterId.startsWith('tag:')) {
    return { source: 'tag', value: filterId.slice('tag:'.length) };
  }
  return { source: 'all' };
}
