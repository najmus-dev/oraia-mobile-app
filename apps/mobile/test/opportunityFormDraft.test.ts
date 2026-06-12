import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyPickedAssignee,
  applyPickedContact,
  applyPickedFollowers,
  clearOpportunityFormDraft,
  hasOpportunityContact,
  opportunityFormOwnerKey,
  readOpportunityFormDraft,
  resetCreateOpportunityFormDraft,
  resolveOpportunityFormDraft,
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
      followerNames: [],
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

  it('applyPickedContact keeps owner assignment', () => {
    const base = {
      values: { ...emptyOpportunityFormValues(), assignedTo: 'user_1' },
      pickedContact: { id: 'con_old', name: 'Old' },
      ownerName: 'Alex',
      followerNames: [],
    };
    const next = applyPickedContact(base, { id: 'con_new', name: 'New Contact' });
    assert.equal(next.values.contactId, 'con_new');
    assert.equal(next.values.assignedTo, 'user_1');
    assert.equal(next.ownerName, 'Alex');
    assert.equal(next.pickedContact?.name, 'New Contact');
  });

  it('applyPickedAssignee keeps selected contact', () => {
    const base = {
      values: {
        ...emptyOpportunityFormValues(),
        contactId: 'con_1',
        name: 'Deal for Jane',
      },
      pickedContact: { id: 'con_1', name: 'Jane' },
      ownerName: '',
      followerNames: [],
    };
    const next = applyPickedAssignee(base, { id: 'user_9', name: 'Sam' });
    assert.equal(next.values.assignedTo, 'user_9');
    assert.equal(next.ownerName, 'Sam');
    assert.equal(next.values.contactId, 'con_1');
    assert.equal(next.pickedContact?.id, 'con_1');
  });

  it('resolveOpportunityFormDraft merges route picks over stored draft', () => {
    resetCreateOpportunityFormDraft();
    writeOpportunityFormDraft('create', {
      values: {
        ...emptyOpportunityFormValues(),
        contactId: 'con_1',
        name: 'Existing deal',
        assignedTo: 'user_1',
      },
      pickedContact: { id: 'con_1', name: 'Jane' },
      ownerName: 'Alex',
      followerNames: [],
    });

    const fromOwnerPick = resolveOpportunityFormDraft({
      ownerKey: 'create',
      pickedAssignee: { id: 'user_2', name: 'Sam' },
    });
    assert.equal(fromOwnerPick.values.assignedTo, 'user_2');
    assert.equal(fromOwnerPick.ownerName, 'Sam');
    assert.equal(fromOwnerPick.values.contactId, 'con_1');
    assert.equal(fromOwnerPick.pickedContact?.name, 'Jane');

    const fromContactPick = resolveOpportunityFormDraft({
      ownerKey: 'create',
      pickedContact: { id: 'con_2', name: 'Junaid' },
    });
    assert.equal(fromContactPick.values.contactId, 'con_2');
    assert.equal(fromContactPick.values.assignedTo, 'user_1');
    assert.equal(fromContactPick.ownerName, 'Alex');
  });

  it('applyPickedFollowers stores ids and display names', () => {
    const base = {
      values: emptyOpportunityFormValues(),
      pickedContact: null,
      ownerName: '',
      followerNames: [],
    };
    const next = applyPickedFollowers(base, ['u1', 'u2'], { u1: 'Alex', u2: 'Sam' });
    assert.deepEqual(next.values.followerIds, ['u1', 'u2']);
    assert.deepEqual(next.followerNames, ['Alex', 'Sam']);
  });

  it('hasOpportunityContact detects contact from state or values', () => {
    assert.equal(
      hasOpportunityContact({
        pickedContact: null,
        values: emptyOpportunityFormValues(),
      }),
      false,
    );
    assert.equal(
      hasOpportunityContact({
        pickedContact: { id: 'con_1', name: 'Jane' },
        values: emptyOpportunityFormValues(),
      }),
      true,
    );
    assert.equal(
      hasOpportunityContact({
        pickedContact: null,
        values: { ...emptyOpportunityFormValues(), contactId: 'con_1' },
      }),
      true,
    );
  });
});
