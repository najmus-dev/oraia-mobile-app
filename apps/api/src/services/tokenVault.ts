import { config } from '../config';
import { decrypt, encrypt } from '../lib/crypto';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { CompanyToken } from '../models/CompanyToken';
import { LocationToken } from '../models/LocationToken';
import { GhlClient } from './ghl/ghlClient';
import type { GhlOAuthTokenResponse } from './ghl/types';

let companyGhlClient: GhlClient | null = null;

export function getGhlClient(): GhlClient {
  if (!companyGhlClient) {
    companyGhlClient = new GhlClient(() => tokenVault.getCompanyAccessToken());
  }
  return companyGhlClient;
}

/** GHL client that uses a sub-account (location) access token. */
export function getLocationGhlClient(locationId: string): GhlClient {
  return new GhlClient(() => tokenVault.getLocationAccessToken(locationId));
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

  async getCompanyAccessToken(): Promise<string> {
    const record = await CompanyToken.findOne({ companyId: config.ghl.companyId });
    if (!record) {
      throw new AppError(
        503,
        'GHL company token not configured. Run npm run seed or set tokens in .env',
        'GHL_TOKEN_MISSING',
      );
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.refreshCompanyToken(record);
      const updated = await CompanyToken.findOne({ companyId: config.ghl.companyId });
      if (!updated) {
        throw new AppError(503, 'Failed to load refreshed token', 'GHL_TOKEN_MISSING');
      }
      return decrypt(updated.accessTokenEncrypted);
    }

    return decrypt(record.accessTokenEncrypted);
  },

  async getLocationAccessToken(locationId: string): Promise<string> {
    const record = await LocationToken.findOne({ locationId });
    if (record && record.expiresAt.getTime() > Date.now()) {
      return decrypt(record.accessTokenEncrypted);
    }

    const companyClient = getGhlClient();
    const tokens = await companyClient.exchangeLocationToken(config.ghl.companyId, locationId);
    const expiresAt =
      GhlClient.tokenExpiresAt(tokens.expires_in) ??
      GhlClient.decodeJwtExpiry(tokens.access_token) ??
      new Date(Date.now() + 23 * 60 * 60 * 1000);

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
    const refreshToken = decrypt(record.refreshTokenEncrypted);
    const client = new GhlClient(async () => refreshToken);
    const tokens = await client.refreshCompanyToken(refreshToken);
    await this.upsertCompanyTokens({
      companyId: record.companyId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: GhlClient.tokenExpiresAt(tokens.expires_in),
      refreshTokenId: tokens.refreshTokenId,
    });
    logger.info('Company token refreshed', { companyId: record.companyId });
  },

  async storeCompanyOAuthResponse(tokens: GhlOAuthTokenResponse): Promise<void> {
    const companyId = tokens.companyId ?? config.ghl.companyId;
    await this.upsertCompanyTokens({
      companyId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: GhlClient.tokenExpiresAt(tokens.expires_in),
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
    if (!record) return;
    const expiresInMs = record.expiresAt.getTime() - Date.now();
    if (expiresInMs < 60 * 60 * 1000) {
      await this.refreshCompanyToken(record);
    }
  },
};
