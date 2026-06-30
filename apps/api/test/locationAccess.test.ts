import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long';
process.env.MONGODB_URI = 'mongodb://localhost:27017/oraia-test';
process.env.GHL_CLIENT_ID = 'test-client';
process.env.GHL_CLIENT_SECRET = 'test-secret';
process.env.GHL_COMPANY_ID = 'test-company';

describe('assertLocationAccess', () => {
  it('allows agency_admin for any location', async () => {
    const { assertLocationAccess } = await import('../src/services/authService');
    const user = {
      role: 'agency_admin' as const,
      allowedLocationIds: [],
    };
    assert.doesNotThrow(() =>
      assertLocationAccess(user as never, 'any-location-id'),
    );
  });

  it('denies pending staff before location check', async () => {
    const { assertLocationAccess } = await import('../src/services/authService');
    const { AppError } = await import('../src/lib/errors');
    const user = {
      role: 'staff' as const,
      status: 'pending' as const,
      allowedLocationIds: ['loc-a'],
    };
    assert.throws(
      () => assertLocationAccess(user as never, 'loc-a'),
      (err: unknown) =>
        err instanceof AppError && err.statusCode === 403 && err.code === 'ACCOUNT_PENDING',
    );
  });

  it('denies staff without allowed location', async () => {
    const { assertLocationAccess } = await import('../src/services/authService');
    const { AppError } = await import('../src/lib/errors');
    const user = {
      role: 'staff' as const,
      status: 'active' as const,
      allowedLocationIds: ['loc-a'],
    };
    assert.throws(
      () => assertLocationAccess(user as never, 'loc-b'),
      (err: unknown) => err instanceof AppError && err.statusCode === 403,
    );
  });
});
