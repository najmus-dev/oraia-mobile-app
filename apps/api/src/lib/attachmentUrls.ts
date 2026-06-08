/** Normalize GHL upload response into attachment URL strings. */
export function extractUploadedAttachmentUrls(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  const candidates: unknown[] = [];

  if (Array.isArray(root.urls)) candidates.push(...root.urls);
  if (Array.isArray(root.attachments)) candidates.push(...root.attachments);

  const uploaded = root.uploadedFiles;
  if (Array.isArray(uploaded)) candidates.push(...uploaded);
  else if (uploaded && typeof uploaded === 'object') {
    for (const value of Object.values(uploaded as Record<string, unknown>)) {
      if (typeof value === 'string') candidates.push(value);
      else if (Array.isArray(value)) candidates.push(...value);
      else if (value && typeof value === 'object') {
        const url = (value as { url?: string }).url;
        if (url) candidates.push(url);
      }
    }
  }

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of candidates) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed.startsWith('http') || seen.has(trimmed)) continue;
    seen.add(trimmed);
    urls.push(trimmed);
  }
  return urls;
}
