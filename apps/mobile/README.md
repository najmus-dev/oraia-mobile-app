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

4. Build:

```bash
npm run build:preview      # internal APK for testers
npm run build:production   # AAB for Google Play
```

Copy `.env.example` to `.env` only if you want to test a fixed API URL in Expo Go locally.

## Current screens

- Login → location picker → Home / Inbox / Search / Calendar / Apps
- Settings: switch location, sign out (API host editor is **dev only**)

Brand tokens live in `src/theme/`.
