# ORAIA project status

## API (P0 complete — ready for Postman sign-off)

| Area | Routes |
|------|--------|
| Health | `GET /health` |
| Auth | login, me, create user (admin) |
| OAuth | `GET /api/oauth/callback` |
| Webhooks | `POST /webhooks/ghl` (INSTALL/UNINSTALL) |
| Locations | list installed |
| Contacts | CRUD + delete |
| Conversations | search, messages, send |
| Calendar | calendars, events, appointments CRUD, **free-slots** |
| Opportunities | pipelines, search, get, create, update |
| Jobs | company token auto-refresh (every 15 min + on 401) |

**Postman:** `docs/postman/ORAIA-API.postman_collection.json`  
**Contract:** `docs/api-contract.md`

## Not started

- Contact tasks (P1) — partial via Tasks app

## Build 3 — Push notifications ✅

- Mobile registers Expo push token per user + location (`expo-notifications`)
- API stores tokens in MongoDB (`PushToken` model)
- GHL **InboundMessage** webhook → Expo push to devices on that location
- Tap notification opens Inbox conversation thread
- See `docs/ghl-webhook-setup.md` to enable InboundMessage in GHL app settings

## Mobile (in progress)

Roadmap is delivered **step-by-step** (see Phase 1 below).

### Phase 1 — Step 1 ✅ Contact CRUD (mobile UI)

- Create contact (`+` on Contacts list → form → detail)
- Edit contact (pencil on detail → form)
- Delete contact (detail screen, confirmed)
- Shared validation: `apps/mobile/src/lib/contacts.ts`, `apps/api/src/lib/contactValidation.ts`
- Tests: `npm test` in `apps/mobile` and `apps/api`

### Phase 2 — Opportunities (GHL kanban) ✅

- **Opportunities tab**: horizontal kanban columns per pipeline stage, search, pipeline/sort/filter sheets
- **Create flow**: contact picker first → Add Opportunity form (pipeline, stage, status, value, source, business name)
- **Home pinned app** and tab renamed to **Opportunities**

### Phase 1 — Step 3 ✅ Edit / reschedule appointment

- Edit from appointment detail (pencil + Reschedule button)
- `AppointmentFormScreen` retained for **edit/reschedule only**
- API validation on POST/PUT appointments
- Normalized appointment responses from GHL

### Calendar UX overhaul ✅ (GHL-style create flow)

- **Appointments hub** (`CalendarScreen`): List / Weekly / Monthly views, Today button, refresh, empty state
- **FAB + bottom sheets**: New → Schedule Appointment (Blocked off time placeholder)
- **Pick contact** (`PickContactScreen`): searchable list with avatars
- **Schedule appointment** (`ScheduleAppointmentScreen`): contact card, calendar picker, Standard/Custom mode, date + slot sheets, title/description, status
- **API**: `GET /api/calendar/calendars/:calendarId/free-slots`
- Shared UI: `BottomSheet`, `MonthCalendar`, `FormPickerField`, `AppBar`
- Tests: `scheduleAppointment.test.ts` (22 mobile tests total)

### Phase 1 — Step 4 ✅ Contact pickers (Deals + legacy appointment form)

- Reusable **Contacts** search screen (`PickContactScreen`) with flows: `schedule`, `opportunity`, `appointment`
- **`ContactPickerField`** — tap to search; shows avatar, name, phone, email
- **New deal** form uses contact picker (no raw contact ID field)
- **Legacy appointment form** (reschedule/create) uses contact picker
- Shared `PickedContact` type + phone-number validation on deals
- Tests updated in `opportunities.test.ts`

### Phase 1 — Step 5 ✅ Inbox → contact link

- **View contact** from inbox list (person icon) and SMS thread (header + “View contact profile” bar)
- Cross-tab navigation to **Contacts → Contact detail**
- Open any conversation thread (even without contact); reply only when a contact is linked
- Resolve `contactId` from messages when missing on conversation row
- API returns `contactId` on each message
- Tests: `conversations.test.ts`

