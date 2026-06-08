import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { connectDb } from './db/connect';
import { logger } from './lib/logger';
import { ensureBootstrapAdmin } from './services/authService';
import { startTokenRefreshJob } from './jobs/tokenRefresh';

async function main(): Promise<void> {
  await connectDb();
  await ensureBootstrapAdmin();
  startTokenRefreshJob();

  const app = createApp();
  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info('Server listening', { port: config.port, host: '0.0.0.0' });
  });

  function shutdown(signal: string) {
    logger.info('Shutting down', { signal });
    server.close(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      mongoose.connection.close().finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Failed to start server', {
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
