import assert from 'node:assert/strict';
import crypto from 'crypto';
import { describe, it } from 'node:test';
import { assertGhlWebhookAuthorized } from '../src/lib/webhookAuth';
import {
  verifyEd25519WebhookSignature,
  verifyRsaWebhookSignature,
} from '../src/lib/ghlWebhookSignature';

function mockReq(headers: Record<string, string> = {}) {
  return { headers } as import('express').Request;
}

describe('ghlWebhookSignature', () => {
  it('verifies Ed25519 signatures', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const rawBody = Buffer.from('{"type":"InboundMessage"}', 'utf8');
    const signature = crypto.sign(null, rawBody, privateKey).toString('base64');
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    assert.equal(verifyEd25519WebhookSignature(rawBody, signature, pem), true);
    const { publicKey: otherKey, privateKey: otherPrivate } = crypto.generateKeyPairSync('ed25519');
    const badSignature = crypto.sign(null, rawBody, otherPrivate).toString('base64');
    const otherPem = otherKey.export({ type: 'spki', format: 'pem' }).toString();
    assert.equal(verifyEd25519WebhookSignature(rawBody, badSignature, pem), false);
    assert.equal(verifyEd25519WebhookSignature(rawBody, signature, otherPem), false);
  });

  it('verifies RSA-SHA256 signatures', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const rawBody = Buffer.from('{"type":"Install"}', 'utf8');
    const signature = crypto.sign('RSA-SHA256', rawBody, privateKey).toString('base64');
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    assert.equal(verifyRsaWebhookSignature(rawBody, signature, pem), true);
  });
});

describe('assertGhlWebhookAuthorized', () => {
  it('allows dev requests when no credentials are configured', () => {
    const raw = Buffer.from('{}');
    assert.doesNotThrow(() => assertGhlWebhookAuthorized(mockReq(), raw));
  });

  it('accepts matching x-ghl-webhook-secret when configured', () => {
    const prev = process.env.GHL_WEBHOOK_SECRET;
    process.env.GHL_WEBHOOK_SECRET = 'test-secret';
    const raw = Buffer.from('{}');
    try {
      assert.doesNotThrow(() =>
        assertGhlWebhookAuthorized(mockReq({ 'x-ghl-webhook-secret': 'test-secret' }), raw),
      );
    } finally {
      if (prev === undefined) delete process.env.GHL_WEBHOOK_SECRET;
      else process.env.GHL_WEBHOOK_SECRET = prev;
    }
  });

  it('accepts valid Ed25519 signature when public key is configured', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const rawBody = Buffer.from('{"type":"InboundMessage"}', 'utf8');
    const signature = crypto.sign(null, rawBody, privateKey).toString('base64');

    const prevKey = process.env.WEBHOOK_SIGNATURE_PUBLIC_KEY;
    const prevSecret = process.env.GHL_WEBHOOK_SECRET;
    delete process.env.GHL_WEBHOOK_SECRET;
    process.env.WEBHOOK_SIGNATURE_PUBLIC_KEY = pem;
    try {
      assert.doesNotThrow(() =>
        assertGhlWebhookAuthorized(mockReq({ 'x-ghl-signature': signature }), rawBody),
      );
    } finally {
      if (prevKey === undefined) delete process.env.WEBHOOK_SIGNATURE_PUBLIC_KEY;
      else process.env.WEBHOOK_SIGNATURE_PUBLIC_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.GHL_WEBHOOK_SECRET;
      else process.env.GHL_WEBHOOK_SECRET = prevSecret;
    }
  });
});
