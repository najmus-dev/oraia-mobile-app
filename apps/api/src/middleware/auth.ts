import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../lib/errors';
import { getUserById, verifyToken, type JwtPayload } from '../services/authService';
import type { UserDocument } from '../models/User';

export interface AuthenticatedRequest extends Request {
  auth?: JwtPayload;
  user?: UserDocument;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing Bearer token'));
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  const user = await getUserById(payload.sub);
  if (!user) {
    return next(new UnauthorizedError('User not found'));
  }
  req.auth = payload;
  req.user = user;
  next();
}
