import { Router } from 'express';
import mongoose from 'mongoose';
import { requestUnreadPushPoll } from '../jobs/unreadPushPoll';
import { GhlRefreshError } from '../lib/ghlTokenRefresh';
import { isWebhookPublicKeyParsable } from '../lib/ghlWebhookSignature';
import { getWebhookTelemetry } from '../lib/webhookTelemetry';
import { PushToken } from '../models/PushToken';
import { tokenVault } from '../services/tokenVault';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  // Keep Render awake + run the unread push backup when an uptime ping hits.
  requestUnreadPushPoll('health');
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  const webhookKey = process.env.WEBHOOK_SIGNATURE_PUBLIC_KEY?.trim() ?? '';
  const webhookRsaKey = process.env.WEBHOOK_PUBLIC_KEY?.trim() ?? '';
  const pushDevices = dbOk ? await PushToken.countDocuments().catch(() => 0) : 0;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'connected' : 'disconnected',
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || process.env.GIT_COMMIT?.slice(0, 7) || null,
    pushDevices,
    webhook: {
      ed25519Configured: Boolean(webhookKey),
      ed25519Parsable: isWebhookPublicKeyParsable(webhookKey),
      rsaConfigured: Boolean(webhookRsaKey),
      rsaParsable: isWebhookPublicKeyParsable(webhookRsaKey),
      sharedSecretConfigured: Boolean(process.env.GHL_WEBHOOK_SECRET?.trim()),
      telemetry: getWebhookTelemetry(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** GHL OAuth token status for production monitoring (no secrets). */
healthRouter.get('/health/ghl-token', async (_req, res) => {
  try {
    const before = await tokenVault.getCompanyTokenHealth();
    let refreshError: string | undefined;
    let ghlStatus: number | undefined;
    let ghlMessage: string | undefined;
    if (before.needsRefresh) {
      try {
        await tokenVault.refreshCompanyTokenIfExpiring();
      } catch (err) {
        refreshError = err instanceof Error ? err.message : String(err);
        if (err instanceof GhlRefreshError) {
          ghlStatus = err.ghlStatus;
          ghlMessage = err.ghlMessage;
        }
      }
    }
    const token = await tokenVault.getCompanyTokenHealth();
    const expired = (token.expiresInMinutes ?? 0) <= 0;
    const clientKeyMismatch = token.clientKeyMatch === false;
    const ok =
      token.configured &&
      token.oauthRedirectConfigured &&
      !expired &&
      !refreshError &&
      !clientKeyMismatch;
    const needsReauth =
      Boolean(refreshError) &&
      (ghlStatus === 400 ||
        ghlStatus === 401 ||
        refreshError?.toLowerCase().includes('invalid') ||
        refreshError?.toLowerCase().includes('redirect'));
    res.status(ok ? 200 : 503).json({
      status: refreshError
        ? 'refresh_failed'
        : clientKeyMismatch
          ? 'client_key_mismatch'
          : ok
            ? token.needsRefresh
              ? 'refreshing_soon'
              : 'ok'
            : 'attention',
      ...token,
      refreshError,
      ghlStatus,
      ghlMessage,
      recovery: clientKeyMismatch
        ? `Tokens in MongoDB were issued for ${token.tokenClientKey} but GHL_CLIENT_ID is ${token.configuredClientId}. Keep your .env credentials — exchange NEW tokens in Postman using GHL_CLIENT_ID + GHL_CLIENT_SECRET, update GHL_COMPANY_ACCESS_TOKEN and GHL_COMPANY_REFRESH_TOKEN in .env, then npm run seed:force.`
        : needsReauth
        ? 'One-time fix: open your GHL marketplace app Install URL, authorize the agency, and confirm GET /api/oauth/callback receives the code. Ensure GHL_OAUTH_REDIRECT_URI exactly matches the Redirect URL in marketplace Advanced settings.'
        : refreshError || expired
          ? 'Check ghlStatus/ghlMessage and lastRefreshError. If the refresh token was consumed during deploy, re-install the marketplace app once.'
          : !token.oauthRedirectConfigured
            ? 'Set GHL_OAUTH_REDIRECT_URI to https://oraia-mobile-app.onrender.com/api/oauth/callback (must match marketplace Redirect URL).'
            : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
  }
});
