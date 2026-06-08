import type { ParamsDictionary } from 'express-serve-static-core';
import { AppError } from './errors';

/** Express 5 types route params as `string | string[]`; normalize to a single string. */
export function param(params: ParamsDictionary, name: string): string {
  const value = params[name];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && value[0]) {
    return value[0];
  }
  throw new AppError(400, `Missing route parameter: ${name}`, 'VALIDATION_ERROR');
}
