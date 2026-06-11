import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canSendEmail,
  canSendSms,
  formatDeliveryStatus,
  formatMessageChannelLabel,
  formatMessageMeta,
  isActivityMessage,
  isImageAttachmentUrl,
  isOutboundMessage,
  isUndeliveredMessage,
  resolveMessageChannel,
  resolveSendChannels,
  smsSegmentInfo,
} from '../src/lib/messageFormat';

describe('isUndeliveredMessage', () => {
  it('detects failed outbound SMS', () => {
    assert.equal(
      isUndeliveredMessage({ direction: 'outbound', status: 'failed', messageType: 'TYPE_SMS' }),
      true,
    );
    assert.equal(
      isUndeliveredMessage({ direction: 'inbound', status: 'failed', messageType: 'TYPE_SMS' }),
      false,
    );
  });
});

describe('isOutboundMessage', () => {
  it('detects outbound directions', () => {
    assert.equal(isOutboundMessage('outbound'), true);
    assert.equal(isOutboundMessage('outgoing'), true);
    assert.equal(isOutboundMessage('inbound'), false);
  });
});

describe('formatDeliveryStatus', () => {
  it('maps known statuses', () => {
    assert.equal(formatDeliveryStatus('delivered'), 'Delivered');
    assert.equal(formatDeliveryStatus('failed'), 'Failed');
  });
});

describe('smsSegmentInfo', () => {
  it('counts segments', () => {
    assert.deepEqual(smsSegmentInfo(''), { length: 0, segments: 0 });
    assert.equal(smsSegmentInfo('x'.repeat(161)).segments, 2);
  });
});

describe('canSendEmail', () => {
  it('requires email', () => {
    assert.equal(canSendEmail('').ok, false);
    assert.equal(canSendEmail('a@b.com').ok, true);
  });
});

describe('canSendSms', () => {
  it('requires phone', () => {
    assert.equal(canSendSms(undefined).ok, false);
    assert.equal(canSendSms('+15551234567').ok, true);
  });
});

describe('formatMessageChannelLabel', () => {
  it('maps GHL activity messages', () => {
    assert.equal(formatMessageChannelLabel('TYPE_ACTIVITY'), 'Activity');
  });
});

describe('formatMessageMeta', () => {
  it('omits delivery status for activity messages', () => {
    const meta = formatMessageMeta({
      id: '1',
      messageType: 'TYPE_ACTIVITY',
      direction: 'outbound',
      status: 'sent',
      dateAdded: '2026-06-03T16:22:00.000Z',
    });
    assert.match(meta, /Activity/);
    assert.doesNotMatch(meta, /Sent/);
  });
});

describe('resolveSendChannels', () => {
  it('includes only channels the contact supports', () => {
    assert.deepEqual(resolveSendChannels('+15551234567', undefined), ['SMS']);
    assert.deepEqual(resolveSendChannels(undefined, 'a@b.com'), ['Email']);
    assert.deepEqual(resolveSendChannels('+1', 'a@b.com'), ['SMS', 'Email']);
  });
});

describe('resolveMessageChannel', () => {
  it('falls back when preferred channel is unavailable', () => {
    assert.equal(resolveMessageChannel('Email', '+1', undefined), 'SMS');
    assert.equal(resolveMessageChannel('SMS', undefined, 'a@b.com'), 'Email');
    assert.equal(resolveMessageChannel('Email', '+1', 'a@b.com'), 'Email');
  });
});

describe('isActivityMessage', () => {
  it('detects activity types', () => {
    assert.equal(isActivityMessage('TYPE_ACTIVITY'), true);
    assert.equal(isActivityMessage('TYPE_SMS'), false);
  });
});

describe('isImageAttachmentUrl', () => {
  it('detects common image extensions', () => {
    assert.equal(isImageAttachmentUrl('https://cdn.example.com/a.jpg'), true);
    assert.equal(isImageAttachmentUrl('https://cdn.example.com/doc.pdf'), false);
  });
});
