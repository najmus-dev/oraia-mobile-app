import type { PickedContact } from './contacts';
import type { OpportunityFormValues } from './opportunities';

export type OpportunityFormDraft = {
  values: OpportunityFormValues;
  pickedContact: PickedContact | null;
  ownerName: string;
};

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
