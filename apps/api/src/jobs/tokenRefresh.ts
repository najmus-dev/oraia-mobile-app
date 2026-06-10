import cron from 'node-cron';
import { logger } from '../lib/logger';
import { tokenVault } from '../services/tokenVault';

/** Refresh company token when within 1 hour of expiry. Runs every 15 minutes + once on startup. */
export function startTokenRefreshJob(): void {
  const runRefresh = async (source: 'startup' | 'cron') => {
    try {
      await tokenVault.refreshCompanyTokenIfExpiring();
      logger.info('Token refresh check completed', { source });
    } catch (err) {
      logger.error('Token refresh check failed', {
        source,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runRefresh('startup');

  cron.schedule('*/15 * * * *', () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runRefresh('cron');
  });
  logger.info('Token refresh cron scheduled (every 15 minutes)');
}
