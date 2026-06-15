import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  GHL_REFRESH_BEFORE_MS,
  buildCompanyAuthCodeBody,
  buildCompanyRefreshTokenBody,
  decodeJwtClientKey,
  oauthClientKeysMatch,
  resolveGhlTokenExpiry,
  tokenNeedsRefresh,
} from '../src/lib/ghlOAuth';

describe('ghlOAuth', () => {
  it('buildCompanyRefreshTokenBody includes GHL-required fields', () => {
    const body = buildCompanyRefreshTokenBody({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'refresh-tok',
      redirectUri: 'https://api.example.com/oauth/callback',
    });
    assert.equal(body.get('grant_type'), 'refresh_token');
    assert.equal(body.get('user_type'), 'Company');
    assert.equal(body.get('redirect_uri'), 'https://api.example.com/oauth/callback');
    assert.equal(body.get('refresh_token'), 'refresh-tok');
    assert.equal(body.get('client_id'), 'client-id');
    assert.equal(body.get('client_secret'), 'client-secret');
  });

  it('buildCompanyAuthCodeBody includes user_type Company', () => {
    const body = buildCompanyAuthCodeBody({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      code: 'auth-code',
      redirectUri: 'https://api.example.com/oauth/callback',
    });
    assert.equal(body.get('grant_type'), 'authorization_code');
    assert.equal(body.get('user_type'), 'Company');
    assert.equal(body.get('code'), 'auth-code');
  });

  it('resolveGhlTokenExpiry prefers expires_in', () => {
    const now = Date.now();
    const expiry = resolveGhlTokenExpiry(3600, 'invalid.jwt.token');
    const deltaMs = expiry.getTime() - now;
    // 3600s minus 5-minute proactive refresh buffer
    assert.ok(deltaMs > 3_200_000 && deltaMs < 3_400_000);
  });

  it('resolveGhlTokenExpiry falls back when expires_in missing', () => {
    const token = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 7200 })).toString(
        'base64url',
      ),
      'sig',
    ].join('.');
    const expiry = resolveGhlTokenExpiry(undefined, token);
    assert.ok(expiry.getTime() > Date.now());
  });

  it('tokenNeedsRefresh within three hour window', () => {
    const soon = new Date(Date.now() + 30 * 60 * 1000);
    const later = new Date(Date.now() + 4 * 60 * 60 * 1000);
    assert.equal(tokenNeedsRefresh(soon), true);
    assert.equal(tokenNeedsRefresh(later), false);
    assert.equal(GHL_REFRESH_BEFORE_MS, 3 * 60 * 60 * 1000);
  });

  it('decodeJwtClientKey reads clientKey from access token JWT', () => {
    const payload = {
      clientKey: '6a2013179bed28594bc933dc-mpy0gahy',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      Buffer.from(JSON.stringify(payload)).toString('base64url'),
      'sig',
    ].join('.');
    assert.equal(decodeJwtClientKey(token), '6a2013179bed28594bc933dc-mpy0gahy');
    assert.equal(oauthClientKeysMatch(token, '6a2013179bed28594bc933dc-mpy0gahy'), true);
    assert.equal(oauthClientKeysMatch(token, '6a0d975ed226eba332450b29-mpe0566z'), false);
  });
});
