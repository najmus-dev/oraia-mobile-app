/**
 * Simulate GHL INSTALL webhook on localhost (no tunnel).
 * Usage: npm run provision:location -- 3DJrkXHfHtMC0bCdn6wH
 */
const base = process.env.API_BASE ?? 'http://127.0.0.1:3000';
const locationId = process.argv[2];
const companyId = process.env.GHL_COMPANY_ID ?? 'CHSPzHNkQJPC9jf4XgDs';

if (!locationId) {
  console.error('Usage: npm run provision:location -- <locationId>');
  process.exit(1);
}

const res = await fetch(`${base}/webhooks/ghl`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'INSTALL', locationId, companyId }),
});

const text = await res.text();
console.log(res.status, text);
