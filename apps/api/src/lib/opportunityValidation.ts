export type OpportunityCreateBody = {
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
  status: string;
  monetaryValue?: number;
  source?: string;
  assignedTo?: string;
};

export function parseMonetaryValue(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(/[$,]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error('monetaryValue must be a valid number');
}

export function validateOpportunityCreateBody(body: unknown): OpportunityCreateBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  const record = body as Record<string, unknown>;

  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const pipelineId = typeof record.pipelineId === 'string' ? record.pipelineId.trim() : '';
  const pipelineStageId =
    typeof record.pipelineStageId === 'string' ? record.pipelineStageId.trim() : '';
  const contactId = typeof record.contactId === 'string' ? record.contactId.trim() : '';
  const status =
    typeof record.status === 'string' && record.status.trim()
      ? record.status.trim()
      : 'open';

  if (!name) throw new Error('name is required');
  if (!pipelineId) throw new Error('pipelineId is required');
  if (!pipelineStageId) throw new Error('pipelineStageId is required');
  if (!contactId) throw new Error('contactId is required');

  let monetaryValue: number | undefined;
  if (record.monetaryValue != null && record.monetaryValue !== '') {
    monetaryValue = parseMonetaryValue(record.monetaryValue);
  }

  const source = typeof record.source === 'string' ? record.source.trim() : '';
  const assignedTo = typeof record.assignedTo === 'string' ? record.assignedTo.trim() : '';

  return {
    name,
    pipelineId,
    pipelineStageId,
    contactId,
    status,
    monetaryValue,
    ...(source ? { source } : {}),
    ...(assignedTo ? { assignedTo } : {}),
  };
}

export function validateOpportunityUpdateBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  const record = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if ('name' in record) {
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    if (!name) throw new Error('name cannot be empty');
    out.name = name;
  }
  if ('pipelineId' in record) {
    const pipelineId = typeof record.pipelineId === 'string' ? record.pipelineId.trim() : '';
    if (!pipelineId) throw new Error('pipelineId cannot be empty');
    out.pipelineId = pipelineId;
  }
  if ('pipelineStageId' in record) {
    const pipelineStageId =
      typeof record.pipelineStageId === 'string' ? record.pipelineStageId.trim() : '';
    if (!pipelineStageId) throw new Error('pipelineStageId cannot be empty');
    out.pipelineStageId = pipelineStageId;
  }
  if ('contactId' in record) {
    const contactId = typeof record.contactId === 'string' ? record.contactId.trim() : '';
    if (!contactId) throw new Error('contactId cannot be empty');
    out.contactId = contactId;
  }
  if ('status' in record) {
    const status = typeof record.status === 'string' ? record.status.trim() : '';
    if (!status) throw new Error('status cannot be empty');
    out.status = status;
  }
  if ('monetaryValue' in record) {
    if (record.monetaryValue == null || record.monetaryValue === '') {
      out.monetaryValue = 0;
    } else {
      out.monetaryValue = parseMonetaryValue(record.monetaryValue);
    }
  }
  if ('source' in record) {
    out.source = typeof record.source === 'string' ? record.source.trim() : '';
  }
  if ('assignedTo' in record) {
    out.assignedTo = typeof record.assignedTo === 'string' ? record.assignedTo.trim() : '';
  }

  const hasExtras =
    'followerIds' in record || 'contactTags' in record || 'businessName' in record;
  if (Object.keys(out).length === 0 && !hasExtras) {
    throw new Error('At least one field is required to update');
  }

  return out;
}
