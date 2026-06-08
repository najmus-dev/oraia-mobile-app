import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';

process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long';
process.env.MONGODB_URI = 'mongodb://localhost:27017/oraia-test';
process.env.GHL_CLIENT_ID = 'test-client';
process.env.GHL_CLIENT_SECRET = 'test-secret';
process.env.GHL_COMPANY_ID = 'test-company';

describe('crypto', () => {
  let encrypt: (value: string) => string;
  let decrypt: (value: string) => string;

  before(async () => {
    const mod = await import('../src/lib/crypto');
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
  });

  it('round-trips plaintext', () => {
    const secret = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test';
    const payload = encrypt(secret);
    assert.notEqual(payload, secret);
    assert.equal(decrypt(payload), secret);
  });

  it('produces different ciphertext each time', () => {
    const a = encrypt('same-value');
    const b = encrypt('same-value');
    assert.notEqual(a, b);
    assert.equal(decrypt(a), decrypt(b));
  });
});
