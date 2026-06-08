import type { Request } from 'express';
import { config } from '../config';
import { AppError } from './errors';

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

/**
 * Verifies GHL webhook requests.
 * - Production: secret must be configured and header must match.
 * - Development: if secret is unset, allow local curl testing; if set, require match.
 */
export function assertGhlWebhookAuthorized(req: Request): void {
  const configured = config.webhooks.secret;
  const provided = readWebhookSecretHeader(req);

  if (config.isProduction) {
    if (!configured) {
      throw new AppError(503, 'GHL_WEBHOOK_SECRET must be configured in production', 'WEBHOOK_MISCONFIGURED');
    }
    if (provided !== configured) {
      throw new AppError(401, 'Invalid webhook secret', 'WEBHOOK_UNAUTHORIZED');
    }
    return;
  }

  if (configured && provided !== configured) {
    throw new AppError(401, 'Invalid webhook secret', 'WEBHOOK_UNAUTHORIZED');
  }
}
