import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearFreeSlotsCache,
  freeSlotsCacheKey,
  readFreeSlotsCache,
  writeFreeSlotsCache,
} from '../src/lib/freeSlotsCache';

describe('freeSlotsCache', () => {
  it('stores and reads slots by key', () => {
    clearFreeSlotsCache();
    const key = freeSlotsCacheKey('loc_1', 'cal_1', 1000, 2000);
    writeFreeSlotsCache(key, { slots: ['09:00'] });
    assert.deepEqual(readFreeSlotsCache(key), { slots: ['09:00'] });
    clearFreeSlotsCache();
  });
});
