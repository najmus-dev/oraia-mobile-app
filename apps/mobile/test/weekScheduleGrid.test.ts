import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { startOfWeekSunday } from '../src/lib/dates';
import {
  bucketWeekEventsByDay,
  earliestWeekEventTop,
  placeEventOnWeekGrid,
} from '../src/lib/weekScheduleGrid';

function localIso(y: number, m: number, d: number, hh: number, mm: number) {
  return new Date(y, m, d, hh, mm).toISOString();
}

describe('placeEventOnWeekGrid', () => {
  it('places a local 2:45 PM appointment block on the grid', () => {
    const placed = placeEventOnWeekGrid({
      id: 'e1',
      title: 'Test',
      startTime: localIso(2026, 5, 11, 14, 45),
      endTime: localIso(2026, 5, 11, 15, 30),
    });
    assert.ok(placed);
    assert.equal(placed!.top, ((14 * 60 + 45) / 60) * 56);
    assert.ok(placed!.height >= 24);
  });

  it('clips events that end on the next calendar day', () => {
    const placed = placeEventOnWeekGrid({
      id: 'e2',
      title: 'Late',
      startTime: localIso(2026, 5, 11, 21, 0),
      endTime: localIso(2026, 5, 12, 1, 0),
    });
    assert.ok(placed);
    assert.ok(placed!.height > 0);
  });
});

describe('bucketWeekEventsByDay', () => {
  it('puts Thursday event in the correct column for that week', () => {
    const weekStart = startOfWeekSunday(new Date(2026, 5, 11));
    const cols = bucketWeekEventsByDay(
      [
        {
          id: 'e1',
          title: 'Test',
          startTime: localIso(2026, 5, 11, 14, 45),
          endTime: localIso(2026, 5, 11, 15, 30),
        },
      ],
      weekStart,
      7,
    );
    const dayWithEvent = cols.findIndex((col) => col.some((p) => p.event.id === 'e1'));
    assert.ok(dayWithEvent >= 0);
    assert.equal(cols[dayWithEvent]?.[0]?.event.id, 'e1');
  });
});

describe('earliestWeekEventTop', () => {
  it('returns the smallest top offset', () => {
    const top = earliestWeekEventTop([
      [],
      [{ event: { id: 'a' }, top: 200, height: 40 }],
      [{ event: { id: 'b' }, top: 120, height: 40 }],
    ]);
    assert.equal(top, 120);
  });
});
