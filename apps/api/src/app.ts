import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { ghlErrorMiddleware } from './middleware/ghlError';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { calendarRouter } from './routes/calendar';
import { contactsRouter } from './routes/contacts';
import { conversationsRouter } from './routes/conversations';
import { locationsRouter } from './routes/locations';
import { oauthRouter } from './routes/oauth';
import { opportunitiesRouter } from './routes/opportunities';
import { tasksRouter } from './routes/tasks';
import { webhooksRouter } from './routes/webhooks';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
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
  app.use('/webhooks', webhooksRouter);
  app.use('/api/oauth', oauthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/locations', locationsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/opportunities', opportunitiesRouter);
  app.use('/api/tasks', tasksRouter);

  app.use(ghlErrorMiddleware);
  app.use(errorHandler);
  return app;
}
