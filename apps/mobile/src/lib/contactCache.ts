import { api, withAuthHeaders, type ApiAuth } from './api';
import type { ContactResponse } from './contacts';
import {
  getCachedContactChannels,
  setCachedContactChannels,
  type ContactChannels,
} from './contactCacheStore';

export type { ContactChannels };
export { getCachedContactChannels, setCachedContactChannels };

/** Best-effort parallel prefetch so thread open has phone/email immediately. */
export async function prefetchContactChannels(
  auth: ApiAuth,
  contactIds: string[],
  max = 20,
): Promise<void> {
  const unique = [...new Set(contactIds.map((id) => id.trim()).filter(Boolean))].filter(
    (id) => !getCachedContactChannels(id),
  );
  const batch = unique.slice(0, max);
  await Promise.all(
    batch.map(async (contactId) => {
      try {
        const res = await api.getJson<ContactResponse>(
          `/api/contacts/${encodeURIComponent(contactId)}`,
          { headers: withAuthHeaders(auth) },
        );
        setCachedContactChannels(contactId, {
          phone: res.contact?.phone,
          email: res.contact?.email,
        });
      } catch {
        /* optional */
      }
    }),
  );
}
