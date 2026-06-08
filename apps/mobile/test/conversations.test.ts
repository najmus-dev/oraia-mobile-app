import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildConversationsQuery,
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
    });
    assert.equal(body.type, 'SMS');
    assert.equal(body.fromNumber, '+14075551234');
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
