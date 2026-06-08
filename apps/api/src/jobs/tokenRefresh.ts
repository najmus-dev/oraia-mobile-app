import cron from 'node-cron';
import { logger } from '../lib/logger';
import { tokenVault } from '../services/tokenVault';

/** Refresh company token when within 1 hour of expiry. */
export function startTokenRefreshJob(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      await tokenVault.refreshCompanyTokenIfExpiring();
      logger.info('Token refresh job completed');
    } catch (err) {
      logger.error('Token refresh job failed', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
  logger.info('Token refresh cron scheduled (hourly)');
}
