import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError, UnauthorizedError } from '../lib/errors';
import { isValidAuthEmail, normalizeAuthEmail, validateSignupPassword } from '../lib/authValidation';
import { User, type UserDocument, type UserRole, type UserStatus } from '../models/User';

export type { UserRole, UserStatus } from '../models/User';

const SALT_ROUNDS = 12;

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: UserDocument): string {
  const payload: JwtPayload = {
    sub: String(user._id),
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired session');
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: UserDocument }> {
  const user = await User.findOne({ email: normalizeAuthEmail(email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }
  if (user.status === 'rejected') {
    throw new AppError(
      403,
      'This account was not approved. Please contact your administrator.',
      'ACCOUNT_REJECTED',
    );
  }
  const token = signToken(user);
  return { token, user };
}

export async function ensureBootstrapAdmin(): Promise<void> {
  const password = config.bootstrap.password;
  if (!password) {
    return;
  }
  const email = config.bootstrap.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    return;
  }
  await User.create({
    email,
    passwordHash: await hashPassword(password),
    role: 'agency_admin',
    status: 'active',
    companyId: config.ghl.companyId,
    allowedLocationIds: [],
  });
}

export async function getUserById(id: string): Promise<UserDocument | null> {
  return User.findById(id);
}

export function assertActiveAccount(user: UserDocument): void {
  if (user.status === 'pending') {
    throw new AppError(
      403,
      'Your account is awaiting administrator approval.',
      'ACCOUNT_PENDING',
    );
  }
  if (user.status === 'rejected') {
    throw new AppError(
      403,
      'This account was not approved. Please contact your administrator.',
      'ACCOUNT_REJECTED',
    );
  }
}

export function assertLocationAccess(
  user: UserDocument,
  locationId: string,
): void {
  assertActiveAccount(user);
  if (user.role === 'agency_admin') {
    return;
  }
  if (!user.allowedLocationIds.includes(locationId)) {
    throw new AppError(403, 'You do not have access to this location', 'LOCATION_FORBIDDEN');
  }
}

export function toPublicUser(user: UserDocument) {
  const status: UserStatus = user.status ?? 'active';
  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
    status,
    companyId: user.companyId,
    allowedLocationIds: user.allowedLocationIds,
    ghlUserId: user.ghlUserId?.trim() || undefined,
  };
}

export async function createAppUser(input: {
  email: string;
  password: string;
  role: UserRole;
  allowedLocationIds?: string[];
}): Promise<UserDocument> {
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
  }
  if (input.role === 'staff' && (!input.allowedLocationIds || input.allowedLocationIds.length === 0)) {
    throw new AppError(400, 'Staff users require at least one allowedLocationId', 'VALIDATION_ERROR');
  }
  return User.create({
    email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    status: 'active',
    companyId: config.ghl.companyId,
    allowedLocationIds: input.role === 'agency_admin' ? [] : input.allowedLocationIds ?? [],
  });
}

export async function signupAppUser(input: {
  email: string;
  password: string;
}): Promise<UserDocument> {
  const email = normalizeAuthEmail(input.email);
  if (!isValidAuthEmail(email)) {
    throw new AppError(400, 'Enter a valid email address', 'VALIDATION_ERROR');
  }
  const passwordError = validateSignupPassword(input.password);
  if (passwordError) {
    throw new AppError(400, passwordError, 'VALIDATION_ERROR');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.status === 'pending') {
      throw new AppError(
        409,
        'An account with this email is already awaiting approval.',
        'ACCOUNT_PENDING',
      );
    }
    throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  return User.create({
    email,
    passwordHash: await hashPassword(input.password),
    role: 'staff',
    status: 'pending',
    companyId: config.ghl.companyId,
    allowedLocationIds: [],
  });
}

export async function listPendingUsers(): Promise<UserDocument[]> {
  return User.find({ status: 'pending' }).sort({ createdAt: -1 });
}

export async function approveAppUser(input: {
  userId: string;
  allowedLocationIds: string[];
}): Promise<UserDocument> {
  const locationIds = [...new Set(input.allowedLocationIds.map((id) => id.trim()).filter(Boolean))];
  if (locationIds.length === 0) {
    throw new AppError(400, 'At least one location id is required', 'VALIDATION_ERROR');
  }

  const user = await User.findOneAndUpdate(
    { _id: input.userId, status: 'pending' },
    {
      $set: {
        status: 'active',
        allowedLocationIds: locationIds,
      },
    },
    { new: true },
  );
  if (!user) {
    throw new AppError(404, 'Pending user not found', 'NOT_FOUND');
  }
  return user;
}

export async function rejectAppUser(userId: string): Promise<UserDocument> {
  const user = await User.findOneAndUpdate(
    { _id: userId, status: 'pending' },
    { $set: { status: 'rejected', allowedLocationIds: [] } },
    { new: true },
  );
  if (!user) {
    throw new AppError(404, 'Pending user not found', 'NOT_FOUND');
  }
  return user;
}
