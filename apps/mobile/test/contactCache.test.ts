import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getCachedContactChannels,
  setCachedContactChannels,
} from '../src/lib/contactCacheStore';

describe('contactCacheStore', () => {
  it('stores and retrieves phone and email', () => {
    setCachedContactChannels('c1', { phone: '+1', email: 'a@b.co' });
    assert.deepEqual(getCachedContactChannels('c1'), { phone: '+1', email: 'a@b.co' });
  });

  it('returns undefined for unknown ids', () => {
    assert.equal(getCachedContactChannels('missing'), undefined);
  });
});
