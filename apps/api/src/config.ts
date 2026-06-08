import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

const nodeEnv = optionalEnv('NODE_ENV', 'development');

export const config = {
  port: Number(optionalEnv('PORT', '3000')),
  nodeEnv,
  isProduction: nodeEnv === 'production',
  mongodbUri: requireEnv('MONGODB_URI'),
  jwtSecret: requireEnv('JWT_SECRET'),
  encryptionKey: requireEnv('ENCRYPTION_KEY'),
  ghl: {
    baseUrl: 'https://services.leadconnectorhq.com',
    clientId: requireEnv('GHL_CLIENT_ID'),
    /** Marketplace app id (no client suffix). Defaults from GHL_CLIENT_ID before last `-`. */
    appId:
      process.env.GHL_APP_ID?.trim() ||
      requireEnv('GHL_CLIENT_ID').replace(/-[^-]+$/, ''),
    clientSecret: requireEnv('GHL_CLIENT_SECRET'),
    companyId: requireEnv('GHL_COMPANY_ID'),
    apiVersion: optionalEnv('GHL_API_VERSION', '2021-07-28'),
    companyAccessToken: process.env.GHL_COMPANY_ACCESS_TOKEN?.trim(),
    companyRefreshToken: process.env.GHL_COMPANY_REFRESH_TOKEN?.trim(),
  },
  bootstrap: {
    email: optionalEnv('BOOTSTRAP_ADMIN_EMAIL', 'admin@oraiacrm.com'),
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim(),
  },
  oauth: {
    redirectUri: process.env.GHL_OAUTH_REDIRECT_URI?.trim(),
  },
  cors: {
    /** Comma-separated allowed origins. Empty in production denies cross-origin requests. */
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  webhooks: {
    /** Legacy shared secret header (x-ghl-webhook-secret) — prefer Ed25519/RSA keys */
    secret: process.env.GHL_WEBHOOK_SECRET?.trim(),
    /** Ed25519 public key for x-ghl-signature (WEBHOOK_SIGNATURE_PUBLIC_KEY) */
    ed25519PublicKey: process.env.WEBHOOK_SIGNATURE_PUBLIC_KEY?.trim(),
    /** RSA public key for legacy x-wh-signature (WEBHOOK_PUBLIC_KEY) */
    rsaPublicKey: process.env.WEBHOOK_PUBLIC_KEY?.trim(),
  },
  push: {
    /** When false, inbound webhooks are accepted but no push is sent */
    enabled: process.env.PUSH_NOTIFICATIONS_ENABLED !== 'false',
  },
};
