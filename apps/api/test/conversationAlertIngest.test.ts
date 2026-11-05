import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isRecentConversationActivity,
  mergeConversations,
  shouldIngestConversation,
} from '../src/services/conversationAlertIngest';
import type { GhlConversation } from '../src/services/ghl/types';

describe('conversationAlertIngest', () => {
  it('keeps inbound and unknown-direction SMS', () => {
    assert.equal(
      shouldIngestConversation({
        id: 'c1',
        lastMessageDirection: 'inbound',
        lastMessageType: 'TYPE_SMS',
      }),
      true,
    );
    assert.equal(
      shouldIngestConversation({
        id: 'c2',
        lastMessageType: 'TYPE_SMS',
      }),
      true,
    );
  });

  it('skips clear outbound SMS but keeps outbound calls', () => {
    assert.equal(
      shouldIngestConversation({
        id: 'c3',
        lastMessageDirection: 'outbound',
        lastMessageType: 'TYPE_SMS',
      }),
      false,
    );
    assert.equal(
      shouldIngestConversation({
        id: 'c4',
        lastMessageDirection: 'outbound',
        lastMessageType: 'TYPE_CALL',
      }),
      true,
    );
  });

  it('treats missing dates as recent', () => {
    assert.equal(isRecentConversationActivity(undefined), true);
  });

  it('merges recent + unread preferring newer activity', () => {
    const older: GhlConversation = {
      id: 'same',
      lastMessageDate: '2020-01-01T00:00:00.000Z',
      lastMessageBody: 'old',
      lastMessageDirection: 'inbound',
    };
    const newer: GhlConversation = {
      id: 'same',
      lastMessageDate: '2026-01-01T00:00:00.000Z',
      lastMessageBody: 'new',
      lastMessageDirection: 'inbound',
    };
    const merged = mergeConversations([older], [newer]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.lastMessageBody, 'new');
  });
});
