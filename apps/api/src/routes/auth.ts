import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../lib/errors';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { requireAgencyAdmin } from '../middleware/requireAdmin';
import type { UserRole } from '../models/User';
import {
  assertLocationAccess,
  createAppUser,
  getUserById,
  login,
  toPublicUser,
} from '../services/authService';
import { resolveAndPersistGhlUserId } from '../services/ghlUserResolver';
export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

function readLocationId(req: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  return typeof req.headers['x-location-id'] === 'string'
    ? req.headers['x-location-id'].trim()
    : undefined;
}

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const locationId = readLocationId(req);
    await resolveAndPersistGhlUserId(user, locationId);
    const fresh = (await getUserById(String(user._id))) ?? user;
    res.json({ user: toPublicUser(fresh) });
  } catch (err) {
    next(err);
  }
});

/** Location-scoped GHL user id for My Inbox — does not fail if lookup misses. */
authRouter.get('/inbox-assignee', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const locationId = readLocationId(req);
    if (!locationId) {
      throw new AppError(400, 'X-Location-Id header is required', 'VALIDATION_ERROR');
    }
    assertLocationAccess(user, locationId);
    const ghlUserId = await resolveAndPersistGhlUserId(user, locationId);
    res.json({ ghlUserId: ghlUserId ?? null });
  } catch (err) {
    next(err);
  }
});

/** Agency admin: create staff or another admin for the ORAIA app */
authRouter.post('/users', requireAuth, requireAgencyAdmin, async (req, res, next) => {
  try {
    const { email, password, role, allowedLocationIds } = req.body as {
      email?: string;
      password?: string;
      role?: UserRole;
      allowedLocationIds?: string[];
    };
    if (!email?.trim() || !password || !role) {
      throw new AppError(400, 'email, password, and role are required', 'VALIDATION_ERROR');
    }
    if (role !== 'agency_admin' && role !== 'staff') {
      throw new AppError(400, 'role must be agency_admin or staff', 'VALIDATION_ERROR');
    }
    const user = await createAppUser({
      email,
      password,
      role,
      allowedLocationIds,
    });
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      throw new AppError(400, 'email and password are required', 'VALIDATION_ERROR');
    }
    const result = await login(email, password);
    const locationId = readLocationId(req);
    await resolveAndPersistGhlUserId(result.user, locationId);
    const fresh = (await getUserById(String(result.user._id))) ?? result.user;
    res.json({
      token: result.token,
      user: toPublicUser(fresh),
    });
  } catch (err) {
    next(err);
  }
});
