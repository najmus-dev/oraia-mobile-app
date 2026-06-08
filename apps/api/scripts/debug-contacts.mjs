import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const base = 'https://services.leadconnectorhq.com';
const version = process.env.GHL_API_VERSION || '2021-07-28';
const companyToken = process.env.GHL_COMPANY_ACCESS_TOKEN;
const companyId = process.env.GHL_COMPANY_ID;
const locationId = process.env.PILOT_LOCATION_ID || 'jUuKyGiJ4Ohze3m2bGo1';

const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  Version: version,
  Accept: 'application/json',
});

async function tryReq(label, fn) {
  try {
    const res = await fn();
    console.log(label, res.status, JSON.stringify(res.data).slice(0, 200));
  } catch (e) {
    console.log(label, e.response?.status, e.response?.data ?? e.message);
  }
}

await tryReq('GET /contacts/ company token', () =>
  axios.get(`${base}/contacts/`, {
    headers: headers(companyToken),
    params: { locationId, limit: 5 },
  }),
);

let lt;
try {
  const { data: locTok } = await axios.post(
    `${base}/oauth/locationToken`,
    { companyId, locationId },
    { headers: { ...headers(companyToken), 'Content-Type': 'application/json' } },
  );
  lt = locTok.access_token;
  console.log('location token ok', locTok.userType);
} catch (e) {
  console.log('locationToken failed', e.response?.status, e.response?.data);
}

const { data: search } = await axios.get(`${base}/locations/search`, {
  headers: headers(companyToken),
  params: { limit: 5 },
});
console.log(
  'locations sample',
  search.locations?.map((l) => l.id).join(', '),
);

for (const loc of search.locations?.slice(0, 3) ?? []) {
  try {
    const { data } = await axios.post(
      `${base}/oauth/locationToken`,
      { companyId, locationId: loc.id },
      { headers: { ...headers(companyToken), 'Content-Type': 'application/json' } },
    );
    console.log('locationToken ok for', loc.id, loc.name);
    lt = data.access_token;
    locationId = loc.id;
    break;
  } catch (e) {
    console.log('locationToken fail', loc.id, e.response?.data?.message);
  }
}

if (lt) {
  await tryReq('GET /contacts/ location token', () =>
    axios.get(`${base}/contacts/`, {
      headers: headers(lt),
      params: { locationId, limit: 5 },
    }),
  );

  await tryReq('POST /contacts/search', () =>
    axios.post(
      `${base}/contacts/search`,
      { locationId, pageLimit: 5 },
      { headers: { ...headers(lt), 'Content-Type': 'application/json' } },
    ),
  );
}
