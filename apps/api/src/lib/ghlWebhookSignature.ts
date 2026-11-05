import crypto from 'crypto';

function decodeSignature(signature: string): Buffer {
  const trimmed = signature.trim();
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    return Buffer.from(trimmed, 'hex');
  }
  return Buffer.from(trimmed, 'base64');
}

/**
 * Render / dotenv often store PEMs with literal `\n` instead of real newlines.
 * Node's crypto rejects those keys, which made every signed GHL webhook return 401.
 */
export function normalizePemKey(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .trim();
}

function parsePublicKey(raw: string): crypto.KeyObject {
  const trimmed = normalizePemKey(raw);
  if (trimmed.includes('BEGIN')) {
    return crypto.createPublicKey(trimmed);
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const rawKey = Buffer.from(trimmed, 'hex');
    const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
    return crypto.createPublicKey({
      key: Buffer.concat([spkiPrefix, rawKey]),
      format: 'der',
      type: 'spki',
    });
  }
  try {
    const der = Buffer.from(trimmed, 'base64');
    return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
  } catch {
    return crypto.createPublicKey(trimmed);
  }
}

/** True when WEBHOOK_SIGNATURE_PUBLIC_KEY can be loaded by Node crypto. */
export function isWebhookPublicKeyParsable(raw?: string | null): boolean {
  if (!raw?.trim()) return false;
  try {
    parsePublicKey(raw);
    return true;
  } catch {
    return false;
  }
}

/** Verifies GHL x-ghl-signature (Ed25519) against the raw request body. */
export function verifyEd25519WebhookSignature(
  rawBody: Buffer,
  signature: string,
  publicKeyPem: string,
): boolean {
  try {
    const key = parsePublicKey(publicKeyPem);
    const sig = decodeSignature(signature);
    return crypto.verify(null, rawBody, key, sig);
  } catch {
    return false;
  }
}

/** Verifies legacy GHL x-wh-signature (RSA-SHA256) against the raw request body. */
export function verifyRsaWebhookSignature(
  rawBody: Buffer,
  signature: string,
  publicKeyPem: string,
): boolean {
  try {
    const key = parsePublicKey(publicKeyPem);
    const sig = decodeSignature(signature);
    return crypto.verify('RSA-SHA256', rawBody, key, sig);
  } catch {
    return false;
  }
}