### Phase 1 — Step 6 ✅ Home → appointment detail

- **Today's schedule** rows on Home open **Calendar → Appointment detail** (not just the calendar tab)
- Shared helper: `navigateToAppointmentDetail()` in `navigation.ts`

### Phase 1 — Step 7 ✅ Inbox unread filter (API)

- **Unread** pill calls GHL `GET /conversations/search?status=unread` via BFF (no client-side filter)
- `buildConversationsQuery()` helper + tests
- BFF validates allowed `status` values before forwarding to GHL
- List perf: memoized inbox rows, `SectionList` on calendar list view, weekly grid event bucketing

### Phase 1 — Step 8 ✅ Session refresh (`GET /api/auth/me`)

- On cold start, stored JWT is validated via **`GET /api/auth/me`** before entering the app
- Fresh user profile persisted to SecureStore; **401** clears session → login
- Network errors during refresh fall back to cached user (token kept)
- `refreshSession()` on AppState for manual re-validation; 401 still triggers global sign-out
- Tests: `auth.test.ts`

### Phase 2 — Inbox GHL UX ✅

- **+ Compose sheet**: Direct Message, Email (+ Group/Internal coming soon)
- **Pick contact** → lookup existing thread or start new compose
- **Thread header**: avatar, contact info, call / email / star
- **Composer**: SMS/Email channel picker, debounced phone number sheet, attachment menu (stubs)
- **Filters**: Recent, Unread, Starred via GHL `status`
- **Loading UX**: separate initial load vs pull-to-refresh; optimistic send; load earlier messages
- **Mark read** on thread open (`PUT` conversation `unreadCount: 0`); inbox refreshes on focus
- **Star** toggle per thread; starred indicator in inbox list
- **API**: `/lookup`, `/phone-numbers`, `PUT /:conversationId`, message pagination `lastMessageId`

### P1 — Contact notes ✅

- **Contact detail**: list notes, add note (`GET`/`POST /api/contacts/:id/notes`)

### Inbox polish (UX) ✅

- Compose sheet: only SMS/Email enabled; Group/Team marked **Soon** (no fake alerts)
- Composer: channel + from-number chips, SMS segment counter, clear blocked-send reasons
- Removed stub attachment/camera/schedule buttons that only showed “coming soon”
- Inbox rows: unread highlight, star icon, 2-line preview, clear search
- Thread: contact phone/email bar, delivery status on bubbles, retry failed sends, long-press actions

### Inbox — MMS photos ✅

- **SMS photo attach**: library or camera → `POST /api/conversations/attachments` → send with `attachments[]`
- Message bubbles render image attachments; long-press copy link

### Inbox — list actions ✅

- **Long-press row**: mark read / mark unread, star or unstar (optimistic list update)
- **Contact prefetch**: inbox warms phone/email cache so threads can send SMS immediately

### Inbox — push notifications ✅

- Expo push token registration on login + location select
- GHL InboundMessage webhook triggers push via `expo-server-sdk`
- Tap opens conversation thread in Inbox tab

### Inbox — not yet (needs API / infra)

- Video/docs attachments, scheduled send
- Group SMS, internal team chat

### Phase 1 — complete ✅

- Expo app at `apps/mobile` (SDK 54, Expo Go compatible)
- ORAIA theme (Inter + brand palette)
- Auth flow: login → **session verify** → location picker → main tabs
- **Home**: dashboard stats + today's schedule with **tap-through to appointment detail**
- **Contacts**: search, list, contact detail
- **Inbox**: conversation list, SMS thread, send message, **link to contact profile**
- **Calendar**: GHL-style appointments hub, contact picker, schedule form, detail, edit/reschedule
- **Deals**: pipeline filters (chips), deal detail, move stage
- **Settings**: API host, switch location, sign out (gear on Home)
- Secure session persistence (SecureStore)

## GHL setup per sub-account

Install marketplace app on each sub-account → `INSTALL` webhook or first API call provisions location token.
