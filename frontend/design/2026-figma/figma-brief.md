# Figma Brief: SnoopTrade 2026

## 1) Product Narrative
SnoopTrade should feel like a premium intelligence terminal made for retail investors: fast, trustworthy, and actionable.

Primary message:
- "See insider behavior before the crowd reacts."

## 2) Board Structure

## Page: 00 Cover
- One hero composition with brand mark, gradient field, and 3 key UI previews.
- Title: `SnoopTrade: Signal Glass 2026`.

## Page: 01 Foundations
Build variable collections:
- Color
- Typography
- Spacing
- Radius
- Shadows
- Motion

Add 3 style references:
- "Surface system"
- "Chart color system"
- "Interaction states"

## Page: 02 Components
Create variants with Auto Layout:
- Navigation
- Buttons
- Inputs
- Cards
- Tabs
- Badges
- Table row
- Toast
- Empty states
- Loading states

## Page: 03 Screens
Desktop frames:
- 1440 x 1024: Landing
- 1440 x 1024: Login
- 1440 x 1024: Signup
- 1440 x 1024: Dashboard
- 1440 x 1024: Account

Mobile frames:
- 390 x 844: Login
- 390 x 844: Dashboard
- 390 x 844: Account

## Page: 04 Prototype
Flows:
- Anonymous -> Login -> Dashboard
- Login with Google -> Create Password (if required) -> Dashboard
- Dashboard -> Account -> Logout

## 3) Grid + Layout Rules
Desktop:
- 12-column grid, 80px margins, 24px gutters.
- Content max width: 1280px.

Mobile:
- 4-column grid, 20px margins, 12px gutters.

Vertical rhythm:
- Base spacing unit: 4px.
- Section spacing: 64/80/96 desktop, 32/40 mobile.

## 4) Screen Specs

## Landing
- Hero split layout: narrative left, live-preview card right.
- Trust strip below hero: "SEC synced", "Daily refresh", "Free forever".
- Feature cards (3-up desktop, 1-up mobile).
- CTA pair: `Get Started` (primary), `See Dashboard` (ghost).

## Login / Signup
- Centered auth card on atmospheric gradient background.
- Left side (desktop): brand story + social proof.
- Right side: form with strong label hierarchy.
- Google action is secondary but prominent.

## Dashboard
Top row:
- Symbol search and quick switcher.
- Time-range segmented control.
- Key stat cards (Open, Close, High, Low).

Main body:
- Price trend chart (primary).
- Insider activity chart.
- Forecast card with confidence band.
- Transactions table (sticky header, row hover state).

Right rail (desktop):
- "Signal summary" card.
- "News + filing pulse" list placeholder for future roadmap.

## Account
- Profile identity card.
- Security card (change/create password).
- Login method chips.
- Session actions card (logout, future device list placeholder).

## 5) Motion Language
Use short, purposeful motion only:
- Page entrance: 180ms fade + 8px translate-up.
- Card reveal stagger: 30ms between siblings.
- Hover lift: 120ms, translateY(-2px), shadow increase.
- Focus ring: immediate with 2px high-contrast ring.

## 6) Accessibility Rules
- Minimum contrast 4.5:1 for body text.
- Target size at least 40x40 for all tap targets.
- All charts need textual summaries.
- Keyboard flow defined for all auth and dashboard interactions.

## 7) Copy Tone
- Crisp, analytical, confident.
- Avoid hype words like "moon"/"alpha".
- Use operational language: "signal", "activity", "confidence", "trend".

## 8) Handoff Notes
Each component in Page `02 Components` must include:
- Anatomy labels
- Variant states (default/hover/focus/disabled/error)
- Token usage notes
- Equivalent `shadcn/ui` primitive
