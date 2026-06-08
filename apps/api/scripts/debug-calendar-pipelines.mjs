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
const locationId = '3DJrkXHfHtMC0bCdn6wH';

const h = (token) => ({
  Authorization: `Bearer ${token}`,
  Version: version,
  Accept: 'application/json',
});

const { data: locTok } = await axios.post(
  `${base}/oauth/locationToken`,
  { companyId, locationId },
  { headers: { ...h(companyToken), 'Content-Type': 'application/json' } },
);
const lt = locTok.access_token;
console.log('location token ok');

const start = new Date(Date.now() - 7 * 86400000).toISOString();
const end = new Date(Date.now() + 30 * 86400000).toISOString();

async function tryReq(label, fn) {
  try {
    const res = await fn();
    console.log('OK', label, res.status, JSON.stringify(res.data).slice(0, 150));
    return res.data;
  } catch (e) {
    console.log('FAIL', label, e.response?.status, e.response?.data?.message || e.response?.data);
    return null;
  }
}

await tryReq('pipelines no params', () =>
  axios.get(`${base}/opportunities/pipelines`, { headers: h(lt) }),
);

await tryReq('pipelines locationId', () =>
  axios.get(`${base}/opportunities/pipelines`, { headers: h(lt), params: { locationId } }),
);

const calendars = await tryReq('GET /calendars/', () =>
  axios.get(`${base}/calendars/`, { headers: h(lt), params: { locationId } }),
);

const calId = calendars?.calendars?.[0]?.id;
if (calId) {
  await tryReq('events with calendarId', () =>
    axios.get(`${base}/calendars/events`, {
      headers: h(lt),
      params: { locationId, calendarId: calId, startTime: start, endTime: end },
    }),
  );
}

await tryReq('events with userId from token', () =>
  axios.get(`${base}/calendars/events`, {
    headers: h(lt),
    params: { locationId, userId: locTok.userId, startTime: start, endTime: end },
  }),
);
