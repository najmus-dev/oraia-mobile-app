import type { NextFunction, Response, Router } from 'express';
import type { RequestHandler } from 'express';
import type { LocationScopedRequest } from './location';
import { requireLocationHeader } from './location';
import { requireAuth } from './auth';

type LocationHandler = (
  req: LocationScopedRequest,
  res: Response,
  next: NextFunction,
) => Promise<void>;

/** Registers a location-scoped route: JWT + X-Location-Id required. */
export function locationGet(router: Router, path: string, handler: LocationHandler): void {
  router.get(path, requireAuth, requireLocationHeader, async (req, res, next) => {
    try {
      await handler(req as LocationScopedRequest, res, next);
    } catch (err) {
      next(err);
    }
  });
}

export function locationPost(router: Router, path: string, handler: LocationHandler): void {
  router.post(path, requireAuth, requireLocationHeader, async (req, res, next) => {
    try {
      await handler(req as LocationScopedRequest, res, next);
    } catch (err) {
      next(err);
    }
  });
}

/** POST with extra middleware (e.g. multer) before the location handler. */
export function locationPostWith(
  router: Router,
  path: string,
  middleware: RequestHandler[],
  handler: LocationHandler,
): void {
  router.post(path, requireAuth, requireLocationHeader, ...middleware, async (req, res, next) => {
    try {
      await handler(req as LocationScopedRequest, res, next);
    } catch (err) {
      next(err);
    }
  });
}

export function locationPut(router: Router, path: string, handler: LocationHandler): void {
  router.put(path, requireAuth, requireLocationHeader, async (req, res, next) => {
    try {
      await handler(req as LocationScopedRequest, res, next);
    } catch (err) {
      next(err);
    }
  });
}

export function locationDelete(router: Router, path: string, handler: LocationHandler): void {
  router.delete(path, requireAuth, requireLocationHeader, async (req, res, next) => {
    try {
      await handler(req as LocationScopedRequest, res, next);
    } catch (err) {
      next(err);
    }
  });
}
