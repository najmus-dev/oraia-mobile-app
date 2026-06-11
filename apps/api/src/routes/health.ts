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
    if (before.needsRefresh) {
      await tokenVault.refreshCompanyTokenIfExpiring();
    }
    const token = await tokenVault.getCompanyTokenHealth();
    const expired = (token.expiresInMinutes ?? 0) <= 0;
    const ok = token.configured && token.oauthRedirectConfigured && !expired;
    res.status(ok ? 200 : 503).json({
      status: ok ? (token.needsRefresh ? 'refreshing_soon' : 'ok') : 'attention',
      ...token,
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
