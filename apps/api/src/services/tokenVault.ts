import axios from 'axios';
import { config } from '../config';
import { decrypt, encrypt } from '../lib/crypto';
import { AppError } from '../lib/errors';
import { decodeJwtClientKey, oauthClientKeysMatch, tokenNeedsRefresh } from '../lib/ghlOAuth';
import {
  GHL_REFRESH_LOCK_MS,
  GHL_REFRESH_LOCK_POLL_MS,
  GHL_REFRESH_LOCK_WAIT_MS,
  GhlRefreshError,
  buildRefreshFailureMessage,
  parseGhlOAuthError,
  sleep,
} from '../lib/ghlTokenRefresh';
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
    companyRefreshPromise = this.withCompanyRefreshLock(record.companyId, () =>
      this.doRefreshCompanyToken(record),
    ).finally(() => {
      companyRefreshPromise = null;
    });
    await companyRefreshPromise;
  },

  async withCompanyRefreshLock(companyId: string, refresh: () => Promise<void>): Promise<void> {
    const deadline = Date.now() + GHL_REFRESH_LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      const current = await CompanyToken.findOne({ companyId });
      if (current && !tokenNeedsRefresh(current.expiresAt)) {
        return;
      }

      const now = new Date();
      const lockUntil = new Date(now.getTime() + GHL_REFRESH_LOCK_MS);
      const locked = await CompanyToken.findOneAndUpdate(
        {
          companyId,
          $or: [{ refreshLockUntil: { $exists: false } }, { refreshLockUntil: { $lte: now } }],
        },
        { $set: { refreshLockUntil: lockUntil } },
        { new: true },
      );
      if (locked) {
        try {
          await refresh();
          return;
        } finally {
          await CompanyToken.updateOne({ companyId }, { $unset: { refreshLockUntil: 1 } });
        }
      }

      await sleep(GHL_REFRESH_LOCK_POLL_MS);
    }

    throw new AppError(
      503,
      'Timed out waiting for GHL token refresh lock',
      'GHL_REFRESH_LOCK_TIMEOUT',
    );
  },

  async markCompanyRefreshSuccess(companyId: string): Promise<void> {
    await CompanyToken.updateOne(
      { companyId },
      {
        $set: { lastRefreshAt: new Date() },
        $unset: { lastRefreshError: 1 },
      },
    );
  },

  async markCompanyRefreshFailure(
    companyId: string,
    error: { ghlStatus?: number; ghlMessage?: string; message: string },
  ): Promise<void> {
    await CompanyToken.updateOne(
      { companyId },
      {
        $set: {
          lastRefreshAt: new Date(),
          lastRefreshError: error.ghlMessage ?? error.message,
        },
      },
    );
  },

  async recoverFromPeerRefresh(companyId: string): Promise<boolean> {
    const peer = await CompanyToken.findOne({ companyId });
    if (!peer || tokenNeedsRefresh(peer.expiresAt)) {
      return false;
    }
    await this.markCompanyRefreshSuccess(companyId);
    logger.info('Company token refresh recovered — another instance refreshed first', { companyId });
    return true;
  },

  async doRefreshCompanyToken(record: {
    companyId: string;
    refreshTokenEncrypted: string;
  }): Promise<void> {
    const refreshToken = decrypt(record.refreshTokenEncrypted);
    try {
      const tokens = await GhlClient.refreshCompanyTokens(refreshToken);
      await this.storeCompanyOAuthResponse(tokens);
      await this.markCompanyRefreshSuccess(record.companyId);
      logger.info('Company token refreshed', { companyId: record.companyId });
    } catch (err) {
      if (await this.recoverFromPeerRefresh(record.companyId)) {
        return;
      }

      const parsed = parseGhlOAuthError(err);
      logger.error('Company token refresh failed', {
        companyId: record.companyId,
        message: parsed.message,
        ghlStatus: parsed.ghlStatus,
        ghlBody: parsed.ghlMessage,
        hint: 'Refresh token in MongoDB is invalid or was rotated. Re-install the marketplace app (OAuth callback) — do not seed:force with an old .env refresh token.',
      });
      await this.markCompanyRefreshFailure(record.companyId, parsed);

      if (axios.isAxiosError(err)) {
        throw new GhlRefreshError(
          buildRefreshFailureMessage(parsed.ghlStatus, parsed.ghlMessage),
          parsed.ghlStatus,
          parsed.ghlMessage,
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
    await this.markCompanyRefreshSuccess(companyId);
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
    oauthRedirectUri?: string;
    configuredClientId?: string;
    tokenClientKey?: string;
    clientKeyMatch?: boolean;
    expiresAt?: string;
    expiresInMinutes?: number;
    needsRefresh?: boolean;
    refreshTokenId?: string;
    lastRefreshAt?: string;
    lastRefreshError?: string;
  }> {
    const record = await CompanyToken.findOne({ companyId: config.ghl.companyId });
    if (!record) {
      return {
        configured: false,
        oauthRedirectConfigured: Boolean(config.oauth.redirectUri),
        oauthRedirectUri: config.oauth.redirectUri,
        configuredClientId: config.ghl.clientId,
      };
    }
    const accessToken = decrypt(record.accessTokenEncrypted);
    const tokenClientKey = decodeJwtClientKey(accessToken);
    const clientKeyMatch = oauthClientKeysMatch(accessToken, config.ghl.clientId);
    const expiresInMs = record.expiresAt.getTime() - Date.now();
    return {
      configured: true,
      oauthRedirectConfigured: Boolean(config.oauth.redirectUri),
      oauthRedirectUri: config.oauth.redirectUri,
      configuredClientId: config.ghl.clientId,
      tokenClientKey,
      clientKeyMatch,
      expiresAt: record.expiresAt.toISOString(),
      expiresInMinutes: Math.floor(expiresInMs / 60_000),
      needsRefresh: tokenNeedsRefresh(record.expiresAt),
      refreshTokenId: record.refreshTokenId,
      lastRefreshAt: record.lastRefreshAt?.toISOString(),
      lastRefreshError: record.lastRefreshError,
    };
  },
};
