import { Router } from 'express';
import { config } from '../config';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { tokenVault } from '../services/tokenVault';

export const oauthRouter = Router();

/**
 * GHL marketplace redirects here after agency install.
 * Configure the same URL in your GHL app settings as redirect URI.
 */
oauthRouter.get('/callback', async (req, res, next) => {
  try {
    const redirectUri = config.oauth.redirectUri;
    if (!redirectUri) {
      throw new AppError(
        503,
        'Set GHL_OAUTH_REDIRECT_URI in .env (must match GHL app redirect URI)',
        'OAUTH_NOT_CONFIGURED',
      );
    }

    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    if (!code) {
      throw new AppError(400, 'Missing code query parameter', 'VALIDATION_ERROR');
    }

    const tokens = await tokenVault.exchangeAndStoreAuthCode(code, redirectUri);
    logger.info('OAuth callback stored company tokens', {
      companyId: tokens.companyId ?? config.ghl.companyId,
    });

    res.json({
      ok: true,
      message: 'Agency tokens saved. Sub-account tokens are created on INSTALL webhook or first API use.',
      companyId: tokens.companyId ?? config.ghl.companyId,
      userType: tokens.userType,
    });
  } catch (err) {
    next(err);
  }
});
