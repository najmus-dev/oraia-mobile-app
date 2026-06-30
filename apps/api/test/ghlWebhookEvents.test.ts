import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  inboundMessagePreview,
  isInboundMessageEvent,
  normalizeWebhookEventType,
  parseInboundMessage,
} from '../src/lib/ghlWebhookEvents';
import { localDayBounds, parseTzOffsetQuery } from '../src/lib/dashboardDayBounds';

describe('ghlWebhookEvents', () => {
  it('detects InboundMessage events', () => {
    assert.equal(isInboundMessageEvent('InboundMessage'), true);
    assert.equal(isInboundMessageEvent('INBOUNDMESSAGE'), true);
    assert.equal(isInboundMessageEvent('Install'), false);
  });

  it('normalizes webhook type fields', () => {
    assert.equal(normalizeWebhookEventType({ type: 'InboundMessage' }), 'InboundMessage');
    assert.equal(normalizeWebhookEventType({ event: 'INSTALL' }), 'INSTALL');
  });

  it('parses inbound message payload', () => {
    const parsed = parseInboundMessage({
      type: 'InboundMessage',
      locationId: 'loc_1',
      conversationId: 'convo_1',
      contactId: 'contact_1',
      messageId: 'msg_1',
      assignedTo: 'user_1',
      body: 'Hello there',
      messageType: 'SMS',
    });
    assert.equal(parsed?.locationId, 'loc_1');
    assert.equal(parsed?.conversationId, 'convo_1');
    assert.equal(parsed?.messageId, 'msg_1');
    assert.equal(parsed?.assignedTo, 'user_1');
    assert.equal(inboundMessagePreview(parsed!), 'Hello there');
  });

  it('falls back to userId when assignedTo is absent', () => {
    const parsed = parseInboundMessage({
      type: 'InboundMessage',
      locationId: 'loc_1',
      conversationId: 'convo_1',
      userId: 'user_99',
      body: 'Hi',
    });
    assert.equal(parsed?.assignedTo, 'user_99');
  });

  it('strips html from email preview', () => {
    const preview = inboundMessagePreview({
      locationId: 'loc_1',
      conversationId: 'convo_1',
      messageType: 'Email',
      body: '<div>Order confirmed</div>',
    });
    assert.equal(preview, 'Order confirmed');
  });
});

describe('dashboardDayBounds', () => {
  it('parses tz offset query', () => {
    assert.equal(parseTzOffsetQuery('300'), 300);
    assert.equal(parseTzOffsetQuery('9999'), 840);
  });

  it('builds a 24h local day window', () => {
    const { start, end } = localDayBounds(0, new Date('2026-06-08T15:00:00.000Z'));
    assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60_000 - 1);
  });
});
