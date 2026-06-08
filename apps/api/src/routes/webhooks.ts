import { Router } from 'express';
import { config } from '../config';
import { logger } from '../lib/logger';
import { assertGhlWebhookAuthorized } from '../lib/webhookAuth';
import { tokenVault } from '../services/tokenVault';

export const webhooksRouter = Router();

type GhlWebhookBody = {
  type?: string;
  event?: string;
  locationId?: string;
  companyId?: string;
  installType?: string;
  id?: string;
};

function eventType(body: GhlWebhookBody): string {
  return (body.type ?? body.event ?? body.installType ?? '').toUpperCase();
}

/**
 * GHL marketplace webhooks (INSTALL / UNINSTALL on sub-accounts).
 * Point your app webhook URL to: POST /webhooks/ghl
 */
webhooksRouter.post('/ghl', async (req, res, next) => {
  try {
    assertGhlWebhookAuthorized(req);
    const body = req.body as GhlWebhookBody;
    const type = eventType(body);
    const locationId = body.locationId ?? body.id;
    const companyId = body.companyId ?? config.ghl.companyId;

    logger.info('GHL webhook received', { type, locationId, companyId });

    if (type === 'INSTALL' && locationId) {
      await tokenVault.provisionLocationOnInstall(locationId);
      res.json({ ok: true, action: 'location_token_provisioned', locationId });
      return;
    }

    if (type === 'UNINSTALL' && locationId) {
      await tokenVault.removeLocationOnUninstall(locationId);
      res.json({ ok: true, action: 'location_token_removed', locationId });
      return;
    }

    res.json({ ok: true, action: 'ignored', type });
  } catch (err) {
    next(err);
  }
});
