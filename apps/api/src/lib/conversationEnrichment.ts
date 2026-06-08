import { config } from '../config';
import { getLocationGhlClient } from '../services/tokenVault';
import { userDisplayName } from './taskEnrichment';

export async function enrichConversationAssignees(
  locationId: string,
  assignedToIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(assignedToIds.filter(Boolean))];
  if (unique.length === 0) return names;

  try {
    const ghl = getLocationGhlClient(locationId);
    const usersRes = await ghl.searchUsers({
      companyId: config.ghl.companyId,
      locationId,
      limit: 100,
    });
    for (const u of usersRes.users ?? []) {
      names.set(u.id, userDisplayName(u));
    }
  } catch {
    // best-effort assignee names
  }

  return names;
}
