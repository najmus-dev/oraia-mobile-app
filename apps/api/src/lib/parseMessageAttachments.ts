export function parseMessageAttachments(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const urls: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim().startsWith('http')) {
      urls.push(item.trim());
      continue;
    }
    if (item && typeof item === 'object') {
      const url =
        typeof (item as { url?: string }).url === 'string'
          ? (item as { url: string }).url
          : typeof (item as { attachmentUrl?: string }).attachmentUrl === 'string'
            ? (item as { attachmentUrl: string }).attachmentUrl
            : undefined;
      if (url?.startsWith('http')) urls.push(url.trim());
    }
  }
  return urls;
}
