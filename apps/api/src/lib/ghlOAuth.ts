/** Refresh company token when within this window of stored expiry (matches cron + on-demand). */
export const GHL_REFRESH_BEFORE_MS = 60 * 60 * 1000;

/** Subtract from JWT / expires_in so we refresh slightly before GHL rejects the token. */
export const GHL_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function buildCompanyRefreshTokenBody(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri: string;
}): URLSearchParams {
  return new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    user_type: 'Company',
    redirect_uri: params.redirectUri,
  });
}

export function buildCompanyAuthCodeBody(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): URLSearchParams {
  return new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'authorization_code',
    code: params.code,
    user_type: 'Company',
    redirect_uri: params.redirectUri,
  });
}

export function decodeJwtExpiry(token: string): Date | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    ) as { exp?: number };
    if (!payload.exp) return null;
    return new Date(payload.exp * 1000 - GHL_REFRESH_BUFFER_MS);
  } catch {
    return null;
  }
}

export function resolveGhlTokenExpiry(
  expiresInSeconds: number | undefined,
  accessToken?: string,
): Date {
  if (
    typeof expiresInSeconds === 'number' &&
    Number.isFinite(expiresInSeconds) &&
    expiresInSeconds > 0
  ) {
    return new Date(Date.now() + expiresInSeconds * 1000 - GHL_REFRESH_BUFFER_MS);
  }
  const fromJwt = accessToken ? decodeJwtExpiry(accessToken) : null;
  if (fromJwt) return fromJwt;
  return new Date(Date.now() + 23 * 60 * 60 * 1000);
}

export function tokenNeedsRefresh(expiresAt: Date, now = Date.now()): boolean {
  return expiresAt.getTime() - now <= GHL_REFRESH_BEFORE_MS;
}
