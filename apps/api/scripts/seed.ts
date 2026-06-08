/**
 * Seeds encrypted GHL company tokens from .env and creates bootstrap admin if missing.
 * Usage: npm run seed
 */
import { config } from '../src/config';
import { connectDb } from '../src/db/connect';
import { logger } from '../src/lib/logger';
import { ensureBootstrapAdmin } from '../src/services/authService';
import { tokenVault } from '../src/services/tokenVault';
import mongoose from 'mongoose';

async function run(): Promise<void> {
  await connectDb();
  const seeded = await tokenVault.seedFromEnvIfEmpty();
  if (!seeded) {
    logger.warn(
      'Skipped token seed — DB already has a company token or GHL_COMPANY_ACCESS_TOKEN / GHL_COMPANY_REFRESH_TOKEN missing in .env',
    );
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
