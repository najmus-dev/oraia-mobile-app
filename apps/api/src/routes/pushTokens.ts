import { Router } from 'express';
import { AppError } from '../lib/errors';
import { locationPost } from '../middleware/locationRoute';
import { registerPushToken, unregisterPushToken } from '../services/pushService';
import type { LocationScopedRequest } from '../middleware/location';

export const pushTokensRouter = Router();

function parsePlatform(value: unknown): 'ios' | 'android' | 'web' {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'ios' || raw === 'android' || raw === 'web') return raw;
  throw new AppError(400, 'platform must be ios, android, or web', 'VALIDATION_ERROR');
}

locationPost(pushTokensRouter, '/register', async (req: LocationScopedRequest, res) => {
  const body = req.body as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    throw new AppError(400, 'token is required', 'VALIDATION_ERROR');
  }
  const platform = parsePlatform(body.platform);
  const deviceName = typeof body.deviceName === 'string' ? body.deviceName.trim() : undefined;
  const userId = req.user!._id.toString();

  await registerPushToken({
    userId,
    locationId: req.locationId!,
    token,
    platform,
    deviceName,
  });

  res.status(201).json({ ok: true, locationId: req.locationId });
});

locationPost(pushTokensRouter, '/unregister', async (req: LocationScopedRequest, res) => {
  const body = req.body as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    throw new AppError(400, 'token is required', 'VALIDATION_ERROR');
  }
  await unregisterPushToken(req.user!._id.toString(), token);
  res.status(204).send();
});
