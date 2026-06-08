import { Router } from 'express';
import { AppError } from '../lib/errors';
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
  };
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
  res.status(201).json({ locationId, opportunity: unwrapOpportunity(created) });
});

locationPut(opportunitiesRouter, '/:opportunityId', async (req, res) => {
  const locationId = req.locationId!;
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
  const result = await ghl.updateOpportunity(
    param(req.params, 'opportunityId'),
    locationId,
    body,
  );
  res.json({ locationId, opportunity: unwrapOpportunity(result) });
});

locationDelete(opportunitiesRouter, '/:opportunityId', async (req, res) => {
  const locationId = req.locationId!;
  const opportunityId = param(req.params, 'opportunityId');
  const ghl = getLocationGhlClient(locationId);
  await ghl.deleteOpportunity(opportunityId, locationId);
  res.status(204).send();
});
