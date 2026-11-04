# GHL webhooks & OAuth — simple guide (no ngrok)

## Local dev: skip webhooks entirely

You **do not need** a public URL or ngrok to build and test with Postman.

| What | Local approach |
|------|----------------|
| Agency token | Already in `.env` (`GHL_COMPANY_ACCESS_TOKEN` / refresh) or `npm run seed` |
| Location token | Created **automatically** on first CRM call with `X-Location-Id` |
| New sub-account | Install your marketplace app on that sub-account in GHL UI, then call any CRM endpoint |

**Simulate INSTALL on localhost** (no tunnel):

```bash
curl -X POST http://localhost:3000/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"INSTALL\",\"locationId\":\"YOUR_LOCATION_ID\",\"companyId\":\"CHSPzHNkQJPC9jf4XgDs\"}"
```

Or just hit **Contacts** in Postman — the API exchanges and caches the location token either way.

---

## When you need a public webhook URL

Only when **GoHighLevel’s servers** must reach your API (production, or you want real INSTALL events without manual steps).

Your endpoint: **`POST /webhooks/ghl`**

### Webhook authentication (production)

GHL signs webhook payloads. Configure on the API:

| Env var | Header | Scheme |
|---------|--------|--------|
| `WEBHOOK_SIGNATURE_PUBLIC_KEY` | `x-ghl-signature` | Ed25519 (preferred) |
| `WEBHOOK_PUBLIC_KEY` | `x-wh-signature` | RSA-SHA256 (legacy) |
| `GHL_WEBHOOK_SECRET` | `x-ghl-webhook-secret` | Shared secret fallback |

Copy the public keys from **Marketplace → My Apps → Advanced settings**.  
Local dev: omit all three to allow unsigned `curl` testing.

**Important:** Company tokens in `.env` are only loaded via `npm run seed` when MongoDB is empty — server boot no longer overwrites OAuth-refreshed tokens on redeploy.

### Push notifications (SMS + calls)

GHL’s marketplace app sends SMS **and** calls on the same webhook: **InboundMessage**. Official payload examples:

- SMS: `"type":"InboundMessage"`, `"messageType":"SMS"`
- Answered call: `"messageType":"CALL"`, `"callStatus":"completed"`
- Voicemail: `"messageType":"CALL"` (or `TYPE_VOICEMAIL`), `"callStatus":"voicemail"`

Live ringing (the phone UI while it is ringing) is **LC Phone / the official HighLevel app only**. Oraia notifies after the inbound SMS, missed call, or voicemail the same way other marketplace apps do.

In **Marketplace → My Apps → Advanced settings → Webhooks**, enable:

- **InboundMessage** — required for SMS, missed calls, and voicemail
- **ConversationUnreadUpdate** — in-app unread backup if a message webhook is missed
- **AppointmentCreate** — new appointments
- **TaskCreate** — new tasks

Default webhook URL:

```text
https://oraia-mobile-app.onrender.com/webhooks/ghl
```

Android channels: `messages`, `calls`, `tasks`, `appointments`. A preview APK **cannot** get a push token until Firebase FCM is added:

1. Firebase Console → add Android app with package `com.oraiacrm.app`
2. Download `google-services.json` into `apps/mobile/`
3. Firebase → Project settings → Service accounts → Generate new private key
4. Expo → Project → Credentials → Android `com.oraiacrm.app` → FCM V1 service account key → upload that JSON
5. Rebuild the preview APK (`google-services.json` is required by `app.config.ts`)

Who gets the push:

- Conversation assigned to a GHL user → that ORAIA account **and** agency admins
- Unassigned, or the GHL user has no ORAIA login → everyone with access to that sub-account

The app registers an Expo push token per user (`POST /api/push-tokens/register`). Tokens follow the user across location switches.

Set `PUSH_NOTIFICATIONS_ENABLED=false` on the API to accept webhooks without sending pushes.

### Local check (no ngrok)

API running on port 3000, unsigned webhooks allowed in development. Use a **physical phone** (emulators do not get Expo pushes).

1. Sign in on the phone, allow notifications, open **Settings → Send test notification**.
2. Simulate an inbound SMS:

```bash
curl -X POST http://localhost:3000/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"InboundMessage\",\"locationId\":\"YOUR_LOCATION_ID\",\"conversationId\":\"convo_test\",\"contactId\":\"contact_test\",\"messageId\":\"msg_sms_1\",\"messageType\":\"SMS\",\"direction\":\"inbound\",\"from\":\"+15551234567\",\"body\":\"Local SMS test\"}"
```

3. Simulate a missed call / voicemail:

```bash
curl -X POST http://localhost:3000/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"InboundMessage\",\"locationId\":\"YOUR_LOCATION_ID\",\"conversationId\":\"convo_test\",\"messageId\":\"msg_call_1\",\"messageType\":\"CALL\",\"direction\":\"inbound\",\"from\":\"+15551234567\",\"status\":\"voicemail\",\"callStatus\":\"voicemail\",\"messageTypeString\":\"TYPE_VOICEMAIL\"}"
```

The phone should show **SMS from …** or **Voicemail from …**. After that works, deploy the API and rebuild the Expo preview APK.

---

## Production setup (later)

1. Deploy API (Railway, Render, etc.) → e.g. `https://oraia-api.onrender.com`
2. In [Marketplace Dashboard](https://marketplace.gohighlevel.com/) → **My Apps** → your app → **Advanced settings** → **Webhooks**
3. Set **Default Webhook URL**:

   ```text
   https://oraia-api.onrender.com/webhooks/ghl
   ```

4. Enable **Install** and **Uninstall**
5. Set **Redirect URI** (OAuth) in the same screen + `.env`:

   ```env
   GHL_OAUTH_REDIRECT_URI=https://oraia-api.onrender.com/api/oauth/callback
   ```

Docs: [Create Marketplace App](https://marketplace.gohighlevel.com/docs/oauth/CreateMarketplaceApp/) · [Webhook guide](https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/)

---

## What INSTALL / UNINSTALL do

- **INSTALL** → API stores encrypted location token for that sub-account
- **UNINSTALL** → API removes cached token

If webhooks are not configured, location tokens still work via on-demand exchange when the mobile app or Postman calls CRM routes.

---

## Optional: localtunnel (if you really want GHL to hit your PC)

No install, no ngrok account:

```bash
npx localtunnel --port 3000
```

Use the printed `https://....loca.lt` URL + `/webhooks/ghl` in GHL. Keep the tunnel terminal open. This is optional — not required for Postman testing.
