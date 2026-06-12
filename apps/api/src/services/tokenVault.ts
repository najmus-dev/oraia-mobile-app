import axios from 'axios';
import { config } from '../config';
import { decrypt, encrypt } from '../lib/crypto';
import { AppError } from '../lib/errors';
import { GHL_REFRESH_BEFORE_MS, tokenNeedsRefresh } from '../lib/ghlOAuth';
import { logger } from '../lib/logger';
import { CompanyToken } from '../models/CompanyToken';
import { LocationToken } from '../models/LocationToken';
import { GhlClient } from './ghl/ghlClient';
import type { GhlOAuthTokenResponse } from './ghl/types';

let companyGhlClient: GhlClient | null = null;
let companyRefreshPromise: Promise<void> | null = null;

export function getGhlClient(): GhlClient {
  if (!companyGhlClient) {
    companyGhlClient = new GhlClient(() => tokenVault.getCompanyAccessToken(), {
      onUnauthorized: () => tokenVault.forceRefreshCompanyToken(),
    });
  }
  return companyGhlClient;
}

/** GHL client that uses a sub-account (location) access token. */
export function getLocationGhlClient(locationId: string): GhlClient {
  return new GhlClient(() => tokenVault.getLocationAccessToken(locationId), {
    onUnauthorized: async () => {
      await LocationToken.deleteOne({ locationId });
      logger.info('Location token invalidated after GHL 401', { locationId });
    },
  });
}

