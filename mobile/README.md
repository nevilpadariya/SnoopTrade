# SnoopTrade Mobile (Expo)

Mobile app scaffold for SnoopTrade based on the wireframes in:
- `docs/mobile-ui/SnoopTrade-mobile-wireframes.svg`
- `docs/mobile-ui/SnoopTrade-mobile-ui-spec.md`

## Stack
- Expo + React Native + TypeScript
- React Navigation (stack + bottom tabs)
- Secure token storage with `expo-secure-store`
- API integration with existing FastAPI backend

## Implemented MVP Screens
- Login
- Signup
- Home Dashboard
- Stock Detail (with period switch + forecast trigger)
- Forecast
- Transactions
- Account

## Setup
1. Copy env values:
```bash
cp .env.example .env
```
2. Install dependencies:
```bash
npm install
```
3. Start app:
```bash
npm run start
```

## Google Sign-In Testing
Use a development build for OAuth testing on device:
```bash
npx expo run:android
# or
npx expo run:ios
```
Then launch Metro with:
```bash
npm run start
```

## Environment
- `EXPO_PUBLIC_API_BASE_URL`: backend base URL
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID used for mobile + web token verification
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: optional web client ID override
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`: optional Android client ID override
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: optional iOS client ID override

Default value in `.env.example` points to your deployed backend.

Google sign-in requires the backend `GOOGLE_CLIENT_ID` value to match the client ID used by the mobile app.
For local testing, Google sign-in requires an Expo Development Build (not Expo Go).

## Current Notes
- Forecast tab uses results generated from Stock Detail "Predict Future Trends" action.
