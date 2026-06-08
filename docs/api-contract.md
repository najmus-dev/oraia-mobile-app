# ORAIA API contract

Base URL: `http://localhost:3000`

Errors: `{ "error": { "code": string, "message": string } }`

## Headers (CRM routes)

| Header | Required |
|--------|----------|
| `Authorization: Bearer <jwt>` | Yes (from login) |
| `X-Location-Id: <locationId>` | Yes (from `/api/locations`) |

---

## Health

`GET /health` — no auth

---

## Auth (ORAIA users)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` | JWT |
| POST | `/api/auth/users` | JWT + agency_admin |

**Login body:** `{ "email", "password" }`

**Create user body:** `{ "email", "password", "role": "staff"|"agency_admin", "allowedLocationIds": ["..."] }`  
Staff must have at least one `allowedLocationId`.

---

## OAuth (GHL marketplace)

| Method | Path |
|--------|------|
| GET | `/api/oauth/callback?code=` |

Set `GHL_OAUTH_REDIRECT_URI` to match your GHL app redirect URI. Stores agency tokens in MongoDB.

---

## Webhooks (GHL marketplace)

| Method | Path |
|--------|------|
| POST | `/webhooks/ghl` |

Handles `INSTALL` (provision location token) and `UNINSTALL` (remove cached token).  
Configure in GHL app: `https://your-api.com/webhooks/ghl`

---

## Locations

`GET /api/locations` — JWT only. Marketplace-**installed** sub-accounts.

---

## Contacts

| Method | Path |
|--------|------|
| GET | `/api/contacts?limit=20&query=` |
| GET | `/api/contacts/:contactId` |
| POST | `/api/contacts` |
| PUT | `/api/contacts/:contactId` |
| DELETE | `/api/contacts/:contactId` |
| GET | `/api/contacts/:contactId/notes` |
| POST | `/api/contacts/:contactId/notes` — body: `{ "body": "note text" }` |

---

## Conversations

| Method | Path |
|--------|------|
| GET | `/api/conversations?limit=20&status=&query=&contactId=` |
| GET | `/api/conversations/lookup?contactId=` |
| GET | `/api/conversations/phone-numbers?search=` |
| PUT | `/api/conversations/:conversationId` — body: `unreadCount` (0 = read, ≥1 = unread), and/or `starred` |
| POST | `/api/conversations/attachments` — multipart `file`, fields `contactId` and/or `conversationId` (max 5 MB) |
| GET | `/api/conversations/:conversationId/messages?limit=&lastMessageId=` |
| POST | `/api/conversations/messages` — body: `type` (SMS/Email), `contactId`, `message` and/or `attachments[]`, optional `fromNumber`, `subject`/`html` for Email |

`status` values: `unread`, `starred`, `recents`, `read`, `all` (forwarded to [GHL search](https://marketplace.gohighlevel.com/docs/ghl/conversations/search-conversation/)).

---

## Calendar

| Method | Path |
|--------|------|
| GET | `/api/calendar/calendars` |
| GET | `/api/calendar/events?startTime=&endTime=&calendarId=` |
| GET | `/api/calendar/appointments/:eventId` |
| POST | `/api/calendar/appointments` |
| PUT | `/api/calendar/appointments/:eventId` |
| DELETE | `/api/calendar/appointments/:eventId` |

---

## Opportunities

| Method | Path |
|--------|------|
| GET | `/api/opportunities/pipelines` |
| GET | `/api/opportunities?limit=20` |
| GET | `/api/opportunities/:opportunityId` |
| POST | `/api/opportunities` |
| PUT | `/api/opportunities/:opportunityId` |

---

## Platform

- Company + location tokens: encrypted in MongoDB
- Hourly cron: refresh company token before expiry
- Mobile app: MVP screens wired (see `docs/PROJECT_STATUS.md`)
