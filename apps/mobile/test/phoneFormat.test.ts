import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatPhoneDisplay,
  isValidPhone,
  parseStoredPhone,
  phoneToApiValue,
} from '../src/lib/phoneFormat';

describe('formatPhoneDisplay', () => {
  it('formats US numbers as user types', () => {
    assert.equal(formatPhoneDisplay('555'), '555');
    assert.equal(formatPhoneDisplay('5551'), '(555) 1');
    assert.equal(formatPhoneDisplay('5551234'), '(555) 123-4');
    assert.equal(formatPhoneDisplay('5551234567'), '(555) 123-4567');
  });

  it('strips leading country digit when formatting +1 numbers', () => {
    assert.equal(formatPhoneDisplay('15551234567', '+1'), '(555) 123-4567');
  });
});

describe('phoneToApiValue', () => {
  it('converts display to E.164 for US', () => {
    assert.equal(phoneToApiValue('(555) 123-4567', '+1'), '+15551234567');
  });
});

describe('parseStoredPhone', () => {
  it('parses stored E.164 values', () => {
    assert.deepEqual(parseStoredPhone('+15551234567'), {
      countryCode: '+1',
      display: '(555) 123-4567',
    });
  });

  it('defaults bare digits to US display', () => {
    assert.deepEqual(parseStoredPhone('5551234567'), {
      countryCode: '+1',
      display: '(555) 123-4567',
    });
  });
});

describe('isValidPhone', () => {
  it('accepts empty or complete US numbers', () => {
    assert.equal(isValidPhone(''), true);
    assert.equal(isValidPhone('(555) 123-4567', '+1'), true);
    assert.equal(isValidPhone('555123', '+1'), false);
  });
});
