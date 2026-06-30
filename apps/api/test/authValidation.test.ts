import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isValidAuthEmail,
  normalizeAuthEmail,
  validateSignupPassword,
} from '../src/lib/authValidation';

describe('authValidation', () => {
  it('normalizes email', () => {
    assert.equal(normalizeAuthEmail('  User@Company.COM '), 'user@company.com');
  });

  it('validates email shape', () => {
    assert.equal(isValidAuthEmail('user@company.com'), true);
    assert.equal(isValidAuthEmail('not-an-email'), false);
  });

  it('enforces signup password length', () => {
    assert.equal(validateSignupPassword('short'), 'Password must be at least 8 characters');
    assert.equal(validateSignupPassword('longenough'), null);
  });
});
