import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatMessageBodyForDisplay, stripSmsComplianceFooter } from '../src/lib/smsCompliance';

describe('stripSmsComplianceFooter', () => {
  it('removes GHL opt-out footer', () => {
    const raw = 'Test\nReply STOP to unsubscribe.\nThanks, ORAIA CRM';
    assert.equal(stripSmsComplianceFooter(raw), 'Test');
  });

  it('leaves inbound messages unchanged', () => {
    assert.equal(stripSmsComplianceFooter('Hello there'), 'Hello there');
  });
});

describe('formatMessageBodyForDisplay', () => {
  it('returns undefined for empty input', () => {
    assert.equal(formatMessageBodyForDisplay('   '), undefined);
  });
});
