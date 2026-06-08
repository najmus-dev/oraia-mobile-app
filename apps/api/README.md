# ORAIA API (BFF)

Backend-for-frontend for the ORAIA mobile app. Proxies GoHighLevel API v2 with encrypted tokens and JWT auth.

## Two terminals (important)

| Terminal 1 | Terminal 2 |
|------------|------------|
| `npm run dev` | `npm run smoke` or `npm test` |

`ECONNREFUSED 127.0.0.1:3000` means **dev server is not running**. Smoke does not start the server.

Do **not** run `npm run smoke / npm test` in Git Bash — `/` passes bad args to the script.

## Postman

1. Import `docs/postman/ORAIA-API.postman_collection.json`
2. `npm run dev`
3. **Auth → Login** (set password in body; saves `jwt`)
4. **Locations → List installed** — copy an `id` into collection variable `locationId`
5. Call Contacts / Conversations / Calendar / Opportunities (all need `X-Location-Id`)

## Scripts

| Command | Needs server? |
|---------|----------------|
| `npm run dev` | Starts API |
| `npm run smoke` | Yes |
| `npm test` | No (unit tests) |
| `npm run test:ghl` | No (direct GHL) |
| `npm run seed` | No (MongoDB) |
| `npm run provision:location -- <id>` | Yes (simulate INSTALL locally) |

## Location-scoped routes

All CRM routes require:

- `Authorization: Bearer <jwt>` from `/api/auth/login`
- `X-Location-Id: <id>` from `/api/locations` (marketplace **installed** sub-accounts only)

## API map

See `docs/api-contract.md` and `docs/PROJECT_STATUS.md`.

## P0 endpoints added

- `GET /api/auth/me`, `POST /api/auth/users` (admin)
- Calendar appointments create/update/delete
- Opportunities create + get by id
- `DELETE /api/contacts/:id`
- `GET /api/oauth/callback`, `POST /webhooks/ghl`
- Hourly token refresh cron

Set `GHL_OAUTH_REDIRECT_URI` only when you deploy (production OAuth callback). **Local Postman testing does not need webhooks or a tunnel** — tokens come from `.env` and location tokens are created on first CRM call.

See `docs/ghl-webhook-setup.md` (webhooks are for production / real INSTALL events).
