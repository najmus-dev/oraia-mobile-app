import type { NextFunction, Response } from 'express';
import { ForbiddenError } from '../lib/errors';
import type { AuthenticatedRequest } from './auth';

export function requireAgencyAdmin(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== 'agency_admin') {
    return next(new ForbiddenError('Agency admin access required'));
  }
  next();
}
