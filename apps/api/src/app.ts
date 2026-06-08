import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { ghlErrorMiddleware } from './middleware/ghlError';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { calendarRouter } from './routes/calendar';
import { contactsRouter } from './routes/contacts';
import { conversationsRouter } from './routes/conversations';
import { locationsRouter } from './routes/locations';
import { oauthRouter } from './routes/oauth';
import { dashboardRouter } from './routes/dashboard';
import { opportunitiesRouter } from './routes/opportunities';
import { tasksRouter } from './routes/tasks';
import { webhooksRouter } from './routes/webhooks';
import { pushTokensRouter } from './routes/pushTokens';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());

  const corsOrigin = config.isProduction
    ? config.cors.allowedOrigins.length > 0
      ? config.cors.allowedOrigins
      : false
    : true;
  app.use(cors({ origin: corsOrigin }));

  // GHL webhooks must verify signatures against the raw body before JSON parsing.
  app.use(
    '/webhooks',
    express.raw({ type: 'application/json', limit: '1mb' }),
    webhooksRouter,
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(healthRouter);
  app.use('/api/oauth', oauthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/locations', locationsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/opportunities', opportunitiesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/push-tokens', pushTokensRouter);

  app.use(ghlErrorMiddleware);
  app.use(errorHandler);
  return app;
}
