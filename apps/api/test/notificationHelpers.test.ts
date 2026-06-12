import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  conversationNotificationDedupeKey,
  coerceNotificationOccurredAt,
  firstNotificationOccurredAt,
  resolveNotificationOccurredAt,
} from '../src/lib/notificationHelpers';

describe('notificationHelpers', () => {
  it('uses one dedupe key per conversation', () => {
    assert.equal(
      conversationNotificationDedupeKey('con_123'),
      'conversation:unread:con_123',
    );
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
