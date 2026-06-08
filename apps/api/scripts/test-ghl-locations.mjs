/**
 * Smoke-test GHL locations/search with tokens from .env (no API server required).
 * Usage: npm run test:ghl
 */
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const token = process.env.GHL_COMPANY_ACCESS_TOKEN?.trim();
const version = process.env.GHL_API_VERSION?.trim() || '2021-07-28';

if (!token) {
  console.error('Missing GHL_COMPANY_ACCESS_TOKEN in .env');
  process.exit(1);
}

const { status, data } = await axios.get('https://services.leadconnectorhq.com/locations/search', {
  headers: {
    Authorization: `Bearer ${token}`,
    Version: version,
    Accept: 'application/json',
  },
  params: { limit: 5 },
  validateStatus: () => true,
});

console.log('status:', status);
console.log('count:', data?.locations?.length ?? 0);
if (data?.locations?.[0]) {
  console.log('first:', { id: data.locations[0].id, name: data.locations[0].name });
}
process.exit(status === 200 && (data?.locations?.length ?? 0) > 0 ? 0 : 1);
