import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decodeSmartListFilter,
  parseSmartListRecords,
  parseTagRecords,
} from '../src/lib/contactSmartLists';

describe('parseSmartListRecords', () => {
  it('parses array of smart list objects', () => {
    const lists = parseSmartListRecords([
      { id: 'abc', name: 'Brokers' },
      { id: 'def', title: 'President & VP' },
    ]);
    assert.deepEqual(lists, [
      { id: 'smart:abc', name: 'Brokers', source: 'smartList' },
      { id: 'smart:def', name: 'President & VP', source: 'smartList' },
    ]);
  });

  it('parses wrapped response shapes', () => {
    const lists = parseSmartListRecords({
      smartLists: [{ smartListId: 'x1', name: 'Leads' }],
    });
    assert.deepEqual(lists, [{ id: 'smart:x1', name: 'Leads', source: 'smartList' }]);
  });

  it('returns empty for invalid input', () => {
    assert.deepEqual(parseSmartListRecords(null), []);
    assert.deepEqual(parseSmartListRecords({}), []);
  });
});

describe('parseTagRecords', () => {
  it('maps tags to filter ids', () => {
    const lists = parseTagRecords([
      { id: 't1', name: ' warm lead ' },
      { id: 't2', name: 'Brokers' },
    ]);
    assert.deepEqual(lists, [
      { id: 'tag:t1', name: 'warm lead', source: 'tag' },
      { id: 'tag:t2', name: 'Brokers', source: 'tag' },
    ]);
  });
});

describe('decodeSmartListFilter', () => {
  it('decodes all, smart, and tag filters', () => {
    assert.deepEqual(decodeSmartListFilter('all'), { source: 'all' });
    assert.deepEqual(decodeSmartListFilter('smart:abc123'), {
      source: 'smartList',
      value: 'abc123',
    });
    assert.deepEqual(decodeSmartListFilter('tag:t99'), { source: 'tag', value: 't99' });
  });
});
