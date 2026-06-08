import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateTaskWriteBody } from '../src/lib/taskValidation';

describe('validateTaskWriteBody', () => {
  it('requires title and dueDate on create', () => {
    assert.throws(() => validateTaskWriteBody({ title: '', dueDate: '', completed: false }));
  });

  it('accepts valid payload', () => {
    const body = validateTaskWriteBody({
      title: 'Follow up',
      dueDate: '2026-05-01T17:00:00.000Z',
      completed: false,
      assignedTo: 'user1',
    });
    assert.equal(body.title, 'Follow up');
    assert.equal(body.assignedTo, 'user1');
  });
});
