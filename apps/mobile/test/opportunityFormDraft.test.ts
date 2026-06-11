import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearOpportunityFormDraft,
  opportunityFormOwnerKey,
  readOpportunityFormDraft,
  resetCreateOpportunityFormDraft,
  writeOpportunityFormDraft,
} from '../src/lib/opportunityFormDraft';
import { emptyOpportunityFormValues } from '../src/lib/opportunities';

describe('opportunityFormDraft', () => {
  it('scopes drafts by owner key', () => {
    resetCreateOpportunityFormDraft();
    writeOpportunityFormDraft('create', {
      values: { ...emptyOpportunityFormValues(), name: 'Big deal' },
      pickedContact: { id: 'con_1', name: 'Jane' },
      ownerName: 'Alex',
    });
    assert.equal(readOpportunityFormDraft('create')?.values.name, 'Big deal');
    assert.equal(readOpportunityFormDraft('create')?.ownerName, 'Alex');
    assert.equal(readOpportunityFormDraft('edit:opp_1'), null);
    clearOpportunityFormDraft('create');
  });

  it('builds stable owner keys', () => {
    assert.equal(opportunityFormOwnerKey({}), 'create');
    assert.equal(opportunityFormOwnerKey({ opportunityId: 'opp_1' }), 'edit:opp_1');
  });
});
