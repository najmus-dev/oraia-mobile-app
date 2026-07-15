import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveAuthRoute } from '../src/navigation/useAuthNavigationSync';

describe('resolveAuthRoute', () => {
  it('routes guests to login', () => {
    assert.equal(resolveAuthRoute({ token: null, user: null, locationId: null }), 'Login');
  });

  it('routes pending users to approval screen', () => {
    assert.equal(
      resolveAuthRoute({
        token: 'jwt',
        user: { status: 'pending' },
        locationId: null,
      }),
      'PendingApproval',
    );
  });

  it('routes active users without location to picker', () => {
    assert.equal(
      resolveAuthRoute({
        token: 'jwt',
        user: { status: 'active' },
        locationId: null,
      }),
      'LocationPicker',
    );
  });

  it('routes active users with location to main app', () => {
    assert.equal(
      resolveAuthRoute({
        token: 'jwt',
        user: { status: 'active' },
        locationId: 'loc_1',
      }),
      'Main',
    );
  });
});
