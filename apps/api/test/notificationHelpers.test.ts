import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appointmentNotificationDedupeKey,
  conversationNotificationDedupeKey,
  coerceNotificationOccurredAt,
  firstNotificationOccurredAt,
  notificationVisibilityFilter,
  resolveNotificationOccurredAt,
  taskNotificationDedupeKey,
} from '../src/lib/notificationHelpers';

describe('notificationHelpers', () => {
  it('uses one dedupe key per conversation', () => {
    assert.equal(
      conversationNotificationDedupeKey('con_123'),
      'conversation:unread:con_123',
    );
  });

  it('uses stable task and appointment dedupe keys', () => {
    assert.equal(taskNotificationDedupeKey('t1'), 'task:t1');
    assert.equal(appointmentNotificationDedupeKey('a1'), 'appointment:a1');
  });

  it('shows all location notifications when ghl user is not linked', () => {
    assert.deepEqual(
      notificationVisibilityFilter({ role: 'staff', ghlUserId: undefined }),
      {},
    );
  });

  it('scopes staff notifications to assignee and untargeted rows', () => {
    const filter = notificationVisibilityFilter({ role: 'staff', ghlUserId: 'ghl_1' });
    assert.ok(Array.isArray(filter.$or));
    assert.equal((filter.$or as unknown[]).length, 3);
  });

  it('prefers primary occurredAt over fallback', () => {
    const date = resolveNotificationOccurredAt(
      '2026-06-01T12:00:00.000Z',
      '2026-06-02T12:00:00.000Z',
    );
    assert.equal(date.toISOString(), '2026-06-01T12:00:00.000Z');
  });

  it('coerces unknown task timestamps', () => {
    assert.equal(firstNotificationOccurredAt(undefined, '2026-06-02T12:00:00.000Z'), '2026-06-02T12:00:00.000Z');
    assert.equal(coerceNotificationOccurredAt(1_714_000_000_000), new Date(1_714_000_000_000).toISOString());
  });
});
