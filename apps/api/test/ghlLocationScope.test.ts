import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { omitRedundantLocationId, queryWithoutLocationId, withRequiredLocationQuery } from '../src/lib/ghlLocationScope';

describe('ghlLocationScope', () => {
  it('removes locationId from objects', () => {
    assert.deepEqual(omitRedundantLocationId({ locationId: 'loc_1', body: 'hi' }), { body: 'hi' });
  });

  it('removes locationId and location_id from query params', () => {
    assert.deepEqual(
      queryWithoutLocationId({
        locationId: 'loc_1',
        location_id: 'loc_1',
        limit: 20,
      }),
      { limit: 20 },
    );
  });

  it('adds locationId to query params for search endpoints', () => {
    assert.deepEqual(withRequiredLocationQuery('loc_1', { limit: 20, status: 'unread' }), {
      locationId: 'loc_1',
      limit: 20,
      status: 'unread',
    });
  });

  it('supports pipelines list with locationId only', () => {
    assert.deepEqual(withRequiredLocationQuery('loc_pipelines'), { locationId: 'loc_pipelines' });
  });
});
