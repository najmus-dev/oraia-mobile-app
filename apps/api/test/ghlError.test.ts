import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import axios from 'axios';
import { AppError } from '../src/lib/errors';
import { ghlErrorMiddleware } from '../src/middleware/ghlError';

describe('ghlErrorMiddleware', () => {
  it('maps GHL 401 to 503 GHL_AUTH_ERROR', () => {
    const err = new axios.AxiosError(
      'Request failed with status code 401',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Invalid JWT' },
        headers: {},
        config: { headers: new axios.AxiosHeaders() },
      },
    );

    let passed: AppError | undefined;
    ghlErrorMiddleware(err, {} as never, {} as never, (nextErr: unknown) => {
      passed = nextErr as AppError;
    });

    assert.ok(passed instanceof AppError);
    assert.equal(passed.statusCode, 503);
    assert.equal(passed.code, 'GHL_AUTH_ERROR');
  });
});