export const tokenVault = {
  async upsertCompanyTokens(input: {
    companyId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    refreshTokenId?: string;
  }): Promise<void> {
    await CompanyToken.findOneAndUpdate(
      { companyId: input.companyId },
      {
        companyId: input.companyId,
        accessTokenEncrypted: encrypt(input.accessToken),
        refreshTokenEncrypted: encrypt(input.refreshToken),
        expiresAt: input.expiresAt,
        refreshTokenId: input.refreshTokenId,
      },
      { upsert: true, returnDocument: 'after' },
    );
    logger.info('Company token stored', { companyId: input.companyId });
  },

  async upsertLocationTokens(input: {
    locationId: string;
    companyId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }): Promise<void> {
    await LocationToken.findOneAndUpdate(
      { locationId: input.locationId },
      {
        locationId: input.locationId,
        companyId: input.companyId,
        accessTokenEncrypted: encrypt(input.accessToken),
        refreshTokenEncrypted: encrypt(input.refreshToken),
        expiresAt: input.expiresAt,
      },
      { upsert: true, returnDocument: 'after' },
    );
    logger.info('Location token stored', { locationId: input.locationId });
  },

  async seedFromEnvIfPresent(): Promise<boolean> {
    const { companyAccessToken, companyRefreshToken, companyId } = config.ghl;
    if (!companyAccessToken || !companyRefreshToken) {
      return false;
    }
    const expiresAt =
      GhlClient.decodeJwtExpiry(companyAccessToken) ??
      new Date(Date.now() + 23 * 60 * 60 * 1000);
    await this.upsertCompanyTokens({
      companyId,
      accessToken: companyAccessToken,
      refreshToken: companyRefreshToken,
      expiresAt,
    });
    return true;
  },

  /** Seeds from .env only when no company token exists in MongoDB. */
  async seedFromEnvIfEmpty(): Promise<boolean> {
    const existing = await CompanyToken.findOne({ companyId: config.ghl.companyId });
    if (existing) return false;
    return this.seedFromEnvIfPresent();
  },

  async getCompanyAccessToken(): Promise<string> {
    const record = await CompanyToken.findOne({ companyId: config.ghl.companyId });
    if (!record) {
      throw new AppError(
        503,
        'GHL company token not configured. Complete OAuth install or run npm run seed',
        'GHL_TOKEN_MISSING',
      );
    }

    if (tokenNeedsRefresh(record.expiresAt)) {
      await this.refreshCompanyToken(record);
      const updated = await CompanyToken.findOne({ companyId: config.ghl.companyId });
      if (!updated) {
        throw new AppError(503, 'Failed to load refreshed token', 'GHL_TOKEN_MISSING');
      }
      return decrypt(updated.accessTokenEncrypted);
    }

    return decrypt(record.accessTokenEncrypted);
  },

  /** Force refresh from stored refresh token (e.g. after GHL returns 401). */
  async forceRefreshCompanyToken(): Promise<void> {
    const record = await CompanyToken.findOne({ companyId: config.ghl.companyId });
    if (!record) {
      throw new AppError(503, 'GHL company token not configured', 'GHL_TOKEN_MISSING');
    }
    await this.refreshCompanyToken(record);
  },

  async getLocationAccessToken(locationId: string): Promise<string> {
    const record = await LocationToken.findOne({ locationId });
    if (record && !tokenNeedsRefresh(record.expiresAt)) {
      return decrypt(record.accessTokenEncrypted);
    }

    const companyClient = getGhlClient();
    const tokens = await companyClient.exchangeLocationToken(config.ghl.companyId, locationId);
    const expiresAt = GhlClient.tokenExpiresAt(tokens.expires_in, tokens.access_token);

    await this.upsertLocationTokens({
      locationId,
      companyId: config.ghl.companyId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    });

    return tokens.access_token;
  },

  async refreshCompanyToken(record: {
    companyId: string;
    refreshTokenEncrypted: string;
  }): Promise<void> {
    if (companyRefreshPromise) {
      await companyRefreshPromise;
      return;
    }
    companyRefreshPromise = this.doRefreshCompanyToken(record).finally(() => {
      companyRefreshPromise = null;
    });
    await companyRefreshPromise;
  },

  async doRefreshCompanyToken(record: {
    companyId: string;
    refreshTokenEncrypted: string;
  }): Promise<void> {
    const refreshToken = decrypt(record.refreshTokenEncrypted);
    try {
      const tokens = await GhlClient.refreshCompanyTokens(refreshToken);
      await this.storeCompanyOAuthResponse(tokens);
      logger.info('Company token refreshed', { companyId: record.companyId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const ghlBody = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      logger.error('Company token refresh failed', {
        companyId: record.companyId,
        message,
        ghlStatus: axios.isAxiosError(err) ? err.response?.status : undefined,
        ghlBody,
        hint: 'Refresh token in MongoDB is invalid or was rotated. Re-install the marketplace app (OAuth callback) — do not seed:force with an old .env refresh token.',
      });
      if (axios.isAxiosError(err)) {
        throw new AppError(
          503,
          'CRM connection is temporarily unavailable. Please try again in a moment.',
          'GHL_AUTH_ERROR',
        );
      }
      throw err;
    }
  },

  async storeCompanyOAuthResponse(tokens: GhlOAuthTokenResponse): Promise<void> {
    const companyId = tokens.companyId ?? config.ghl.companyId;
    await this.upsertCompanyTokens({
      companyId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: GhlClient.tokenExpiresAt(tokens.expires_in, tokens.access_token),
      refreshTokenId: tokens.refreshTokenId,
    });
  },

  async exchangeAndStoreAuthCode(code: string, redirectUri: string): Promise<GhlOAuthTokenResponse> {
    const tokens = await GhlClient.exchangeAuthorizationCode(code, redirectUri);
    await this.storeCompanyOAuthResponse(tokens);
    return tokens;
  },

  /** Called on marketplace INSTALL webhook — caches location token for CRM APIs. */
  async provisionLocationOnInstall(locationId: string): Promise<void> {
    await this.getLocationAccessToken(locationId);
  },

  async removeLocationOnUninstall(locationId: string): Promise<void> {
    await LocationToken.deleteOne({ locationId });
    logger.info('Location token removed', { locationId });
  },

  async refreshCompanyTokenIfExpiring(): Promise<void> {
    const record = await CompanyToken.findOne({ companyId: config.ghl.companyId });
    if (!record) {
      logger.warn('Token refresh skipped — no company token in database');
      return;
    }
    if (tokenNeedsRefresh(record.expiresAt)) {
      await this.refreshCompanyToken(record);
    }
  },

  /** Token health for ops — no secrets exposed. */
  async getCompanyTokenHealth(): Promise<{
    configured: boolean;
    oauthRedirectConfigured: boolean;
    expiresAt?: string;
    expiresInMinutes?: number;
    needsRefresh?: boolean;
  }> {
    const record = await CompanyToken.findOne({ companyId: config.ghl.companyId });
    if (!record) {
      return {
        configured: false,
        oauthRedirectConfigured: Boolean(config.oauth.redirectUri),
      };
    }
    const expiresInMs = record.expiresAt.getTime() - Date.now();
    return {
      configured: true,
      oauthRedirectConfigured: Boolean(config.oauth.redirectUri),
      expiresAt: record.expiresAt.toISOString(),
      expiresInMinutes: Math.floor(expiresInMs / 60_000),
      needsRefresh: tokenNeedsRefresh(record.expiresAt),
    };
  },
};
