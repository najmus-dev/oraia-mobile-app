import { Router } from 'express';
import { AppError } from '../lib/errors';
import {
  parseFollowerIdsFromOpportunity,
  parseOpportunityExtras,
  syncOpportunityContactFields,
  syncOpportunityFollowers,
  type OpportunitySyncWarning,
} from '../lib/opportunityExtras';
import { validateOpportunityCreateBody, validateOpportunityUpdateBody } from '../lib/opportunityValidation';
import { param } from '../lib/params';
import { locationDelete, locationGet, locationPost, locationPut } from '../middleware/locationRoute';
import { getLocationGhlClient } from '../services/tokenVault';

export const opportunitiesRouter = Router();

function mapOpportunity(o: {
  id?: string;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  monetaryValue?: number;
  contactId?: string;
  dateAdded?: string;
  source?: string;
  assignedTo?: string;
  companyName?: string;
  followers?: unknown;
}) {
  return {
    id: o.id,
    name: o.name,
    pipelineId: o.pipelineId,
    pipelineStageId: o.pipelineStageId,
    status: o.status,
    monetaryValue: o.monetaryValue,
    contactId: o.contactId,
    dateAdded: o.dateAdded,
    source: o.source,
    assignedTo: o.assignedTo,
    companyName: o.companyName,
    followerIds: parseFollowerIdsFromOpportunity(o),
  };
}

async function applyOpportunityExtras(input: {
  ghl: ReturnType<typeof getLocationGhlClient>;
  locationId: string;
  opportunityId: string;
  contactId: string;
  extras: ReturnType<typeof parseOpportunityExtras>;
  previousFollowerIds?: string[];
}): Promise<OpportunitySyncWarning[]> {
  const warnings: OpportunitySyncWarning[] = [];
  const { ghl, locationId, opportunityId, contactId, extras, previousFollowerIds = [] } = input;

  if (extras.followerIds !== undefined) {
    const warning = await syncOpportunityFollowers(
      ghl,
      opportunityId,
      locationId,
      previousFollowerIds,
      extras.followerIds,
    );
    if (warning) warnings.push(warning);
  }

  if (extras.contactTags !== undefined || extras.contactCompanyName !== undefined) {
    const warning = await syncOpportunityContactFields(ghl, contactId, locationId, {
      contactTags: extras.contactTags,
      contactCompanyName: extras.contactCompanyName,
    });
    if (warning) warnings.push(warning);
  }

  return warnings;
}

function unwrapOpportunity(raw: unknown): ReturnType<typeof mapOpportunity> {
  if (raw && typeof raw === 'object' && 'opportunity' in raw) {
    return mapOpportunity((raw as { opportunity: Parameters<typeof mapOpportunity>[0] }).opportunity);
  }
  return mapOpportunity(raw as Parameters<typeof mapOpportunity>[0]);
}

locationGet(opportunitiesRouter, '/pipelines', async (req, res) => {
  const locationId = req.locationId!;
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.getPipelines(locationId);
  res.json({ locationId, pipelines: data.pipelines ?? [] });
});

locationGet(opportunitiesRouter, '/', async (req, res) => {
  const locationId = req.locationId!;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const pipelineId = typeof req.query.pipelineId === 'string' ? req.query.pipelineId : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : undefined;
  const contactId =
    typeof req.query.contactId === 'string' && req.query.contactId.trim()
      ? req.query.contactId.trim()
      : undefined;
  const ghl = getLocationGhlClient(locationId);
  const data = await ghl.searchOpportunities(locationId, {
    limit,
    pipelineId,
    status,
    q: query || undefined,
    contactId,
  });
  let opportunities = data.opportunities ?? [];
  if (contactId) {
    opportunities = opportunities.filter((o) => o.contactId === contactId);
  }
  res.json({
    locationId,
    opportunities: opportunities.map((o) => mapOpportunity(o)),
    meta: data.meta,
  });
});

locationGet(opportunitiesRouter, '/:opportunityId', async (req, res) => {
  const locationId = req.locationId!;
  const opportunityId = param(req.params, 'opportunityId');
  const ghl = getLocationGhlClient(locationId);
  const opportunity = await ghl.getOpportunity(opportunityId, locationId);
  res.json({ locationId, opportunity: unwrapOpportunity(opportunity) });
});

