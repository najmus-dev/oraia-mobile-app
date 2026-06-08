import { config } from '../config';
import { getLocationGhlClient } from '../services/tokenVault';
import type { GhlTask } from '../services/ghl/types';

function userDisplayName(u: {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}) {
  const full = u.name?.trim();
  if (full) return full;
  const built = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  if (built) return built;
  return u.email?.trim() || 'Unknown';
}

export async function enrichTaskContext(
  locationId: string,
  tasks: GhlTask[],
): Promise<{ assigneeNames: Map<string, string>; contactNames: Map<string, string> }> {
  const ghl = getLocationGhlClient(locationId);
  const contactIds = [...new Set(tasks.map((t) => t.contactId).filter(Boolean) as string[])];

  const assigneeNames = new Map<string, string>();
  const contactNames = new Map<string, string>();

  try {
    const usersRes = await ghl.searchUsers({
      companyId: config.ghl.companyId,
      locationId,
      limit: 100,
    });
    for (const u of usersRes.users ?? []) {
      assigneeNames.set(u.id, userDisplayName(u));
    }
  } catch {
    // best-effort
  }

  await Promise.all(
    contactIds.slice(0, 30).map(async (id) => {
      try {
        const c = await ghl.getContact(id, locationId);
        const name =
          c.name?.trim() ||
          [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
          c.email ||
          c.phone ||
          'Contact';
        contactNames.set(id, name);
      } catch {
        // ignore missing contacts
      }
    }),
  );

  return { assigneeNames, contactNames };
}

export { userDisplayName };
