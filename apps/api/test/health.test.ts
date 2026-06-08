import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import request from 'supertest';

process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/oraia-test-health';
process.env.GHL_CLIENT_ID = 'test-client';
process.env.GHL_CLIENT_SECRET = 'test-secret';
process.env.GHL_COMPANY_ID = 'test-company';

describe('GET /health', () => {
  let app: ReturnType<typeof import('../src/app').createApp>;

  before(async () => {
    const { connectDb } = await import('../src/db/connect');
    await connectDb();
    const { createApp } = await import('../src/app');
    app = createApp();
  });

  after(async () => {
    const mongoose = await import('mongoose');
    await mongoose.disconnect();
  });

  it('returns ok when database is connected', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.db, 'connected');
  });
});
