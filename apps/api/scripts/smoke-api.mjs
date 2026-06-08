/**
 * End-to-end smoke test — requires API running: npm run dev (separate terminal).
 * Usage: npm run smoke
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const base = process.env.API_BASE_URL || 'http://127.0.0.1:3000';
const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@oraiacrm.com';
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!password) {
  console.error('Set BOOTSTRAP_ADMIN_PASSWORD in .env');
  process.exit(1);
}

async function req(method, urlPath, { token, locationId, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (locationId) headers['X-Location-Id'] = locationId;
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${base}${urlPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const cause = err?.cause?.code || err?.code;
    if (cause === 'ECONNREFUSED') {
      console.error('\nAPI is not running on', base);
      console.error('Start it in another terminal:  cd apps/api && npm run dev\n');
      console.error('Then run:  npm run smoke\n');
      console.error('(Do not use: npm run smoke / npm test — that is invalid in Git Bash)\n');
    }
    throw err;
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const health = await req('GET', '/health');
console.log('health', health.status, health.data?.status);
if (health.status !== 200) process.exit(1);

const login = await req('POST', '/api/auth/login', {
  body: { email, password },
});
if (login.status !== 200) {
  console.error('login failed', login.status, login.data);
  process.exit(1);
}
const token = login.data.token;
console.log('login ok', login.data.user?.email);

const me = await req('GET', '/api/auth/me', { token });
console.log('me', me.status, me.data?.user?.role);
if (me.status !== 200) process.exit(1);

const locations = await req('GET', '/api/locations', { token });
console.log('locations', locations.status, 'count=', locations.data?.count);
if (locations.status !== 200 || !locations.data?.count) {
  console.error('No installed locations. Install marketplace app on a sub-account in GHL.');
  console.error(locations.data);
  process.exit(1);
}

const locId = locations.data.locations[0].id;
const contacts = await req('GET', '/api/contacts?limit=3', { token, locationId: locId });
console.log('contacts', contacts.status, 'n=', contacts.data?.contacts?.length ?? 0);

const convos = await req('GET', '/api/conversations?limit=3', { token, locationId: locId });
console.log('conversations', convos.status, 'n=', convos.data?.conversations?.length ?? 0);

const now = new Date();
const start = new Date(now.getTime() - 7 * 86400000).toISOString();
const end = new Date(now.getTime() + 30 * 86400000).toISOString();
const events = await req('GET', `/api/calendar/events?startTime=${start}&endTime=${end}`, {
  token,
  locationId: locId,
});
console.log('calendar', events.status, 'n=', events.data?.events?.length ?? 0);

const pipelines = await req('GET', '/api/opportunities/pipelines', { token, locationId: locId });
console.log('pipelines', pipelines.status, 'n=', pipelines.data?.pipelines?.length ?? 0);

const opps = await req('GET', '/api/opportunities?limit=3', { token, locationId: locId });
console.log('opportunities', opps.status, 'n=', opps.data?.opportunities?.length ?? 0);

const failed = [contacts, convos, events, pipelines, opps].filter((r) => r.status >= 400);
if (failed.length) {
  console.error('\nSome routes failed (check GHL scopes / location install):');
  failed.forEach((r) => console.error(r.status, JSON.stringify(r.data).slice(0, 300)));
  process.exit(1);
}

console.log('\nsmoke passed — locationId for Postman:', locId);
