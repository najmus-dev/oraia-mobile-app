import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearTaskFormDraft,
  readTaskFormDraft,
  resetCreateTaskFormDraft,
  taskFormOwnerKey,
  writeTaskFormDraft,
} from '../src/lib/taskFormDraft';
import { emptyTaskFormValues } from '../src/lib/tasks';

describe('taskFormDraft', () => {
  it('scopes drafts by owner key', () => {
    resetCreateTaskFormDraft();
    writeTaskFormDraft('create', {
      values: { ...emptyTaskFormValues(), title: 'Follow up' },
      pickedContact: null,
      assigneeName: '',
    });
    assert.equal(readTaskFormDraft('create')?.values.title, 'Follow up');
    assert.equal(readTaskFormDraft('edit:abc'), null);
    clearTaskFormDraft('create');
  });

  it('builds stable owner keys', () => {
    assert.equal(taskFormOwnerKey({}), 'create');
    assert.equal(taskFormOwnerKey({ taskId: 't1', contactId: 'c1' }), 'edit:t1');
  });
});
