# SnoopTrade Mobile UI Spec (MVP)

## 1) Product Goal
Build a mobile app focused on your strongest current value:
- track insider transactions by ticker
- compare with stock movement
- run 30-day forecast
- let users manage account/auth

This spec is based on your existing web routes/components:
- `/login`, `/signup`, `/dashboard`, `/account`
- API: `/auth/*`, `/stocks/{ticker}`, `/transactions/{ticker}`, `/future`

## 2) Mobile Information Architecture
Primary navigation (bottom tabs):
1. Home
2. Transactions
3. Forecast
4. Account

Secondary flows:
- Login / Sign up
- Company Search + Select
- Time-range switch: `1M`, `3M`, `6M`, `1Y`

## 3) MVP Screens
1. **Auth (Login)**
- Email, Password, Login CTA
- Google Sign-In CTA
- Link to Sign Up

2. **Home (Dashboard)**
- Search ticker/company
- Selected company chip (logo + ticker + full name)
- Mini stock trend chart
- Market summary cards (open/high/low/close)

3. **Stock Detail**
- Header with company identity
- Time-range segmented control (`1M/3M/6M/1Y`)
- Main line chart for stock price
- CTA: `Predict Future Trends`

4. **Forecast**
- Forecast chart with baseline + trend + seasonal
- Confidence band (`yhat_lower` / `yhat_upper`)
- 7-day quick list with predicted values

5. **Transactions**
- Summary chips for transaction types (P/S/M/etc.)
- List rows: date, type, shares, price/share, total value
- Sort/filter entry point

6. **Account**
- Read-only user profile (email/name/login type)
- Create/change password flow
- Logout

## 4) Layout + Spacing
Use 8pt system:
- Page horizontal padding: 16
- Card radius: 16
- Primary button height: 48
- Input height: 48
- Section gap: 16
- Card inner padding: 16

Safe areas:
- Respect top notch and bottom home indicator on every screen.

## 5) Visual Direction
Keep your existing brand direction (green + neutral) but mobile-first contrast:

Core tokens:
- `bg`: `#0E1410`
- `surface`: `#1A231C`
- `surface-soft`: `#253129`
- `text`: `#EAF5EC`
- `text-muted`: `#A7B7AC`
- `primary`: `#B7E389`
- `primary-strong`: `#9DD665`
- `accent`: `#64C9A8`
- `danger`: `#E56A6A`
- `border`: `#314036`

Typography:
- Heading: `Google Sans` Semibold/Bold
- Body: `Google Sans` Regular/Medium
- Numeric/table values: `JetBrains Mono`

## 6) Component Mapping from Current Web App
- Search bar -> `SearchBar`
- Company picker -> `CompanyList`
- Stock chart -> `ChartContainer`
- Forecast chart -> `ForecastChartContainer`
- Transaction list -> `DataTable` (converted to mobile list cards)
- Auth/account forms -> existing form patterns

## 7) API Mapping (No Backend Rewrite Needed)
- Login: `POST /auth/token`
- Sign up: `POST /auth/signup`
- Account info: `GET /auth/me`
- Update password: `PUT /auth/me/update`
- Stock data: `GET /stocks/{ticker}?period=`
- Transactions: `GET /transactions/{ticker}?time_period=`
- Forecast: `POST /future`

## 8) Build Recommendations
### Recommended stack
- **React Native + Expo + TypeScript** (fastest path from your current React codebase)
- Navigation: `@react-navigation/native` (bottom tabs + stack)
- Data fetching/cache: `@tanstack/react-query`
- Charts: `victory-native` or `react-native-gifted-charts`
- Secure token storage: `expo-secure-store`

### Suggested structure
- `mobile/src/screens/*`
- `mobile/src/components/*`
- `mobile/src/services/api.ts`
- `mobile/src/state/auth.ts`
- `mobile/src/theme/tokens.ts`

## 9) Delivery Files
- Wireframes: `docs/mobile-ui/SnoopTrade-mobile-wireframes.svg`
- This spec: `docs/mobile-ui/SnoopTrade-mobile-ui-spec.md`

You can import the SVG directly into Figma and convert each phone into components/frames for high-fidelity iteration.
