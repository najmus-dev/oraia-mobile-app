# ORAIA Mobile App

Monorepo for the ORAIA CRM mobile app and its backend API (BFF for GoHighLevel API v2).

| App | Path | Description |
|-----|------|-------------|
| API | `apps/api` | Express + MongoDB BFF |
| Mobile | `apps/mobile` | Expo / React Native (Android-first) |

**Production API:** https://oraia-mobile-app.onrender.com  
**Health check:** https://oraia-mobile-app.onrender.com/health

## Local development

```bash
npm run dev:api      # API on :3000
npm run dev:mobile   # Expo Android
npm test             # all workspace tests
```

## Deploy API → use Render (not Vercel)

This API is a **long-running Express server** with MongoDB, background token refresh, and webhooks.

| Platform | Fit |
|----------|-----|
| **Render** | Best — Docker web service, always-on, cron-friendly, custom domain |
| **Vercel** | Poor fit — serverless; no persistent process, cold starts, cron/webhooks awkward |

`render.yaml` and a root `Dockerfile` are included for deploy from this repo.

### Render deploy steps

**Option A — Blueprint**

1. [render.com](https://render.com) → **New** → **Blueprint**
2. Connect `https://github.com/najmus-dev/oraia-mobile-app`

**Option B — Web Service (Docker)**

1. **New** → **Web Service** → connect the repo
2. Runtime: **Docker** (uses root `Dockerfile`)
3. Or set **Root Directory** to `apps/api` to use the API-local Dockerfile

**Environment variables** (from `apps/api/.env.example`):

- `MONGODB_URI` — MongoDB Atlas
- `JWT_SECRET`, `ENCRYPTION_KEY`
- `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_COMPANY_ID`
- `GHL_COMPANY_ACCESS_TOKEN`, `GHL_COMPANY_REFRESH_TOKEN`
- `GHL_OAUTH_REDIRECT_URI` → `https://oraia-mobile-app.onrender.com/api/oauth/callback`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `NODE_ENV` → `production`

Verify after deploy:

```bash
curl https://oraia-mobile-app.onrender.com/health
```

Optional: add custom domain `api.oraiacrm.com` in Render → point DNS CNAME to Render.

### GHL marketplace app

- **Redirect URI**: `https://oraia-mobile-app.onrender.com/api/oauth/callback`
- **Webhook URL**: `https://oraia-mobile-app.onrender.com/webhooks/ghl`

## Mobile release builds (EAS)

Release builds use the live API via `EXPO_PUBLIC_API_URL` in `apps/mobile/eas.json`:

```json
"EXPO_PUBLIC_API_URL": "https://oraia-mobile-app.onrender.com"
```

```bash
cd apps/mobile
eas login          # once
npm run build:preview      # internal APK for testers
npm run build:production   # Play Store AAB
```

## Docs

- `docs/api-contract.md` — API endpoints
- `docs/ghl-webhook-setup.md` — GHL OAuth + webhooks
- `docs/postman/` — Postman collection
