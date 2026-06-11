import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isUnauthorizedError, mapMeUserToAuthUser } from '../src/lib/auth';
import { ApiError, formatError } from '../src/lib/errors';

describe('mapMeUserToAuthUser', () => {
  it('maps BFF user shape', () => {
    assert.deepEqual(
      mapMeUserToAuthUser({
        id: 'u1',
        email: 'a@b.com',
        role: 'staff',
        companyId: 'co1',
        allowedLocationIds: ['loc1'],
        ghlUserId: 'ghl-99',
      }),
      { id: 'u1', email: 'a@b.com', role: 'staff', companyId: 'co1', ghlUserId: 'ghl-99' },
    );
  });
});

describe('isUnauthorizedError', () => {
  it('detects 401 ApiError', () => {
    assert.equal(isUnauthorizedError(new ApiError('x', 401)), true);
    assert.equal(isUnauthorizedError(new ApiError('x', 403)), false);
  });
});

describe('formatError', () => {
  it('shows friendly message for GHL CRM outages', () => {
    const msg = formatError(new ApiError('raw', 503, 'GHL_AUTH_ERROR'));
    assert.match(msg, /CRM connection is temporarily unavailable/i);
  });
});
