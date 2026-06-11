import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildGhlSendMessagePayload } from '../src/lib/buildGhlSendMessagePayload';

describe('buildGhlSendMessagePayload', () => {
  it('forwards SMS routing fields to GHL', () => {
    const payload = buildGhlSendMessagePayload({
      type: 'SMS',
      contactId: 'c1',
      message: 'Hello',
      fromNumber: '+13213212591',
      toNumber: '+923129198015',
      conversationId: 'conv_1',
    });
    assert.equal(payload.type, 'SMS');
    assert.equal(payload.contactId, 'c1');
    assert.equal(payload.message, 'Hello');
    assert.equal(payload.fromNumber, '+13213212591');
    assert.equal(payload.toNumber, '+923129198015');
    assert.equal(payload.conversationId, 'conv_1');
  });

  it('forwards email fields', () => {
    const payload = buildGhlSendMessagePayload({
      type: 'Email',
      contactId: 'c1',
      message: 'Hello',
      subject: 'Hi',
      html: '<p>Hello</p>',
      emailFrom: 'noreply@example.com',
    });
    assert.equal(payload.subject, 'Hi');
    assert.equal(payload.html, '<p>Hello</p>');
    assert.equal(payload.emailFrom, 'noreply@example.com');
  });

  it('filters invalid attachment urls', () => {
    const payload = buildGhlSendMessagePayload({
      type: 'SMS',
      contactId: 'c1',
      message: 'Hi',
      attachments: ['https://cdn.example.com/a.jpg', 'ftp://bad', 1],
    });
    assert.deepEqual(payload.attachments, ['https://cdn.example.com/a.jpg']);
  });
});
