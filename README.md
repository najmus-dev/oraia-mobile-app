# ORAIA Mobile App

Monorepo for the ORAIA CRM mobile app and its backend API (BFF for GoHighLevel API v2).

| App | Path | Description |
|-----|------|-------------|
| API | `apps/api` | Express + MongoDB BFF |
| Mobile | `apps/mobile` | Expo / React Native (Android-first) |

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

`render.yaml` is included for one-click deploy from this repo.

### Render deploy steps

1. [render.com](https://render.com) → **New** → **Blueprint**
2. Connect `https://github.com/najmus-dev/oraia-mobile-app`
3. Set secret env vars from `apps/api/.env.example` (copy from your local `apps/api/.env`)
4. Required production values:
   - `MONGODB_URI` — MongoDB Atlas
   - `JWT_SECRET`, `ENCRYPTION_KEY`
   - `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_COMPANY_ID`
   - `GHL_COMPANY_ACCESS_TOKEN`, `GHL_COMPANY_REFRESH_TOKEN`
   - `GHL_OAUTH_REDIRECT_URI` → `https://YOUR_API_HOST/api/oauth/callback`
   - `BOOTSTRAP_ADMIN_PASSWORD`
5. Add custom domain (e.g. `api.oraiacrm.com`) → DNS CNAME to Render
6. Verify: `curl https://YOUR_API_HOST/health`

### GHL marketplace app

- **Redirect URI**: `https://YOUR_API_HOST/api/oauth/callback`
- **Webhook URL**: `https://YOUR_API_HOST/webhooks/ghl`

## Mobile release builds (EAS)

After the API is live, set the host in `apps/mobile/eas.json`:

```json
"EXPO_PUBLIC_API_URL": "https://api.oraiacrm.com"
```

```bash
cd apps/mobile
npm run build:preview      # internal APK
npm run build:production   # Play Store AAB
```

## Docs

- `docs/api-contract.md` — API endpoints
- `docs/ghl-webhook-setup.md` — GHL OAuth + webhooks
- `docs/postman/` — Postman collection
