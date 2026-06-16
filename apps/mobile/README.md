# ORAIA Mobile (Android-first)

React Native app (Expo) for ORAIA, backed by the API in `apps/api/`.

## Run locally (Windows + Android emulator)

1. Start the API:

```bash
cd apps/api
npm run dev
```

2. Start the mobile app:

```bash
cd apps/mobile
npm run android
```

## Local API base URL (dev)

Android emulators use `http://10.0.2.2:3000` to reach the API on your PC.

On a physical phone with Expo Go, the app auto-detects your PC's LAN IP from Metro. You can also set it in **Settings → API Base URL** (dev builds only).

## Production / preview builds (EAS)

Release builds bake in the API URL via `EXPO_PUBLIC_API_URL` in `eas.json`. Staff cannot change it in Settings.

1. Install EAS CLI and log in:

```bash
npm install -g eas-cli
eas login
```

2. Link the project (once):

```bash
cd apps/mobile
eas init
```

3. Set your production API host in `eas.json` (`preview` and `production` profiles):

```json
"EXPO_PUBLIC_API_URL": "https://api.oraiacrm.com"
```

4. Build (required once per native change, or for the first install):

```bash
npm run build:preview      # internal APK for testers
npm run build:production   # AAB for Google Play
```

5. **EAS Update (OTA)** — push JS/UI fixes without rebuilding the APK:

```bash
# Same API URL as eas.json preview profile (set in shell or .env)
$env:EXPO_PUBLIC_API_URL="https://oraia-mobile-app.onrender.com"   # PowerShell
npm run update:preview -- --message "Fix location picker padding"
```

Testers on a **preview** build get the update on the next app launch (may require opening the app twice).

**When you need a new APK/AAB instead of `eas update`:**

- New native dependency, permission, or Expo SDK upgrade
- Change to `EXPO_PUBLIC_API_URL` (bump `version` in `app.config.ts` and rebuild)
- After bumping `version`, publish updates only to builds with that runtime version

Copy `.env.example` to `.env` only if you want to test a fixed API URL in Expo Go locally.

## Current screens

- Login → location picker → Home / Inbox / Search / Calendar / Apps
- Settings: switch location, sign out (API host editor is **dev only**)

Brand tokens live in `src/theme/`.
