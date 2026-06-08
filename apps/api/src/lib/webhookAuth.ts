import type { Request } from 'express';
import { config } from '../config';
import { AppError } from './errors';
import { verifyEd25519WebhookSignature, verifyRsaWebhookSignature } from './ghlWebhookSignature';

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

function readWebhookSecretHeader(req: Request): string | undefined {
  const direct = headerValue(req, 'x-ghl-webhook-secret') ?? headerValue(req, 'x-webhook-secret');
  if (direct) return direct;
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  return undefined;
}

function readWebhookSecrets() {
  return {
    secret: process.env.GHL_WEBHOOK_SECRET?.trim(),
    ed25519PublicKey: process.env.WEBHOOK_SIGNATURE_PUBLIC_KEY?.trim(),
    rsaPublicKey: process.env.WEBHOOK_PUBLIC_KEY?.trim(),
  };
}

function verifyGhlSignatures(req: Request, rawBody: Buffer): boolean {
  const ed25519Sig = headerValue(req, 'x-ghl-signature');
  const rsaSig = headerValue(req, 'x-wh-signature');
  const { ed25519PublicKey, rsaPublicKey } = readWebhookSecrets();

  if (ed25519Sig && ed25519PublicKey) {
    return verifyEd25519WebhookSignature(rawBody, ed25519Sig, ed25519PublicKey);
  }
  if (rsaSig && rsaPublicKey) {
    return verifyRsaWebhookSignature(rawBody, rsaSig, rsaPublicKey);
  }
  return false;
}

function hasSignatureConfig(): boolean {
  const { ed25519PublicKey, rsaPublicKey } = readWebhookSecrets();
  return Boolean(ed25519PublicKey || rsaPublicKey);
}

/**
 * Verifies GHL webhook requests against raw body bytes.
 * Priority: x-ghl-signature (Ed25519) → x-wh-signature (RSA) → legacy shared secret header.
 */
export function assertGhlWebhookAuthorized(req: Request, rawBody: Buffer): void {
  const { secret: configuredSecret } = readWebhookSecrets();
  const providedSecret = readWebhookSecretHeader(req);
  const signatureValid = verifyGhlSignatures(req, rawBody);
  const hasSigHeader =
    Boolean(headerValue(req, 'x-ghl-signature')) || Boolean(headerValue(req, 'x-wh-signature'));

  if (signatureValid) return;

  if (hasSigHeader && hasSignatureConfig()) {
    throw new AppError(401, 'Invalid webhook signature', 'WEBHOOK_UNAUTHORIZED');
  }

  if (configuredSecret && providedSecret === configuredSecret) return;

  if (config.isProduction) {
    if (hasSignatureConfig() || configuredSecret) {
      throw new AppError(401, 'Invalid webhook credentials', 'WEBHOOK_UNAUTHORIZED');
    }
    throw new AppError(
      503,
      'Configure WEBHOOK_SIGNATURE_PUBLIC_KEY or GHL_WEBHOOK_SECRET in production',
      'WEBHOOK_MISCONFIGURED',
    );
  }

  if (hasSigHeader || configuredSecret) {
    throw new AppError(401, 'Invalid webhook credentials', 'WEBHOOK_UNAUTHORIZED');
  }
}
