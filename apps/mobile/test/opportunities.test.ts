import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultStageIdForPipeline,
  extractOpportunityId,
  followerSyncDiff,
  formatFollowerLabel,
  formatOpportunityMoney,
  contactTagsSame,
  formValuesToOpportunityPayload,
  parseOpportunityFollowerIds,
  shouldSyncContactTags,
  validateOpportunityForm,
} from '../src/lib/opportunities';

describe('validateOpportunityForm', () => {
  it('requires core fields', () => {
    assert.match(
      validateOpportunityForm({
        name: '',
        contactId: '',
        monetaryValue: '',
        pipelineId: '',
        pipelineStageId: '',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
        followerIds: [],
        contactTags: [],
      }) ?? '',
      /deal name/i,
    );
  });

  it('accepts valid values', () => {
    assert.equal(
      validateOpportunityForm({
        name: 'New deal',
        contactId: 'con_1',
        monetaryValue: '5000',
        pipelineId: 'pipe_1',
        pipelineStageId: 'stage_1',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
        followerIds: [],
        contactTags: [],
      }),
      null,
    );
  });

  it('rejects invalid monetary value', () => {
    assert.match(
      validateOpportunityForm({
        name: 'Deal',
        contactId: 'con_1',
        monetaryValue: 'not-a-number',
        pipelineId: 'pipe_1',
        pipelineStageId: 'stage_1',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
        followerIds: [],
        contactTags: [],
      }) ?? '',
      /valid deal value/i,
    );
  });

  it('rejects phone number as contact id', () => {
    assert.match(
      validateOpportunityForm({
        name: 'Deal',
        contactId: '+16722308793',
        monetaryValue: '',
        pipelineId: 'pipe_1',
        pipelineStageId: 'stage_1',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
        followerIds: [],
        contactTags: [],
      }) ?? '',
      /phone number/i,
    );
  });
});

describe('contactTagsSame', () => {
  it('ignores tag order', () => {
    assert.equal(contactTagsSame(['VIP', 'Lead'], ['lead', 'vip']), true);
  });
});

describe('shouldSyncContactTags', () => {
  it('skips unchanged tags on edit', () => {
    assert.equal(shouldSyncContactTags(['VIP'], ['VIP']), false);
  });

  it('syncs when tags changed', () => {
    assert.equal(shouldSyncContactTags(['VIP', 'Hot'], ['VIP']), true);
  });
});

describe('formValuesToOpportunityPayload', () => {
  it('includes optional GHL fields when set', () => {
    const payload = formValuesToOpportunityPayload({
      name: 'Acme',
      contactId: 'con_1',
      monetaryValue: '1200',
      pipelineId: 'pipe_1',
      pipelineStageId: 'stage_1',
      status: 'won',
      source: 'Referral',
      businessName: 'Acme LLC',
      assignedTo: 'user_1',
      followerIds: [],
      contactTags: [],
    });
    assert.equal(payload.status, 'won');
    assert.equal(payload.source, 'Referral');
    assert.equal(payload.businessName, 'Acme LLC');
    assert.equal(payload.companyName, undefined);
    assert.equal(payload.assignedTo, 'user_1');
    assert.equal(payload.monetaryValue, 1200);
  });

  it('includes followerIds and changed contactTags', () => {
    const payload = formValuesToOpportunityPayload(
      {
        name: 'Acme',
        contactId: 'con_1',
        monetaryValue: '',
        pipelineId: 'pipe_1',
        pipelineStageId: 'stage_1',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
        followerIds: ['u1'],
        contactTags: ['VIP'],
      },
      { previousContactTags: [] },
    );
    assert.deepEqual(payload.followerIds, ['u1']);
    assert.deepEqual(payload.contactTags, ['VIP']);
  });

  it('includes businessName when changed', () => {
    const payload = formValuesToOpportunityPayload(
      {
        name: 'Acme',
        contactId: 'con_1',
        monetaryValue: '',
        pipelineId: 'pipe_1',
        pipelineStageId: 'stage_1',
        status: 'open',
        source: '',
        businessName: 'Acme LLC',
        assignedTo: '',
        followerIds: [],
        contactTags: [],
      },
      { previousBusinessName: '' },
    );
    assert.equal(payload.businessName, 'Acme LLC');
  });

  it('omits unchanged contactTags', () => {
    const payload = formValuesToOpportunityPayload(
      {
        name: 'Acme',
        contactId: 'con_1',
        monetaryValue: '',
        pipelineId: 'pipe_1',
        pipelineStageId: 'stage_1',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
        followerIds: [],
        contactTags: ['VIP'],
      },
      { previousContactTags: ['VIP'] },
    );
    assert.equal(payload.contactTags, undefined);
  });

  it('omits empty optional fields', () => {
    const payload = formValuesToOpportunityPayload({
      name: 'Acme',
      contactId: 'con_1',
      monetaryValue: '',
      pipelineId: 'pipe_1',
      pipelineStageId: 'stage_1',
      status: 'open',
      source: '',
      businessName: '',
      assignedTo: '',
      followerIds: [],
      contactTags: [],
    });
    assert.equal(payload.source, undefined);
    assert.equal(payload.businessName, undefined);
    assert.equal(payload.assignedTo, undefined);
    assert.equal(payload.monetaryValue, undefined);
  });
});

describe('formatOpportunityMoney', () => {
  it('formats USD amounts', () => {
    assert.match(formatOpportunityMoney(1000), /\$1,000|\$1000/);
  });
});

describe('extractOpportunityId', () => {
  it('reads nested opportunity id', () => {
    assert.equal(extractOpportunityId({ opportunity: { id: 'opp_1' } }), 'opp_1');
  });

  it('reads root id', () => {
    assert.equal(extractOpportunityId({ id: 'opp_2' }), 'opp_2');
  });
});

describe('parseOpportunityFollowerIds', () => {
  it('reads string and object follower ids', () => {
    assert.deepEqual(
      parseOpportunityFollowerIds({
        opportunity: { followers: ['u1', { id: 'u2' }] },
      }),
      ['u1', 'u2'],
    );
  });
});

describe('followerSyncDiff', () => {
  it('computes add and remove sets', () => {
    assert.deepEqual(followerSyncDiff(['a', 'b'], ['b', 'c']), {
      toAdd: ['c'],
      toRemove: ['a'],
    });
  });
});

describe('formatFollowerLabel', () => {
  it('joins short name lists', () => {
    assert.equal(formatFollowerLabel(['u1', 'u2'], ['Alex', 'Sam']), 'Alex, Sam');
  });

  it('summarizes longer lists', () => {
    assert.equal(formatFollowerLabel(['u1', 'u2', 'u3'], ['A', 'B', 'C']), '3 followers');
  });
});

describe('defaultStageIdForPipeline', () => {
  it('returns first stage id', () => {
    assert.equal(
      defaultStageIdForPipeline(
        [{ id: 'p1', name: 'Sales', stages: [{ id: 's1', name: 'New' }] }],
        'p1',
      ),
      's1',
    );
  });
});
