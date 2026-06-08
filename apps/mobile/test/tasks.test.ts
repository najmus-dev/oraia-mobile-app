import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activeFilterCount,
  buildTaskSearchBody,
  DEFAULT_TASK_FILTERS,
  filterTasksByQuery,
  hasActiveTaskFilters,
  isTaskOverdue,
  sortTasks,
  validateTaskForm,
} from '../src/lib/tasks';

describe('tasks lib', () => {
  it('builds pending search body', () => {
    const body = buildTaskSearchBody({ ...DEFAULT_TASK_FILTERS, status: 'pending' });
    assert.equal(body.completed, false);
  });

  it('sorts by due date ascending', () => {
    const sorted = sortTasks(
      [
        { id: '2', title: 'b', completed: false, dueDate: '2026-05-20T12:00:00.000Z' },
        { id: '1', title: 'a', completed: false, dueDate: '2026-05-10T12:00:00.000Z' },
      ],
      'dueDate',
      'asc',
    );
    assert.equal(sorted[0]?.id, '1');
  });

  it('validates required title and due date', () => {
    assert.ok(validateTaskForm({ title: '', body: '', dueDate: '', assignedTo: '', contactId: 'c1', completed: false }));
  });

  it('counts only advanced filters, not sort order', () => {
    assert.equal(activeFilterCount({ ...DEFAULT_TASK_FILTERS, sortOrder: 'desc' }), 0);
    assert.equal(
      activeFilterCount({ ...DEFAULT_TASK_FILTERS, status: 'pending', contactIds: ['c1'] }),
      2,
    );
    assert.equal(hasActiveTaskFilters({ ...DEFAULT_TASK_FILTERS, assigneeIds: ['u1'] }), true);
  });

  it('detects overdue pending tasks', () => {
    assert.equal(
      isTaskOverdue({
        id: '1',
        title: 'Late',
        completed: false,
        dueDate: '2020-01-01T12:00:00.000Z',
      }),
      true,
    );
    assert.equal(
      isTaskOverdue({
        id: '2',
        title: 'Done',
        completed: true,
        dueDate: '2020-01-01T12:00:00.000Z',
      }),
      false,
    );
  });

  it('strips html from task bodies for search', () => {
    const filtered = filterTasksByQuery(
      [{ id: '1', title: 'Task', completed: false, body: '<p>Follow up</p>' }],
      'follow',
    );
    assert.equal(filtered.length, 1);
  });
});
