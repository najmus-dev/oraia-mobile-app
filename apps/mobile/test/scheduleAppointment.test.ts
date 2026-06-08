import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseFreeSlotsForDate, validateScheduleForm, defaultScheduleFormState } from '../src/lib/scheduleAppointment';

describe('parseFreeSlotsForDate', () => {
  it('parses iso slot strings for a date key', () => {
    const slots = parseFreeSlotsForDate(
      {
        '2026-06-03': { slots: ['2026-06-03T18:45:00.000Z', '2026-06-03T20:00:00.000Z'] },
      },
      '2026-06-03',
    );
    assert.equal(slots.length, 2);
    assert.ok(slots[0]?.label.includes('-'));
    assert.equal(slots[0]?.endTime, slots[1]?.startTime);
  });

  it('parses GHL timezone offset strings and infers end from next slot', () => {
    const slots = parseFreeSlotsForDate(
      {
        '2026-06-03': {
          slots: ['2026-06-03T14:45:00-04:00', '2026-06-03T15:30:00-04:00', '2026-06-03T16:15:00-04:00'],
        },
      },
      '2026-06-03',
    );
    assert.equal(slots.length, 3);
    const firstStart = new Date(slots[0]!.startTime);
    const firstEnd = new Date(slots[0]!.endTime);
    assert.equal((firstEnd.getTime() - firstStart.getTime()) / 60_000, 45);
  });

  it('unwraps nested slots map from API wrapper', () => {
    const slots = parseFreeSlotsForDate(
      {
        slots: {
          '2026-06-03': { slots: ['2026-06-03T14:45:00-04:00'] },
        },
      },
      '2026-06-03',
    );
    assert.equal(slots.length, 1);
  });

  it('uses the only returned date when keys differ by timezone', () => {
    const slots = parseFreeSlotsForDate(
      {
        '2026-06-04': { slots: ['2026-06-04T14:45:00-04:00'] },
      },
      '2026-06-03',
    );
    assert.equal(slots.length, 1);
  });
});

describe('validateScheduleForm', () => {
  it('requires slot in standard mode', () => {
    const state = defaultScheduleFormState('cal_1');
    assert.match(validateScheduleForm(state) ?? '', /slot/i);
  });
});
