import axios from 'axios';
import { AppError } from './errors';

export const GHL_REFRESH_LOCK_MS = 60_000;
export const GHL_REFRESH_LOCK_WAIT_MS = 30_000;
export const GHL_REFRESH_LOCK_POLL_MS = 2_000;

export class GhlRefreshError extends AppError {
  constructor(
    message: string,
    public readonly ghlStatus?: number,
    public readonly ghlMessage?: string,
  ) {
    super(503, message, 'GHL_AUTH_ERROR');
    this.name = 'GhlRefreshError';
  }
}

export function parseGhlOAuthError(err: unknown): {
  message: string;
  ghlStatus?: number;
  ghlMessage?: string;
} {
  if (!axios.isAxiosError(err)) {
    const message = err instanceof Error ? err.message : String(err);
    return { message };
  }

  const ghlStatus = err.response?.status;
  const data = err.response?.data;
  const ghlMessage =
    typeof data === 'object' && data !== null
      ? 'message' in data && typeof data.message === 'string'
        ? data.message
        : 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'error_description' in data && typeof data.error_description === 'string'
            ? data.error_description
            : undefined
      : typeof data === 'string'
        ? data
        : undefined;

  return {
    message: ghlMessage ?? err.message,
    ghlStatus,
    ghlMessage,
  };
}

export function buildRefreshFailureMessage(
  ghlStatus?: number,
  ghlMessage?: string,
  options?: { clientKeyMismatch?: boolean; tokenClientKey?: string; configuredClientId?: string },
): string {
  if (options?.clientKeyMismatch) {
    return (
      `Stored tokens were issued for client ${options.tokenClientKey ?? '?'} but GHL_CLIENT_ID is ` +
      `${options.configuredClientId ?? '?'}. API calls work until access token expires (~24h), then refresh fails. ` +
      'Exchange a new token pair using the same client_id/secret as GHL_CLIENT_ID in Postman, update .env, run npm run seed:force.'
    );
  }
  const detail = ghlMessage?.toLowerCase() ?? '';
  if (detail.includes('invalid client credentials')) {
    return 'GHL rejected client credentials — GHL_CLIENT_ID and GHL_CLIENT_SECRET must match the client key pair used in Postman/OAuth (Marketplace → Auth → Client Keys).';
  }
  if (ghlStatus === 400 || ghlStatus === 401) {
    if (ghlMessage?.toLowerCase().includes('redirect')) {
      return 'GHL rejected token refresh — GHL_OAUTH_REDIRECT_URI does not match the Redirect URL in your marketplace app.';
    }
    return 'GHL refresh token is invalid or was already used. Re-install the marketplace app once to obtain a new token pair.';
  }
  if (ghlStatus === 403) {
    return 'GHL rejected token refresh — check GHL_CLIENT_ID and GHL_CLIENT_SECRET.';
  }
  if (ghlMessage) {
    return `GHL token refresh failed: ${ghlMessage}`;
  }
  return 'CRM connection is temporarily unavailable. Please try again in a moment.';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
