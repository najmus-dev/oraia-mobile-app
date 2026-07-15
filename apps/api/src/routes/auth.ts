import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../lib/errors';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { requireAgencyAdmin } from '../middleware/requireAdmin';
import type { UserRole } from '../models/User';
import {
  approveAppUser,
  assertActiveAccount,
  assertLocationAccess,
  createAppUser,
  getUserById,
  listPendingUsers,
  login,
  rejectAppUser,
  signToken,
  signupAppUser,
  toPublicUser,
} from '../services/authService';
import { notifyAdminsOfSignup } from '../services/emailService';
import { resolveAndPersistGhlUserId } from '../services/ghlUserResolver';
import { param } from '../lib/params';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-up attempts. Try again later.' },
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
    if (user.status !== 'pending') {
      await resolveAndPersistGhlUserId(user, locationId);
    }
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
    assertActiveAccount(user);
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

/** Public self-service registration — account starts as pending until admin approval. */
authRouter.post('/signup', signupLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      throw new AppError(400, 'email and password are required', 'VALIDATION_ERROR');
    }
    const user = await signupAppUser({ email, password });
    // Fire-and-forget — signup must not fail or slow down if email delivery has issues
    void notifyAdminsOfSignup({ email: user.email, userId: String(user._id) });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: toPublicUser(user),
      message: 'Account created. An administrator will approve your access shortly.',
    });
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

/** Agency admin: list accounts awaiting approval */
authRouter.get('/users/pending', requireAuth, requireAgencyAdmin, async (_req, res, next) => {
  try {
    const users = await listPendingUsers();
    res.json({
      users: users.map((user) => ({
        ...toPublicUser(user),
        createdAt: user.createdAt.toISOString(),
      })),
      count: users.length,
    });
  } catch (err) {
    next(err);
  }
});

/** Agency admin: approve a pending user and assign location access */
authRouter.post('/users/:userId/approve', requireAuth, requireAgencyAdmin, async (req, res, next) => {
  try {
    const userId = param(req.params, 'userId');
    const { allowedLocationIds } = req.body as { allowedLocationIds?: string[] };
    if (!Array.isArray(allowedLocationIds)) {
      throw new AppError(400, 'allowedLocationIds array is required', 'VALIDATION_ERROR');
    }
    const user = await approveAppUser({ userId, allowedLocationIds });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

/** Agency admin: reject a pending signup */
authRouter.post('/users/:userId/reject', requireAuth, requireAgencyAdmin, async (req, res, next) => {
  try {
    const userId = param(req.params, 'userId');
    const user = await rejectAppUser(userId);
    res.json({ user: toPublicUser(user) });
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
    if (result.user.status !== 'pending') {
      await resolveAndPersistGhlUserId(result.user, locationId);
    }
    const fresh = (await getUserById(String(result.user._id))) ?? result.user;
    res.json({
      token: result.token,
      user: toPublicUser(fresh),
    });
  } catch (err) {
    next(err);
  }
});
