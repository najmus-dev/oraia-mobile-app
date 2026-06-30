import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validateAuthEmail,
  validateConfirmPassword,
  validateLoginPassword,
  validateSignupPassword,
} from '../src/lib/authValidation';

describe('mobile authValidation', () => {
  it('validates login password when touched', () => {
    assert.equal(validateLoginPassword('12345', true), 'Password must be at least 6 characters.');
    assert.equal(validateLoginPassword('123456', true), '');
  });

  it('validates signup password when touched', () => {
    assert.match(validateSignupPassword('short', true), /8 characters/);
    assert.equal(validateSignupPassword('longpassword', true), '');
  });

  it('validates confirm password', () => {
    assert.equal(validateConfirmPassword('abcdefgh', 'abcdefgh', true), '');
    assert.equal(validateConfirmPassword('abcdefgh', 'different', true), 'Passwords do not match.');
  });

  it('validates email when touched', () => {
    assert.equal(validateAuthEmail('bad', true), 'Enter a valid email address.');
    assert.equal(validateAuthEmail('ok@company.com', true), '');
    assert.equal(validateAuthEmail('', false), '');
  });
});
