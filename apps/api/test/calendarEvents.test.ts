import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  coerceCalendarTimestamp,
  normalizeCalendarEvent,
  normalizeCalendarEventsResponse,
} from '../src/lib/calendarEvents';

describe('normalizeCalendarEvent', () => {
  it('reads nested appointment fields', () => {
    const event = normalizeCalendarEvent({
      appointment: {
        id: 'appt_1',
        title: 'Test',
        startTime: '2026-06-12T15:00:00.000Z',
        endTime: '2026-06-12T15:45:00.000Z',
        calendarId: 'cal_1',
        contactId: 'con_1',
        appointmentStatus: 'confirmed',
      },
    });
    assert.equal(event?.id, 'appt_1');
    assert.equal(event?.title, 'Test');
    assert.equal(event?.appointmentStatus, 'confirmed');
  });

  it('coerces epoch millisecond timestamps', () => {
    const ms = Date.parse('2026-06-12T15:00:00.000Z');
    const event = normalizeCalendarEvent({
      id: 'appt_2',
      title: 'Epoch',
      startTime: ms,
      endTime: ms + 45 * 60 * 1000,
    });
    assert.equal(event?.startTime, '2026-06-12T15:00:00.000Z');
  });

  it('unwraps events array from GHL list response', () => {
    const events = normalizeCalendarEventsResponse({
      events: [{ id: 'e1', title: 'A', startTime: '2026-06-12T10:00:00.000Z' }],
    });
    assert.equal(events.length, 1);
    assert.equal(events[0]?.id, 'e1');
  });
});

describe('coerceCalendarTimestamp', () => {
  it('accepts ISO strings', () => {
    assert.equal(coerceCalendarTimestamp('2026-06-12T10:00:00.000Z'), '2026-06-12T10:00:00.000Z');
  });
});
