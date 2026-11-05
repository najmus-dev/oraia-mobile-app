import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toDialablePhone } from '../src/lib/phoneFormat';

describe('toDialablePhone', () => {
  it('keeps E.164 plus and strips formatting', () => {
    assert.equal(toDialablePhone('+1 (321) 321-2591'), '+13213212591');
  });

  it('keeps local 10-digit numbers without forcing plus', () => {
    assert.equal(toDialablePhone('(352) 809-9037'), '3528099037');
  });

  it('returns empty for blank input', () => {
    assert.equal(toDialablePhone('   '), '');
  });
});
