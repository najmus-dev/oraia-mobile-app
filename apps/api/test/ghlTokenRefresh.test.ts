import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AxiosError, type AxiosResponse } from 'axios';

import {
  buildRefreshFailureMessage,
  parseGhlOAuthError,
} from '../src/lib/ghlTokenRefresh';

describe('ghlTokenRefresh', () => {
  it('parseGhlOAuthError extracts GHL message and status', () => {
    const err = new AxiosError(
      'Request failed with status code 401',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 401,
        data: { message: 'Invalid refresh token' },
      } as AxiosResponse,
    );
    const parsed = parseGhlOAuthError(err);
    assert.equal(parsed.ghlStatus, 401);
    assert.equal(parsed.ghlMessage, 'Invalid refresh token');
  });

  it('buildRefreshFailureMessage explains invalid refresh token', () => {
    const msg = buildRefreshFailureMessage(401, 'Invalid refresh token');
    assert.match(msg, /invalid or was already used/i);
  });

  it('buildRefreshFailureMessage explains redirect mismatch', () => {
    const msg = buildRefreshFailureMessage(400, 'redirect_uri mismatch');
    assert.match(msg, /GHL_OAUTH_REDIRECT_URI/i);
  });

  it('buildRefreshFailureMessage explains client credentials failure', () => {
    const msg = buildRefreshFailureMessage(403, 'Forbidden');
    assert.match(msg, /GHL_CLIENT_ID/i);
  });
});
