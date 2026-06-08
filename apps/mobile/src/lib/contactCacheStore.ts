export type ContactChannels = {
  phone?: string;
  email?: string;
};

const cache = new Map<string, ContactChannels>();

export function getCachedContactChannels(contactId: string): ContactChannels | undefined {
  const hit = cache.get(contactId.trim());
  return hit ? { ...hit } : undefined;
}

export function setCachedContactChannels(contactId: string, channels: ContactChannels): void {
  const id = contactId.trim();
  if (!id) return;
  cache.set(id, {
    phone: channels.phone?.trim() || undefined,
    email: channels.email?.trim() || undefined,
  });
}
