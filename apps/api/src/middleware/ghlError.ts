import axios from 'axios';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';

/** Maps Axios/GHL errors to AppError before the generic error handler. */
export function ghlErrorMiddleware(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (axios.isAxiosError(err) && err.response) {
    const status = err.response.status;
    const body = err.response.data as { message?: string | string[] };
    const detail = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message || err.message;

    // GHL 401 is a server-side CRM token issue — not the mobile user's JWT session.
    if (status === 401) {
      return next(
        new AppError(
          503,
          'CRM connection is temporarily unavailable. Please try again in a moment.',
          'GHL_AUTH_ERROR',
        ),
      );
    }

    return next(
      new AppError(status >= 400 && status < 600 ? status : 502, detail, 'GHL_API_ERROR'),
    );
  }
  next(err);
}
