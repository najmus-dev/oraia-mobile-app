export type LocationItem = {
  id: string;
  name: string;
  displayName?: string;
  address?: string;
  fullAddress?: string;
  mainAddress?: string;
  logoUrl?: string;
  isInstalled?: boolean;
};

export type LocationsResponse = {
  locations: LocationItem[];
  count: number;
};

export function locationItemName(item: LocationItem): string {
  return item.displayName?.trim() || item.name?.trim() || 'Unnamed';
}

export function locationItemAddress(item: LocationItem): string {
  return (
    item.fullAddress?.trim() ||
    item.mainAddress?.trim() ||
    item.address?.trim() ||
    ''
  );
}

export function matchesLocationQuery(item: LocationItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    locationItemName(item),
    locationItemAddress(item),
    item.id,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}
