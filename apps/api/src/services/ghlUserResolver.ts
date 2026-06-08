import { config } from '../config';
import { logger } from '../lib/logger';
import { User, type UserDocument } from '../models/User';
import type { GhlUser } from './ghl/types';
import { getGhlClient, getLocationGhlClient } from './tokenVault';

export function matchGhlUserByEmail(users: GhlUser[], email: string): GhlUser | undefined {
  const normalized = email.toLowerCase().trim();
  return users.find((u) => u.email?.toLowerCase().trim() === normalized);
}

async function searchUsersAtLocation(locationId: string, email: string): Promise<GhlUser[]> {
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.searchUsers({
    companyId: config.ghl.companyId,
    locationId,
    query: email,
    limit: 20,
  });
  return data.users ?? [];
}

async function persistGhlUserId(user: UserDocument, ghlUserId: string): Promise<void> {
  const companyId = user.companyId?.trim() || config.ghl.companyId;
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        ghlUserId,
        ...(user.companyId?.trim() ? {} : { companyId }),
      },
    },
    { runValidators: false },
  );
  user.ghlUserId = ghlUserId;
  if (!user.companyId?.trim()) {
    user.companyId = companyId;
  }
}

/** Resolve and persist the GHL user id for My Inbox / assignee filters. Never throws. */
export async function resolveAndPersistGhlUserId(
  user: UserDocument,
  locationId?: string,
): Promise<string | undefined> {
  const existing = user.ghlUserId?.trim();
  if (existing) return existing;

  const email = user.email.toLowerCase().trim();
  let match: GhlUser | undefined;

  if (locationId) {
    try {
      const atLocation = await searchUsersAtLocation(locationId, email);
      match = matchGhlUserByEmail(atLocation, email);
    } catch (e) {
      logger.warn('GHL location user search failed', {
        email,
        locationId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!match?.id) {
    try {
      const ghl = getGhlClient();
      const filtered = await ghl.filterUsersByEmail(config.ghl.companyId, [email]);
      match = matchGhlUserByEmail(filtered.users ?? [], email);
    } catch (e) {
      logger.warn('GHL filterUsersByEmail failed', {
        email,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!match?.id) {
    try {
      const ghl = getGhlClient();
      const searched = await ghl.searchUsers({
        companyId: config.ghl.companyId,
        query: email,
        limit: 20,
      });
      match = matchGhlUserByEmail(searched.users ?? [], email);
    } catch (e) {
      logger.warn('GHL searchUsers query failed', {
        email,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!match?.id?.trim()) {
    logger.warn('No GHL user matched ORAIA login email', { email, locationId });
    return undefined;
  }

  const ghlUserId = match.id.trim();
  try {
    await persistGhlUserId(user, ghlUserId);
  } catch (e) {
    logger.warn('Could not persist ghlUserId', {
      email,
      ghlUserId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return ghlUserId;
}
