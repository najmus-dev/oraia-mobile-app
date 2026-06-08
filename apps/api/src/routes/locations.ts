import { Router } from 'express';
import { config } from '../config';
import { logger } from '../lib/logger';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { getGhlClient } from '../services/tokenVault';
import type { GhlLocation } from '../services/ghl/types';

export const locationsRouter = Router();

function toMainAddress(input?: string): string | undefined {
  if (!input?.trim()) return undefined;
  const segments = input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (segments.length >= 2) return segments[1];
  return segments[0];
}

function normalizeLogoUrl(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const url = raw.trim();
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return undefined;
}

locationsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const ghl = getGhlClient();
    const { locations: installed } = await ghl.listInstalledLocations(
      config.ghl.companyId,
      config.ghl.appId,
    );

    let list = (installed ?? []).filter((loc) => loc.isInstalled);
    let searchable: GhlLocation[] = [];

    try {
      const search = await ghl.searchLocations({ limit: 500 });
      searchable = search.locations ?? [];
    } catch (searchErr) {
      logger.warn('Unable to enrich locations from search endpoint', {
        error: searchErr instanceof Error ? searchErr.message : String(searchErr),
      });
    }
    const searchById = new Map(searchable.map((loc) => [loc.id, loc]));

    if (user.role === 'staff') {
      const allowed = new Set(user.allowedLocationIds);
      list = list.filter((loc) => allowed.has(loc._id));
    }

    if (list.length === 0) {
      logger.warn(
        'No marketplace-installed locations. In GHL agency settings, open the app and install it on each sub-account you need.',
        { companyId: user.companyId, appId: config.ghl.appId },
      );
    }

    res.json({
      locations: list.map((loc) => ({
        ...(() => {
          const enriched = searchById.get(loc._id);
          const addr =
            enriched?.address1 ||
            enriched?.address ||
            loc.address;
          const cityState = [enriched?.city, enriched?.state].filter(Boolean).join(', ');
          const suffix = [cityState, enriched?.country].filter(Boolean).join(', ');
          const fullAddress = [addr, suffix].filter(Boolean).join(', ');
          const logoUrl =
            enriched?.logoUrl ||
            enriched?.locationLogoUrl ||
            enriched?.logo_url ||
            enriched?.businessLogoUrl ||
            enriched?.logo ||
            enriched?.imageUrl ||
            enriched?.profilePhoto ||
            enriched?.photoUrl ||
            loc.logoUrl ||
            loc.locationLogoUrl ||
            loc.logo_url ||
            loc.businessLogoUrl ||
            loc.logo ||
            loc.imageUrl;
          const mainAddress = enriched?.city || toMainAddress(fullAddress || loc.address);
          return {
            displayName: enriched?.name?.trim() || loc.name,
            fullAddress: fullAddress || loc.address,
            mainAddress: mainAddress || undefined,
            logoUrl: normalizeLogoUrl(logoUrl),
            timezone: enriched?.timezone,
          };
        })(),
        id: loc._id,
        name: loc.name,
        address: loc.address,
        isInstalled: loc.isInstalled,
      })),
      count: list.length,
    });
  } catch (err) {
    next(err);
  }
});