locationPost(opportunitiesRouter, '/', async (req, res) => {
  const locationId = req.locationId!;
  const extras = parseOpportunityExtras(req.body);
  let body: Record<string, unknown>;
  try {
    body = validateOpportunityCreateBody(req.body) as Record<string, unknown>;
  } catch (e) {
    throw new AppError(
      400,
      e instanceof Error ? e.message : 'Invalid opportunity body',
      'VALIDATION_ERROR',
    );
  }
  const ghl = getLocationGhlClient(locationId);
  const created = await ghl.createOpportunity(locationId, body);
  const opportunity = unwrapOpportunity(created);
  const opportunityId = opportunity.id?.trim();
  const warnings =
    opportunityId &&
    (extras.followerIds !== undefined ||
      extras.contactTags !== undefined ||
      extras.contactCompanyName !== undefined)
      ? await applyOpportunityExtras({
          ghl,
          locationId,
          opportunityId,
          contactId: body.contactId as string,
          extras,
        })
      : [];
  res.status(201).json({
    locationId,
    opportunity,
    ...(warnings.length ? { warnings } : {}),
  });
});

locationPut(opportunitiesRouter, '/:opportunityId', async (req, res) => {
  const locationId = req.locationId!;
  const opportunityId = param(req.params, 'opportunityId');
  const extras = parseOpportunityExtras(req.body);
  let body: Record<string, unknown>;
  try {
    body = validateOpportunityUpdateBody(req.body);
  } catch (e) {
    throw new AppError(
      400,
      e instanceof Error ? e.message : 'Invalid opportunity body',
      'VALIDATION_ERROR',
    );
  }
  const ghl = getLocationGhlClient(locationId);
  let previousFollowerIds: string[] = [];
  if (extras.followerIds !== undefined) {
    const current = await ghl.getOpportunity(opportunityId, locationId);
    previousFollowerIds = parseFollowerIdsFromOpportunity(current);
  }
  const result =
    Object.keys(body).length > 0
      ? await ghl.updateOpportunity(opportunityId, locationId, body)
      : await ghl.getOpportunity(opportunityId, locationId);
  const opportunity = unwrapOpportunity(result);
  const contactId =
    (typeof body.contactId === 'string' && body.contactId.trim()) ||
    opportunity.contactId?.trim() ||
    '';
  const warnings =
    extras.followerIds !== undefined ||
      extras.contactTags !== undefined ||
      extras.contactCompanyName !== undefined
      ? await applyOpportunityExtras({
          ghl,
          locationId,
          opportunityId,
          contactId,
          extras,
          previousFollowerIds,
        })
      : [];
  res.json({
    locationId,
    opportunity,
    ...(warnings.length ? { warnings } : {}),
  });
});

locationDelete(opportunitiesRouter, '/:opportunityId', async (req, res) => {
  const locationId = req.locationId!;
  const opportunityId = param(req.params, 'opportunityId');
  const ghl = getLocationGhlClient(locationId);
  await ghl.deleteOpportunity(opportunityId, locationId);
  res.status(204).send();
});

function readFollowerIds(body: unknown): string[] {
  if (!body || typeof body !== 'object') {
    throw new AppError(400, 'Provide followers array', 'VALIDATION_ERROR');
  }
  const followers = (body as { followers?: unknown }).followers;
  if (!Array.isArray(followers)) {
    throw new AppError(400, 'Provide followers array', 'VALIDATION_ERROR');
  }
  const ids = followers.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  if (ids.length === 0) {
    throw new AppError(400, 'Provide at least one follower id', 'VALIDATION_ERROR');
  }
  return ids;
}

locationPost(opportunitiesRouter, '/:opportunityId/followers', async (req, res) => {
  const locationId = req.locationId!;
  const opportunityId = param(req.params, 'opportunityId');
  const followers = readFollowerIds(req.body);
  const ghl = getLocationGhlClient(locationId);
  const result = await ghl.addOpportunityFollowers(opportunityId, locationId, followers);
  res.status(201).json({ locationId, opportunityId, result });
});

locationDelete(opportunitiesRouter, '/:opportunityId/followers', async (req, res) => {
  const locationId = req.locationId!;
  const opportunityId = param(req.params, 'opportunityId');
  const followers = readFollowerIds(req.body);
  const ghl = getLocationGhlClient(locationId);
  const result = await ghl.removeOpportunityFollowers(opportunityId, locationId, followers);
  res.json({ locationId, opportunityId, result });
});
