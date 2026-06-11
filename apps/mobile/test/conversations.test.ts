import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildConversationsQuery,
  normalizeConversationCursor,
  buildSendMessagePayload,
  conversationNameInitials,
  formatConversationPreview,
  formatConversationWhen,
  resolveConversationContactId,
} from '../src/lib/conversations';

describe('buildConversationsQuery', () => {
  it('includes status=unread for unread filter', () => {
    assert.match(buildConversationsQuery({ filter: 'unread' }), /status=unread/);
  });

  it('includes status=starred for starred filter', () => {
    assert.match(buildConversationsQuery({ filter: 'starred' }), /status=starred/);
  });

  it('omits status for all', () => {
    assert.doesNotMatch(buildConversationsQuery({ filter: 'all' }), /status=/);
  });

  it('encodes search query', () => {
    assert.equal(buildConversationsQuery({ query: 'a b' }), 'limit=60&query=a%20b');
  });

  it('includes assignedTo when provided', () => {
    assert.match(buildConversationsQuery({ assignedTo: 'user_1' }), /assignedTo=user_1/);
  });

  it('encodes numeric startAfterDate cursors from GHL', () => {
    const qs = buildConversationsQuery({ startAfterDate: 1_714_000_000_000 });
    assert.match(qs, /startAfterDate=/);
    assert.doesNotThrow(() => new URLSearchParams(qs.split('&').pop() ?? ''));
  });
});

describe('normalizeConversationCursor', () => {
  it('accepts ISO strings', () => {
    assert.equal(normalizeConversationCursor('2026-04-24T12:00:00.000Z'), '2026-04-24T12:00:00.000Z');
  });

  it('converts epoch milliseconds', () => {
    assert.equal(
      normalizeConversationCursor(1_714_000_000_000),
      new Date(1_714_000_000_000).toISOString(),
    );
  });
});

describe('conversation formatting', () => {
  it('builds initials from contact name', () => {
    assert.equal(conversationNameInitials('Jefferson Henry'), 'JH');
  });

  it('formats call previews', () => {
    assert.equal(
      formatConversationPreview({ id: '1', lastMessageType: 'TYPE_CALL' }),
      'Call',
    );
  });

  it('formats historical dates with slashes', () => {
    const formatted = formatConversationWhen('2020-01-15T18:00:00.000Z');
    assert.match(formatted, /\d{2}\/\d{2}\/\d{2}/);
  });
});

describe('buildSendMessagePayload', () => {
  it('builds SMS payload with fromNumber', () => {
    const body = buildSendMessagePayload({
      channel: 'SMS',
      contactId: 'c1',
      message: 'Hi',
      fromNumber: '+14075551234',
      toNumber: '+923129198015',
      conversationId: 'conv_1',
    });
    assert.equal(body.type, 'SMS');
    assert.equal(body.fromNumber, '+14075551234');
    assert.equal(body.toNumber, '+923129198015');
    assert.equal(body.conversationId, 'conv_1');
  });

  it('includes attachment urls when provided', () => {
    const payload = buildSendMessagePayload({
      channel: 'SMS',
      contactId: 'c1',
      message: 'Hi',
      attachments: ['https://cdn.example.com/a.jpg'],
    });
    assert.deepEqual(payload.attachments, ['https://cdn.example.com/a.jpg']);
  });

  it('builds Email with subject and html', () => {
    const body = buildSendMessagePayload({
      channel: 'Email',
      contactId: 'c1',
      message: 'Hello',
      subject: 'Test',
    });
    assert.equal(body.type, 'Email');
    assert.equal(body.subject, 'Test');
    assert.match(String(body.html), /Hello/);
  });
});

describe('resolveConversationContactId', () => {
  it('prefers explicit contact id', () => {
    assert.equal(
      resolveConversationContactId('con_1', [{ contactId: 'con_2' }]),
      'con_1',
    );
  });

  it('falls back to message contact id', () => {
    assert.equal(
      resolveConversationContactId(undefined, [{ contactId: 'con_from_msg' }]),
      'con_from_msg',
    );
  });
});
