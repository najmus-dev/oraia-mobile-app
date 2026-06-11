import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertFreeSlotsRange,
  normalizeFreeSlotsRange,
  parseFreeSlotsQuery,
  toGhlEventQueryMillis,
} from '../src/lib/calendarFreeSlots';

describe('normalizeFreeSlotsRange', () => {
  it('converts unix seconds to milliseconds for GHL', () => {
    const { startDate, endDate } = normalizeFreeSlotsRange(1748908800, 1748995199);
    assert.equal(startDate, 1748908800000);
    assert.equal(endDate, 1748995199000);
  });

  it('leaves millisecond values unchanged', () => {
    const { startDate, endDate } = normalizeFreeSlotsRange(1748908800000, 1748995199999);
    assert.equal(startDate, 1748908800000);
    assert.equal(endDate, 1748995199999);
  });
});

describe('assertFreeSlotsRange', () => {
  it('rejects ranges over 31 days', () => {
    assert.throws(() => assertFreeSlotsRange(0, 32 * 24 * 60 * 60 * 1000));
  });
});

describe('parseFreeSlotsQuery', () => {
  it('parses timezone and userId', () => {
    const query = parseFreeSlotsQuery({
      startDate: '1748908800000',
      endDate: '1748995199999',
      timezone: 'America/New_York',
      userId: 'user_1',
    });
    assert.equal(query.timezone, 'America/New_York');
    assert.equal(query.userId, 'user_1');
  });
});

describe('toGhlEventQueryMillis', () => {
  it('converts ISO 8601 to epoch milliseconds', () => {
    const iso = '2026-06-11T18:45:00.000Z';
    assert.equal(toGhlEventQueryMillis(iso), String(Date.parse(iso)));
  });

  it('passes through millisecond strings', () => {
    assert.equal(toGhlEventQueryMillis('1680373800000'), '1680373800000');
  });
});
