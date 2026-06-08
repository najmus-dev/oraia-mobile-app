import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError, UnauthorizedError } from '../lib/errors';
import { User, type UserDocument, type UserRole } from '../models/User';

export type { UserRole } from '../models/User';

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
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
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
    companyId: config.ghl.companyId,
    allowedLocationIds: [],
  });
}

export async function getUserById(id: string): Promise<UserDocument | null> {
  return User.findById(id);
}

export function assertLocationAccess(
  user: UserDocument,
  locationId: string,
): void {
  if (user.role === 'agency_admin') {
    return;
  }
  if (!user.allowedLocationIds.includes(locationId)) {
    throw new AppError(403, 'You do not have access to this location', 'LOCATION_FORBIDDEN');
  }
}

export function toPublicUser(user: UserDocument) {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
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
    companyId: config.ghl.companyId,
    allowedLocationIds: input.role === 'agency_admin' ? [] : input.allowedLocationIds ?? [],
  });
}
