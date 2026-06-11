import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildInvertedThreadRows,
  mergeThreadMessages,
  prependOlderMessages,
  sortMessagesChronologically,
} from '../src/lib/threadMessages';
import type { ConversationMessage } from '../src/lib/conversations';

function msg(
  id: string,
  dateAdded: string,
  body = 'hi',
  direction: ConversationMessage['direction'] = 'inbound',
): ConversationMessage {
  return { id, body, dateAdded, direction, messageType: 'SMS' };
}

describe('sortMessagesChronologically', () => {
  it('orders oldest first with id tiebreaker', () => {
    const sorted = sortMessagesChronologically([
      msg('b', '2024-01-02T12:00:00.000Z'),
      msg('a', '2024-01-01T12:00:00.000Z'),
      msg('c', '2024-01-01T12:00:00.000Z'),
    ]);
    assert.deepEqual(sorted.map((m) => m.id), ['a', 'c', 'b']);
  });
});

describe('buildInvertedThreadRows', () => {
  it('puts newest message first for inverted list', () => {
    const rows = buildInvertedThreadRows([
      msg('1', '2024-01-01T10:00:00.000Z'),
      msg('2', '2024-01-02T10:00:00.000Z'),
    ]);
    assert.equal(rows[0].kind, 'message');
    if (rows[0].kind === 'message') assert.equal(rows[0].message.id, '2');
  });

  it('inserts day separators between day groups', () => {
    const rows = buildInvertedThreadRows([
      msg('1', '2024-01-01T10:00:00.000Z'),
      msg('2', '2024-01-02T10:00:00.000Z'),
      msg('3', '2024-01-02T11:00:00.000Z'),
    ]);
    const dayRows = rows.filter((r) => r.kind === 'day');
    assert.ok(dayRows.length >= 2);
  });
});

describe('mergeThreadMessages', () => {
  it('keeps paginated older messages on refresh', () => {
    const older = msg('old', '2024-01-01T10:00:00.000Z');
    const recent = msg('new', '2024-01-02T10:00:00.000Z');
    const merged = mergeThreadMessages([older, recent], [recent]);
    assert.deepEqual(merged.map((m) => m.id), ['old', 'new']);
  });

  it('drops optimistic pending when server confirms send', () => {
    const pending = {
      ...msg('pending-1', '2024-01-02T10:00:00.000Z', 'Hello', 'outbound'),
      id: 'pending-1',
    };
    const server = msg('srv-1', '2024-01-02T10:00:01.000Z', 'Hello', 'outbound');
    const merged = mergeThreadMessages([pending], [server]);
    assert.deepEqual(merged.map((m) => m.id), ['srv-1']);
  });

  it('drops optimistic pending when GHL appends SMS compliance footer', () => {
    const pending = {
      ...msg('pending-1', '2024-01-02T10:00:00.000Z', 'Test', 'outbound'),
      id: 'pending-1',
    };
    const server = msg(
      'srv-1',
      '2024-01-02T10:00:01.000Z',
      'Test\nReply STOP to unsubscribe.\nThanks, ORAIA CRM',
      'outbound',
    );
    const merged = mergeThreadMessages([pending], [server]);
    assert.deepEqual(merged.map((m) => m.id), ['srv-1']);
  });
});

describe('prependOlderMessages', () => {
  it('dedupes and sorts chronologically', () => {
    const result = prependOlderMessages(
      [msg('2', '2024-01-02T10:00:00.000Z')],
      [msg('1', '2024-01-01T10:00:00.000Z'), msg('2', '2024-01-02T10:00:00.000Z')],
    );
    assert.deepEqual(result.map((m) => m.id), ['1', '2']);
  });
});
