import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateContactCreateBody } from '../src/lib/contactValidation';

describe('validateContactCreateBody', () => {
  it('accepts firstName only', () => {
    const body = validateContactCreateBody({ firstName: 'Jane' });
    assert.equal(body.firstName, 'Jane');
  });

  it('accepts email only', () => {
    const body = validateContactCreateBody({ email: 'jane@example.com' });
    assert.equal(body.email, 'jane@example.com');
  });

  it('trims string fields', () => {
    const body = validateContactCreateBody({
      firstName: '  Jane  ',
      lastName: ' Doe ',
      companyName: ' ORAIA ',
    });
    assert.equal(body.firstName, 'Jane');
    assert.equal(body.lastName, 'Doe');
    assert.equal(body.companyName, 'ORAIA');
  });

  it('rejects empty body', () => {
    assert.throws(() => validateContactCreateBody({}), /Provide at least/);
  });

  it('rejects whitespace-only identifiers', () => {
    assert.throws(
      () => validateContactCreateBody({ firstName: '   ', email: '' }),
      /Provide at least/,
    );
  });

  it('rejects non-object body', () => {
    assert.throws(() => validateContactCreateBody(null), /Provide at least/);
  });
});
