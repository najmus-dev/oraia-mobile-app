import { Router } from 'express';
import mongoose from 'mongoose';
import { tokenVault } from '../services/tokenVault';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

/** GHL OAuth token status for production monitoring (no secrets). */
healthRouter.get('/health/ghl-token', async (_req, res) => {
  try {
    const before = await tokenVault.getCompanyTokenHealth();
    let refreshError: string | undefined;
    if (before.needsRefresh) {
      try {
        await tokenVault.refreshCompanyTokenIfExpiring();
      } catch (err) {
        refreshError = err instanceof Error ? err.message : String(err);
      }
    }
    const token = await tokenVault.getCompanyTokenHealth();
    const expired = (token.expiresInMinutes ?? 0) <= 0;
    const ok =
      token.configured && token.oauthRedirectConfigured && !expired && !refreshError;
    res.status(ok ? 200 : 503).json({
      status: refreshError
        ? 'refresh_failed'
        : ok
          ? token.needsRefresh
            ? 'refreshing_soon'
            : 'ok'
          : 'attention',
      ...token,
      refreshError,
      recovery:
        refreshError || expired
          ? 'Re-install the GHL marketplace app to obtain a new authorization code, or run seed:force with a fresh token pair from OAuth (not a stale refresh token).'
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
