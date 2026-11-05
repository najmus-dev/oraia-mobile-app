import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { selectPushRecipientIds, userCanAccessLocation } from '../src/lib/pushRecipients';

describe('pushRecipients', () => {
  const admin = {
    _id: 'admin_1',
    role: 'agency_admin',
    status: 'active',
    allowedLocationIds: [],
    ghlUserId: 'ghl_admin',
  };
  const staffA = {
    _id: 'staff_a',
    role: 'staff',
    status: 'active',
    allowedLocationIds: ['loc_1'],
    ghlUserId: 'ghl_a',
  };
  const staffB = {
    _id: 'staff_b',
    role: 'staff',
    status: 'active',
    allowedLocationIds: ['loc_1'],
    ghlUserId: 'ghl_b',
  };
  const otherLocation = {
    _id: 'staff_c',
    role: 'staff',
    status: 'active',
    allowedLocationIds: ['loc_2'],
    ghlUserId: 'ghl_c',
  };

  it('lets agency admins access any location', () => {
    assert.equal(userCanAccessLocation(admin, 'loc_99'), true);
    assert.equal(userCanAccessLocation(staffA, 'loc_2'), false);
  });

  it('notifies every location user like the HighLevel location feed', () => {
    const ids = selectPushRecipientIds([admin, staffA, staffB, otherLocation], 'loc_1', 'ghl_a');
    assert.deepEqual(ids.sort(), ['admin_1', 'staff_a', 'staff_b']);
  });

  it('still notifies every location user when unassigned', () => {
    const ids = selectPushRecipientIds([admin, staffA, staffB, otherLocation], 'loc_1');
    assert.deepEqual(ids.sort(), ['admin_1', 'staff_a', 'staff_b']);
  });

  it('skips pending users', () => {
    const ids = selectPushRecipientIds(
      [{ ...staffA, status: 'pending' }, admin, staffB],
      'loc_1',
      'ghl_a',
    );
    assert.deepEqual(ids.sort(), ['admin_1', 'staff_b']);
  });
});
