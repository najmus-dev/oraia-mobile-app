/**
 * Diagnose GHL company token health and attempt a refresh with full GHL error output.
 * Usage: npm run diagnose:ghl-token
 */
import axios from 'axios';
import { config } from '../src/config';
import { connectDb } from '../src/db/connect';
import { decodeJwtClientKey, oauthClientKeysMatch } from '../src/lib/ghlOAuth';
import { buildRefreshFailureMessage, parseGhlOAuthError } from '../src/lib/ghlTokenRefresh';
import { tokenVault } from '../src/services/tokenVault';
import { GhlClient } from '../src/services/ghl/ghlClient';
import { CompanyToken } from '../src/models/CompanyToken';
import { decrypt } from '../src/lib/crypto';
import mongoose from 'mongoose';

async function run(): Promise<void> {
  await connectDb();

  console.log('--- GHL token diagnostics ---');
  console.log('companyId:', config.ghl.companyId);
  console.log('oauthRedirectUri:', config.oauth.redirectUri ?? '(not set)');
  console.log('configured GHL_CLIENT_ID:', config.ghl.clientId);

  const health = await tokenVault.getCompanyTokenHealth();
  console.log('\nMongoDB token health:', JSON.stringify(health, null, 2));

  const record = await CompanyToken.findOne({ companyId: config.ghl.companyId });
  if (!record) {
    console.error('\nNo company token in MongoDB. Run OAuth install or npm run seed.');
    process.exitCode = 1;
    return;
  }

  const accessToken = decrypt(record.accessTokenEncrypted);
  const tokenClientKey = decodeJwtClientKey(accessToken);
  const clientMatch = oauthClientKeysMatch(accessToken, config.ghl.clientId);

  console.log('\n--- Client key check (required for 24h auto-refresh) ---');
  console.log('token issued for (JWT clientKey):', tokenClientKey ?? '(not found in JWT)');
  console.log('configured GHL_CLIENT_ID:       ', config.ghl.clientId);
  console.log('match:', clientMatch ? 'YES — refresh should work' : 'NO — refresh will fail after ~24h');

  if (!clientMatch) {
    console.error(
      '\nFix without changing GHL_CLIENT_ID: get NEW access+refresh tokens in Postman using',
      'the same client_id/secret as GHL_CLIENT_ID, put them in .env, then npm run seed:force.',
    );
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  console.log('\nAttempting GHL refresh (shows real API error)...');
  try {
    const refreshToken = decrypt(record.refreshTokenEncrypted);
    const tokens = await GhlClient.refreshCompanyTokens(refreshToken);
    await tokenVault.storeCompanyOAuthResponse(tokens);
    console.log('Refresh succeeded. New expiry:', GhlClient.tokenExpiresAt(tokens.expires_in, tokens.access_token));
  } catch (err) {
    const parsed = parseGhlOAuthError(err);
    console.error('\nRefresh failed:');
    console.error('  ghlStatus:', parsed.ghlStatus);
    console.error('  ghlMessage:', parsed.ghlMessage);
    console.error(
      '  guidance:',
      buildRefreshFailureMessage(parsed.ghlStatus, parsed.ghlMessage, {
        clientKeyMismatch: !clientMatch,
        tokenClientKey,
        configuredClientId: config.ghl.clientId,
      }),
    );
    if (axios.isAxiosError(err)) {
      console.error('  response:', JSON.stringify(err.response?.data, null, 2));
    }
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
