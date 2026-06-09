/**
 * Seeds encrypted GHL company tokens from .env and creates bootstrap admin if missing.
 * Usage:
 *   npm run seed         — only when MongoDB has no company token yet
 *   npm run seed:force   — overwrite company token from .env (expired / rotated tokens)
 */
import { config } from '../src/config';
import { connectDb } from '../src/db/connect';
import { logger } from '../src/lib/logger';
import { ensureBootstrapAdmin } from '../src/services/authService';
import { tokenVault } from '../src/services/tokenVault';
import mongoose from 'mongoose';

const force = process.argv.includes('--force');

async function run(): Promise<void> {
  await connectDb();
  const seeded = force
    ? await tokenVault.seedFromEnvIfPresent()
    : await tokenVault.seedFromEnvIfEmpty();
  if (!seeded) {
    if (force) {
      logger.warn(
        'Skipped token seed — set GHL_COMPANY_ACCESS_TOKEN and GHL_COMPANY_REFRESH_TOKEN in .env',
      );
    } else {
      logger.warn(
        'Skipped token seed — DB already has a company token. Use npm run seed:force to overwrite from .env',
      );
    }
  } else {
    logger.info(force ? 'Company token overwritten from .env' : 'Company token seeded from .env');
  }
  await ensureBootstrapAdmin();
  if (!config.bootstrap.password) {
    logger.warn('Set BOOTSTRAP_ADMIN_PASSWORD in .env to create the first admin user');
  } else {
    logger.info('Bootstrap admin ensured', { email: config.bootstrap.email });
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
