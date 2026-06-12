import type { GhlClient } from '../services/ghl/ghlClient';

export type OpportunityExtras = {
  followerIds?: string[];
  contactTags?: string[];
  contactCompanyName?: string;
};

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseOpportunityExtras(body: unknown): OpportunityExtras {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  const extras: OpportunityExtras = {};

  if ('followerIds' in record) {
    extras.followerIds = readStringArray(record.followerIds) ?? [];
  }
  if ('contactTags' in record) {
    if (!Array.isArray(record.contactTags)) {
      extras.contactTags = [];
    } else {
      extras.contactTags = record.contactTags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }
  }
  if ('businessName' in record) {
    extras.contactCompanyName =
      typeof record.businessName === 'string' ? record.businessName.trim() : '';
  }

  return extras;
}

export function parseFollowerIdsFromOpportunity(raw: unknown): string[] {
  const root =
    raw && typeof raw === 'object' && 'opportunity' in raw
      ? (raw as { opportunity: unknown }).opportunity
      : raw;
  if (!root || typeof root !== 'object') return [];
  const followers = (root as { followers?: unknown }).followers;
  if (!Array.isArray(followers)) return [];
  return followers
    .map((entry) => {
      if (typeof entry === 'string' && entry.trim()) return entry.trim();
      if (entry && typeof entry === 'object' && typeof (entry as { id?: string }).id === 'string') {
        return (entry as { id: string }).id;
      }
      return null;
    })
    .filter((id): id is string => Boolean(id));
}

export function followerSyncDiff(previous: string[], next: string[]): {
  toAdd: string[];
  toRemove: string[];
} {
  const prev = new Set(previous);
  const nxt = new Set(next);
  return {
    toAdd: next.filter((id) => !prev.has(id)),
    toRemove: previous.filter((id) => !nxt.has(id)),
  };
}

export type OpportunitySyncWarning = {
  field: 'followers' | 'contactTags' | 'businessName';
  message: string;
};

export async function syncOpportunityFollowers(
  ghl: GhlClient,
  opportunityId: string,
  locationId: string,
  previousFollowerIds: string[],
  nextFollowerIds: string[],
): Promise<OpportunitySyncWarning | null> {
  const { toAdd, toRemove } = followerSyncDiff(previousFollowerIds, nextFollowerIds);
  if (!toAdd.length && !toRemove.length) return null;
  try {
    if (toAdd.length) {
      await ghl.addOpportunityFollowers(opportunityId, locationId, toAdd);
    }
    if (toRemove.length) {
      await ghl.removeOpportunityFollowers(opportunityId, locationId, toRemove);
    }
    return null;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not update followers';
    return { field: 'followers', message };
  }
}

export async function syncOpportunityContactFields(
  ghl: GhlClient,
  contactId: string,
  locationId: string,
  fields: { contactTags?: string[]; contactCompanyName?: string },
): Promise<OpportunitySyncWarning | null> {
  const id = contactId.trim();
  if (!id) return null;
  const body: Record<string, unknown> = {};
  if (fields.contactTags !== undefined) body.tags = fields.contactTags;
  if (fields.contactCompanyName !== undefined) body.companyName = fields.contactCompanyName;
  if (Object.keys(body).length === 0) return null;
  try {
    await ghl.updateContact(id, locationId, body);
    return null;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not update contact';
    if (fields.contactTags !== undefined && fields.contactCompanyName !== undefined) {
      return { field: 'contactTags', message };
    }
    if (fields.contactCompanyName !== undefined) {
      return { field: 'businessName', message };
    }
    return { field: 'contactTags', message };
  }
}
