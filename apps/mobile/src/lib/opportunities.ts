import { looksLikePhoneContactId } from './contacts';

export type PipelineStage = { id: string; name: string };
export type Pipeline = { id: string; name: string; stages?: PipelineStage[] };

export type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned';

export const OPPORTUNITY_STATUS_OPTIONS: { id: OpportunityStatus; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'abandoned', label: 'Abandoned' },
];

export type Opportunity = {
  id: string;
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
};

export type PipelinesResponse = {
  pipelines: Pipeline[];
};

export type OpportunitiesListResponse = {
  opportunities: Opportunity[];
  meta?: { total?: number };
};

export type OpportunityResponse = {
  opportunity: Opportunity;
};

export type OpportunityFormValues = {
  name: string;
  contactId: string;
  monetaryValue: string;
  pipelineId: string;
  pipelineStageId: string;
  status: OpportunityStatus;
  source: string;
  businessName: string;
  assignedTo: string;
};

export function opportunityToFormValues(o: Opportunity): OpportunityFormValues {
  const status = OPPORTUNITY_STATUS_OPTIONS.some((s) => s.id === o.status)
    ? (o.status as OpportunityStatus)
    : 'open';
  return {
    name: o.name?.trim() ?? '',
    contactId: o.contactId?.trim() ?? '',
    monetaryValue: o.monetaryValue != null ? String(o.monetaryValue) : '',
    pipelineId: o.pipelineId?.trim() ?? '',
    pipelineStageId: o.pipelineStageId?.trim() ?? '',
    status,
    source: o.source?.trim() ?? '',
    businessName: o.companyName?.trim() ?? '',
    assignedTo: o.assignedTo?.trim() ?? '',
  };
}

export function emptyOpportunityFormValues(
  defaults?: Partial<OpportunityFormValues>,
): OpportunityFormValues {
  return {
    name: '',
    contactId: '',
    monetaryValue: '',
    pipelineId: '',
    pipelineStageId: '',
    status: 'open',
    source: '',
    businessName: '',
    assignedTo: '',
    ...defaults,
  };
}

export function formatOpportunityMoney(value?: number): string {
  if (value == null) return '';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
  } catch {
    return String(value);
  }
}

export function formValuesToOpportunityPayload(values: OpportunityFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: values.name.trim(),
    pipelineId: values.pipelineId.trim(),
    pipelineStageId: values.pipelineStageId.trim(),
    contactId: values.contactId.trim(),
    status: values.status,
  };
  const amount = values.monetaryValue.trim();
  if (amount) {
    payload.monetaryValue = Number(amount.replace(/[$,]/g, ''));
  }
  const source = values.source.trim();
  if (source) payload.source = source;
  const companyName = values.businessName.trim();
  if (companyName) payload.companyName = companyName;
  const assignedTo = values.assignedTo.trim();
  if (assignedTo) payload.assignedTo = assignedTo;
  return payload;
}

export function validateOpportunityForm(values: OpportunityFormValues): string | null {
  if (!values.name.trim()) return 'Enter a deal name.';
  if (!values.pipelineId.trim()) return 'Select a pipeline.';
  if (!values.pipelineStageId.trim()) return 'Select a pipeline stage.';
  if (!values.contactId.trim()) return 'Select a contact.';
  if (!OPPORTUNITY_STATUS_OPTIONS.some((s) => s.id === values.status)) return 'Select a status.';
  if (looksLikePhoneContactId(values.contactId)) {
    return 'That looks like a phone number. Search and pick a contact from the list.';
  }
  const amount = values.monetaryValue.trim();
  if (amount && !Number.isFinite(Number(amount.replace(/[$,]/g, '')))) {
    return 'Enter a valid deal value.';
  }
  return null;
}

export function extractOpportunityId(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const root = response as Record<string, unknown>;
  if (typeof root.id === 'string' && root.id) return root.id;
  const nested = root.opportunity;
  if (nested && typeof nested === 'object' && typeof (nested as { id?: string }).id === 'string') {
    return (nested as { id: string }).id;
  }
  return null;
}

export function stagesForPipeline(pipelines: Pipeline[], pipelineId: string): PipelineStage[] {
  return pipelines.find((p) => p.id === pipelineId)?.stages ?? [];
}

export function defaultStageIdForPipeline(pipelines: Pipeline[], pipelineId: string): string {
  return stagesForPipeline(pipelines, pipelineId)[0]?.id ?? '';
}
