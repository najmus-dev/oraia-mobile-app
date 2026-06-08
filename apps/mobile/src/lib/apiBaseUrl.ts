export function normalizeApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Pick API host on cold start (locked build URL wins over SecureStore). */
export function resolveHydratedApiBaseUrl(
  stored?: string | null,
  configured?: string | null,
  devDefault?: string,
): string {
  if (configured?.trim()) return normalizeApiBaseUrl(configured);
  if (stored?.trim() && !shouldReplaceStoredApiUrl(stored, devDefault)) {
    return normalizeApiBaseUrl(stored);
  }
  return devDefault ?? fallbackDevApiBaseUrl();
}

/** True when a stored emulator-only URL should be replaced on a physical device. */
export function shouldReplaceStoredApiUrl(stored: string, devDefault?: string): boolean {
  if (!stored.includes('10.0.2.2')) return false;
  const resolved = devDefault ?? fallbackDevApiBaseUrl();
  return resolved !== stored && !resolved.includes('10.0.2.2');
}

/** Last-resort dev default when no host-specific resolver is provided. */
export function fallbackDevApiBaseUrl(): string {
  return 'http://localhost:3000';
}
