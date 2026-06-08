/** Display label for a sub-account (prefer API displayName). */
export function locationDisplayName(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed || 'Select location';
}

export function locationInitials(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function isAgencyBrandLocation(name?: string | null): boolean {
  const n = name?.trim().toLowerCase() ?? '';
  return n.includes('oraia crm') || n === 'oraia';
}
