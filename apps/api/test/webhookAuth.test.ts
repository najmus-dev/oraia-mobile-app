import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertGhlWebhookAuthorized } from '../src/lib/webhookAuth';

function mockReq(headers: Record<string, string> = {}) {
  return { headers } as import('express').Request;
}

describe('assertGhlWebhookAuthorized', () => {
  it('allows dev requests when secret is unset', () => {
    assert.doesNotThrow(() => assertGhlWebhookAuthorized(mockReq()));
  });

  it('accepts matching x-ghl-webhook-secret when configured', () => {
    const prev = process.env.GHL_WEBHOOK_SECRET;
    process.env.GHL_WEBHOOK_SECRET = 'test-secret';
    try {
      assert.doesNotThrow(() =>
        assertGhlWebhookAuthorized(mockReq({ 'x-ghl-webhook-secret': 'test-secret' })),
      );
    } finally {
      if (prev === undefined) delete process.env.GHL_WEBHOOK_SECRET;
      else process.env.GHL_WEBHOOK_SECRET = prev;
    }
  });
});
