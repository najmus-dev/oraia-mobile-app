import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeConversationDate } from '../src/lib/conversationDates';

describe('normalizeConversationDate', () => {
  it('trims ISO strings', () => {
    assert.equal(normalizeConversationDate(' 2026-04-24T12:00:00.000Z '), '2026-04-24T12:00:00.000Z');
  });

  it('converts epoch milliseconds to ISO', () => {
    assert.equal(
      normalizeConversationDate(1_714_000_000_000),
      new Date(1_714_000_000_000).toISOString(),
    );
  });

  it('returns undefined for invalid values', () => {
    assert.equal(normalizeConversationDate(undefined), undefined);
    assert.equal(normalizeConversationDate(''), undefined);
    assert.equal(normalizeConversationDate(NaN), undefined);
  });
});
