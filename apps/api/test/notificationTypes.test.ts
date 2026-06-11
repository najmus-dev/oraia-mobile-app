import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseAppointmentCreate,
  parseTaskCreate,
  isAppointmentCreateEvent,
  isTaskCreateEvent,
} from '../src/lib/ghlWebhookEvents';
import { parseNotificationStatus, parseNotificationType } from '../src/lib/notificationTypes';

describe('notificationTypes', () => {
  it('parses notification filters', () => {
    assert.equal(parseNotificationType('conversations'), 'conversations');
    assert.equal(parseNotificationType('all'), undefined);
    assert.equal(parseNotificationStatus('unread'), 'unread');
  });
});

describe('notification webhook parsers', () => {
  it('detects appointment and task events', () => {
    assert.equal(isAppointmentCreateEvent('AppointmentCreate'), true);
    assert.equal(isTaskCreateEvent('TaskCreate'), true);
  });

  it('parses AppointmentCreate payload', () => {
    const parsed = parseAppointmentCreate({
      type: 'AppointmentCreate',
      locationId: 'loc_1',
      appointment: {
        id: 'evt_1',
        title: 'Consultation',
        contactId: 'con_1',
        assignedUserId: 'user_1',
        startTime: '2026-06-09T10:00:00.000Z',
      },
    });
    assert.equal(parsed?.appointmentId, 'evt_1');
    assert.equal(parsed?.assignedUserId, 'user_1');
  });

  it('parses TaskCreate payload', () => {
    const parsed = parseTaskCreate({
      type: 'TaskCreate',
      locationId: 'loc_1',
      id: 'task_1',
      title: 'Follow up',
      contactId: 'con_1',
      assignedTo: 'user_1',
    });
    assert.equal(parsed?.taskId, 'task_1');
    assert.equal(parsed?.assignedTo, 'user_1');
  });
});
