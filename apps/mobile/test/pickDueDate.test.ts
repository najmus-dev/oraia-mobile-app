import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isIosDueDatePicker } from '../src/lib/pickDueDate';

describe('pickDueDate', () => {
  it('detects platform for picker mode', () => {
    assert.equal(typeof isIosDueDatePicker(), 'boolean');
  });
});
