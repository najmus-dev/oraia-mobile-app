import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ghlTaskId, mapGhlTask } from '../src/lib/taskMapping';
import type { GhlTask } from '../src/services/ghl/types';

describe('taskMapping', () => {
  it('reads _id when id is missing', () => {
    assert.equal(ghlTaskId({ _id: 'abc123' } as GhlTask), 'abc123');
    assert.equal(ghlTaskId(undefined), '');
  });

  it('maps contact and assignee details from GHL payload', () => {
    const mapped = mapGhlTask(
      {
        _id: 'task1',
        title: 'Follow up',
        completed: false,
        contactId: 'c1',
        assignedTo: 'u1',
        contactDetails: { firstName: 'Rovin', lastName: 'Mahadeo' },
        assignedToUserDetails: { firstName: 'Junaid', lastName: 'Khan' },
      } as GhlTask,
      new Map(),
      new Map(),
    );
    assert.equal(mapped.id, 'task1');
    assert.equal(mapped.contactName, 'Rovin Mahadeo');
    assert.equal(mapped.assigneeName, 'Junaid Khan');
  });
});
