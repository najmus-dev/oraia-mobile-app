import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const base = 'https://services.leadconnectorhq.com';
const version = process.env.GHL_API_VERSION || '2021-07-28';
const token = process.env.GHL_COMPANY_ACCESS_TOKEN;
const companyId = process.env.GHL_COMPANY_ID;
const appId = process.env.GHL_CLIENT_ID;

const headers = {
  Authorization: `Bearer ${token}`,
  Version: version,
  Accept: 'application/json',
};

for (const pathSuffix of [
  `/oauth/installedLocations?companyId=${companyId}&appId=${appId}`,
  `/oauth/installedLocations?companyId=${companyId}`,
]) {
  try {
    const { status, data } = await axios.get(`${base}${pathSuffix}`, { headers });
    console.log(pathSuffix, status, JSON.stringify(data).slice(0, 500));
  } catch (e) {
    console.log(pathSuffix, e.response?.status, e.response?.data);
  }
}
