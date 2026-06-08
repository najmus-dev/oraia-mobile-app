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
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message || err.message;
    return next(new AppError(status >= 400 && status < 600 ? status : 502, message, 'GHL_API_ERROR'));
  }
  next(err);
}
