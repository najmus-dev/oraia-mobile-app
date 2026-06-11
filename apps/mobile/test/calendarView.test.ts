import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clampDayInMonth,
  calendarLoadingState,
  collectMarkedDates,
  computeCalendarFetchRange,
  filterEventsForView,
  mergeCalendarOptions,
  shiftVisibleMonth,
} from '../src/lib/calendarView';
import { endOfMonth, startOfMonth } from '../src/lib/dates';

const sampleEvents = [
  { id: 'e1', title: 'June 11', startTime: '2026-06-11T18:45:00.000Z' },
  { id: 'e2', title: 'July 2', startTime: '2026-07-02T14:00:00.000Z' },
  { id: 'e3', title: 'No time' },
];

describe('computeCalendarFetchRange', () => {
  it('uses week bounds for weekly view', () => {
    const anchor = new Date(2026, 5, 11);
    const { start, end } = computeCalendarFetchRange('weekly', anchor);
    assert.equal(start.getDay(), 0);
    assert.equal(end.getDay(), 6);
  });

  it('uses month plus buffer for list and monthly views', () => {
    const anchor = new Date(2026, 5, 11);
    const { start, end } = computeCalendarFetchRange('monthly', anchor);
    assert.equal(start.getTime(), startOfMonth(anchor).getTime());
    assert.ok(end.getTime() > endOfMonth(anchor).getTime());
  });
});

describe('filterEventsForView', () => {
  it('shows only events in the visible month for monthly view', () => {
    const anchor = new Date(2026, 5, 1);
    const filtered = filterEventsForView(sampleEvents, 'monthly', anchor);
    assert.deepEqual(filtered.map((e) => e.id), ['e1']);
  });

  it('shows only events in the visible week for weekly view', () => {
    const anchor = new Date(2026, 5, 11);
    const filtered = filterEventsForView(sampleEvents, 'weekly', anchor);
    assert.deepEqual(filtered.map((e) => e.id), ['e1']);
  });

  it('drops events without startTime', () => {
    const filtered = filterEventsForView(sampleEvents, 'list', new Date(2026, 5, 1));
    assert.equal(filtered.some((e) => e.id === 'e3'), false);
  });
});

describe('clampDayInMonth', () => {
  it('clamps Jan 31 to Feb 28 in non-leap years', () => {
    const day = new Date(2025, 0, 31);
    const target = new Date(2025, 1, 1);
    const next = clampDayInMonth(day, target);
    assert.equal(next.getMonth(), 1);
    assert.equal(next.getDate(), 28);
  });
});

describe('shiftVisibleMonth', () => {
  it('moves to the next month while keeping day when possible', () => {
    const anchor = new Date(2026, 5, 11);
    const next = shiftVisibleMonth(anchor, 1);
    assert.equal(next.getMonth(), 6);
    assert.equal(next.getDate(), 11);
  });
});

describe('collectMarkedDates', () => {
  it('marks days that have events', () => {
    const marks = collectMarkedDates(sampleEvents);
    assert.equal(marks.has('2026-06-11'), true);
    assert.equal(marks.has('2026-07-02'), true);
  });
});

describe('mergeCalendarOptions', () => {
  it('merges by id and prefers incoming names', () => {
    const merged = mergeCalendarOptions(
      [{ id: 'cal_a', name: 'Old A' }],
      [
        { id: 'cal_a', name: 'Calendar A' },
        { id: 'cal_b', name: 'Calendar B' },
      ],
    );
    assert.equal(merged.length, 2);
    assert.equal(merged.find((c) => c.id === 'cal_a')?.name, 'Calendar A');
  });
});

describe('calendarLoadingState', () => {
  it('blocks only on first load', () => {
    const state = calendarLoadingState(true, null, 'week|a|b|all');
    assert.equal(state.blocking, true);
    assert.equal(state.updating, false);
    assert.equal(state.showEmpty, false);
  });

  it('shows updating overlay while fetching a new range', () => {
    const state = calendarLoadingState(true, 'month|old|old|all', 'week|a|b|all');
    assert.equal(state.blocking, false);
    assert.equal(state.updating, true);
    assert.equal(state.showEmpty, false);
  });

  it('allows empty state only when range is ready', () => {
    const key = 'week|a|b|all';
    const loading = calendarLoadingState(false, key, key);
    assert.equal(loading.showEmpty, true);
    assert.equal(calendarLoadingState(true, key, key).showEmpty, false);
  });
});
