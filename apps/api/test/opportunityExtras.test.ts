import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  followerSyncDiff,
  parseFollowerIdsFromOpportunity,
  parseOpportunityExtras,
} from '../src/lib/opportunityExtras';

describe('parseOpportunityExtras', () => {
  it('reads followerIds, contactTags, and businessName without affecting core fields', () => {
    assert.deepEqual(
      parseOpportunityExtras({
        name: 'Deal',
        followerIds: ['u1', 'u2'],
        contactTags: ['VIP', ''],
        businessName: ' Acme ',
      }),
      {
        followerIds: ['u1', 'u2'],
        contactTags: ['VIP'],
        contactCompanyName: 'Acme',
      },
    );
  });

  it('treats explicit empty arrays as sync requests', () => {
    assert.deepEqual(
      parseOpportunityExtras({
        followerIds: [],
        contactTags: [],
      }),
      {
        followerIds: [],
        contactTags: [],
      },
    );
  });
});

describe('parseFollowerIdsFromOpportunity', () => {
  it('reads nested follower ids', () => {
    assert.deepEqual(
      parseFollowerIdsFromOpportunity({
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
