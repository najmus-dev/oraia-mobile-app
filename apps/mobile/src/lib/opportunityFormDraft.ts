import type { PickedContact } from './contacts';
import { emptyOpportunityFormValues, type OpportunityFormValues } from './opportunities';

export type OpportunityFormDraft = {
  values: OpportunityFormValues;
  pickedContact: PickedContact | null;
  ownerName: string;
  followerNames: string[];
};

export type PickedAssignee = { id: string; name: string };

let draft: OpportunityFormDraft | null = null;
let draftOwner: string | null = null;

export function opportunityFormOwnerKey(params: { opportunityId?: string }): string {
  if (params.opportunityId) return `edit:${params.opportunityId}`;
  return 'create';
}

export function readOpportunityFormDraft(owner: string): OpportunityFormDraft | null {
  if (draftOwner !== owner) return null;
  return draft;
}

export function writeOpportunityFormDraft(owner: string, next: OpportunityFormDraft): void {
  draftOwner = owner;
  draft = next;
}

export function clearOpportunityFormDraft(owner?: string): void {
  if (owner && draftOwner !== owner) return;
  draft = null;
  draftOwner = null;
}

export function resetCreateOpportunityFormDraft(): void {
  clearOpportunityFormDraft('create');
}

export function applyPickedContact(
  current: OpportunityFormDraft,
  picked: PickedContact,
): OpportunityFormDraft {
  return {
    ...current,
    pickedContact: picked,
    values: {
      ...current.values,
      contactId: picked.id,
      name: current.values.name.trim() ? current.values.name : picked.name,
    },
  };
}

export function applyPickedAssignee(
  current: OpportunityFormDraft,
  picked: PickedAssignee,
): OpportunityFormDraft {
  return {
    ...current,
    ownerName: picked.name,
    values: {
      ...current.values,
      assignedTo: picked.id,
    },
  };
}

export function applyPickedFollowers(
  current: OpportunityFormDraft,
  followerIds: string[],
  namesById?: Record<string, string>,
): OpportunityFormDraft {
  const followerNames = followerIds.map((id) => namesById?.[id] ?? 'Follower');
  return {
    ...current,
    followerNames,
    values: {
      ...current.values,
      followerIds,
    },
  };
}

export type ResolveOpportunityDraftInput = {
  ownerKey: string;
  pipelineId?: string;
  pipelineStageId?: string;
  pickedContact?: PickedContact | null;
  pickedAssignee?: PickedAssignee | null;
  pickedFollowerIds?: string[] | null;
};

/** Seed form state once per mount; route picks win over stored draft fields. */
export function resolveOpportunityFormDraft(input: ResolveOpportunityDraftInput): OpportunityFormDraft {
  const stored = readOpportunityFormDraft(input.ownerKey);
  const pipelineId = input.pipelineId || stored?.values.pipelineId || '';
  const pipelineStageId = input.pipelineStageId || stored?.values.pipelineStageId || '';

  let next: OpportunityFormDraft = stored ?? {
    values: emptyOpportunityFormValues({ pipelineId, pipelineStageId }),
    pickedContact: null,
    ownerName: '',
    followerNames: [],
  };

  if (!stored) {
    next = {
      ...next,
      values: emptyOpportunityFormValues({
        pipelineId,
        pipelineStageId,
        contactId: input.pickedContact?.id ?? '',
        name: input.pickedContact?.name ?? '',
      }),
      pickedContact: input.pickedContact ?? null,
      ownerName: input.pickedAssignee?.name ?? '',
      followerNames: [],
    };
    if (input.pickedAssignee) {
      next = applyPickedAssignee(next, input.pickedAssignee);
    }
    if (input.pickedContact) {
      next = applyPickedContact(next, input.pickedContact);
    }
    if (input.pickedFollowerIds?.length) {
      next = applyPickedFollowers(next, input.pickedFollowerIds);
    }
    return next;
  }

  if (input.pipelineId || input.pipelineStageId) {
    next = {
      ...next,
      values: {
        ...next.values,
        pipelineId: pipelineId || next.values.pipelineId,
        pipelineStageId: pipelineStageId || next.values.pipelineStageId,
      },
    };
  }

  if (input.pickedAssignee) {
    next = applyPickedAssignee(next, input.pickedAssignee);
  }
  if (input.pickedContact) {
    next = applyPickedContact(next, input.pickedContact);
  }
  if (input.pickedFollowerIds?.length) {
    next = applyPickedFollowers(next, input.pickedFollowerIds);
  }

  return next;
}

export function hasOpportunityContact(d: Pick<OpportunityFormDraft, 'pickedContact' | 'values'>): boolean {
  return Boolean(d.pickedContact?.id?.trim() || d.values.contactId?.trim());
}
