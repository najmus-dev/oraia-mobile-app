import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../lib/logger';

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongodbUri);
  logger.info('MongoDB connected');
}
