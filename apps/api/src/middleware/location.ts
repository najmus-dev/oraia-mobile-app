import type { NextFunction, Response } from 'express';
import { AppError } from '../lib/errors';
import { assertLocationAccess } from '../services/authService';
import type { AuthenticatedRequest } from './auth';

export interface LocationScopedRequest extends AuthenticatedRequest {
  locationId?: string;
}

export function requireLocationHeader(
  req: LocationScopedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const locationId = req.headers['x-location-id'];
  const value = Array.isArray(locationId) ? locationId[0] : locationId;
  if (!value?.trim()) {
    return next(new AppError(400, 'X-Location-Id header is required', 'LOCATION_REQUIRED'));
  }
  assertLocationAccess(req.user!, value.trim());
  req.locationId = value.trim();
  next();
}
