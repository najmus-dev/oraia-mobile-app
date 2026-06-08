import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeStageStats,
  filterOpportunitiesByQuery,
  filterOpportunitiesByStatus,
  groupOpportunitiesByStage,
  sortOpportunities,
} from '../src/lib/opportunityPipeline';
import type { Opportunity } from '../src/lib/opportunities';

const sample: Opportunity[] = [
  { id: '1', name: 'Alpha', pipelineStageId: 's1', monetaryValue: 100, dateAdded: '2024-01-02' },
  { id: '2', name: 'Beta', pipelineStageId: 's2', monetaryValue: 500, dateAdded: '2024-01-01' },
  { id: '3', name: 'Gamma', pipelineStageId: 's1', monetaryValue: 50, status: 'won' },
];

describe('filterOpportunitiesByStatus', () => {
  it('filters by status', () => {
    const list = filterOpportunitiesByStatus(sample, 'won');
    assert.equal(list.length, 1);
    assert.equal(list[0].id, '3');
  });
});

describe('filterOpportunitiesByQuery', () => {
  it('matches name', () => {
    assert.equal(filterOpportunitiesByQuery(sample, 'alpha').length, 1);
  });
});

describe('sortOpportunities', () => {
  it('sorts by monetary value desc', () => {
    const sorted = sortOpportunities(sample, 'monetaryValue', 'desc');
    assert.equal(sorted[0].id, '2');
  });
});

describe('groupOpportunitiesByStage', () => {
  it('buckets by stage id', () => {
    const map = groupOpportunitiesByStage(sample, [
      { id: 's1', name: 'New' },
      { id: 's2', name: 'Qualified' },
    ]);
    assert.equal(map.get('s1')?.length, 2);
    assert.equal(map.get('s2')?.length, 1);
  });
});

describe('computeStageStats', () => {
  it('sums value and count', () => {
    assert.deepEqual(computeStageStats(sample.slice(0, 2)), { count: 2, totalValue: 600 });
  });
});
