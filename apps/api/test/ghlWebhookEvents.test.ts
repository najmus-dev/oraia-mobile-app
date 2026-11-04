import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyInboundChannel,
  inboundMessagePreview,
  inboundNotificationCopy,
  isConversationUnreadEvent,
  isInboundDirection,
  isInboundMessageEvent,
  normalizeWebhookEventType,
  parseConversationUnread,
  parseInboundMessage,
  unwrapWebhookPayload,
} from '../src/lib/ghlWebhookEvents';
import { localDayBounds, parseTzOffsetQuery } from '../src/lib/dashboardDayBounds';

describe('ghlWebhookEvents', () => {
  it('detects InboundMessage events', () => {
    assert.equal(isInboundMessageEvent('InboundMessage'), true);
    assert.equal(isInboundMessageEvent('INBOUNDMESSAGE'), true);
    assert.equal(isInboundMessageEvent('Inbound Message'), true);
    assert.equal(isInboundMessageEvent('Install'), false);
  });

  it('detects conversation unread events', () => {
    assert.equal(isConversationUnreadEvent('ConversationUnreadUpdate'), true);
    assert.equal(isConversationUnreadEvent('ConversationUnread'), true);
    assert.equal(isConversationUnreadEvent('InboundMessage'), false);
  });

  it('normalizes webhook type fields', () => {
    assert.equal(normalizeWebhookEventType({ type: 'InboundMessage' }), 'InboundMessage');
    assert.equal(normalizeWebhookEventType({ event: 'INSTALL' }), 'INSTALL');
  });

  it('unwraps nested GHL data payloads', () => {
    const flat = unwrapWebhookPayload({
      type: 'InboundMessage',
      data: {
        locationId: 'loc_1',
        conversationId: 'convo_1',
        messageType: 'SMS',
        body: 'Hello there',
      },
    });
    assert.equal(flat.type, 'InboundMessage');
    assert.equal(flat.locationId, 'loc_1');
    assert.equal(flat.messageType, 'SMS');
  });

  it('parses inbound SMS payload', () => {
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
    assert.equal(inboundNotificationCopy(parsed!).title, 'SMS from a contact');
    assert.equal(inboundNotificationCopy(parsed!).channel, 'messages');
  });

  it('parses nested inbound SMS from official GHL example fields', () => {
    const parsed = parseInboundMessage({
      type: 'InboundMessage',
      data: {
        locationId: 'l1C08ntBrFjLS0elLIYU',
        conversationId: 'fcanlLgpbQgQhderivVs',
        body: 'This is a test message',
        messageType: 'SMS',
        direction: 'inbound',
        from: '+15551234567',
        messageTypeString: 'TYPE_SMS',
      },
    });
    assert.equal(parsed?.conversationId, 'fcanlLgpbQgQhderivVs');
    assert.equal(inboundNotificationCopy(parsed!).title, 'SMS from +15551234567');
  });

  it('parses inbound completed call like GHL docs', () => {
    const parsed = parseInboundMessage({
      type: 'InboundMessage',
      locationId: '0d48aEf7q67DAu134bpy',
      conversationId: 'SGDqZrzmwTr19d10aHkt9F',
      messageType: 'CALL',
      userId: 'xsmF1xxhmC92ZpL1lj7aLa',
      messageId: 'tyW42xCD0HQpb3hhfLcx',
      status: 'completed',
      callDuration: 120,
      callStatus: 'completed',
      from: '+15551234567',
      messageTypeString: 'TYPE_CALL',
    });
    assert.equal(parsed?.assignedTo, 'xsmF1xxhmC92ZpL1lj7aLa');
    assert.equal(classifyInboundChannel(parsed!), 'call');
    const copy = inboundNotificationCopy(parsed!);
    assert.equal(copy.title, 'Call from +15551234567');
    assert.equal(copy.body, '2m 0s');
    assert.equal(copy.channel, 'calls');
  });

  it('parses voicemail as a call alert', () => {
    const parsed = parseInboundMessage({
      type: 'InboundMessage',
      locationId: 'loc_1',
      conversationId: 'convo_1',
      messageType: 'CALL',
      status: 'voicemail',
      callStatus: 'voicemail',
      from: '+15551234567',
      messageTypeString: 'TYPE_VOICEMAIL',
    });
    assert.equal(classifyInboundChannel(parsed!), 'voicemail');
    const copy = inboundNotificationCopy(parsed!);
    assert.equal(copy.title, 'Voicemail from +15551234567');
    assert.equal(copy.channel, 'calls');
  });

  it('treats missed call status as a missed-call title', () => {
    const copy = inboundNotificationCopy({
      locationId: 'loc_1',
      conversationId: 'convo_1',
      messageType: 'CALL',
      status: 'no-answer',
      from: 'Sam',
    });
    assert.equal(copy.title, 'Missed call from Sam');
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

  it('parses conversation unread updates', () => {
    const parsed = parseConversationUnread({
      type: 'ConversationUnreadUpdate',
      locationId: 'loc_1',
      id: 'convo_9',
      contactId: 'c1',
      unreadCount: 2,
    });
    assert.equal(parsed?.conversationId, 'convo_9');
    assert.equal(parsed?.unreadCount, 2);
  });

  it('treats missing direction as inbound', () => {
    assert.equal(isInboundDirection(undefined), true);
    assert.equal(isInboundDirection('outbound'), false);
    assert.equal(isInboundDirection('inbound'), true);
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
