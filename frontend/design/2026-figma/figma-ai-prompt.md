# Figma AI Prompt

Design a modern 2026 fintech web app called "SnoopTrade" in a style named "Signal Glass".

Use this direction:
- Premium, data-intelligence feel.
- Dark graphite surfaces with mint green accents.
- Subtle radial gradients, soft glass cards, and low-noise texture.
- High contrast and accessibility-first typography.
- Headline font: Sora. Body font: Manrope. Numeric/ticker font: JetBrains Mono.

Create pages:
1. Landing
2. Login
3. Signup
4. Dashboard
5. Account Settings

Create desktop and mobile variants:
- Desktop width 1440
- Mobile width 390

Design system constraints:
- 12-column grid desktop, 4-column mobile
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96
- Radius: 10, 14, 18, 24
- Primary color #90D987
- Background dark #080B09
- Card #0E1410
- Border #243027
- Foreground #E6ECE8
- Muted text #9AA99F
- Buy signal #48C78E
- Sell signal #F26D6D

Required components:
- Sticky top nav with search and account avatar
- Hero with CTA buttons
- Auth card with email/password and Google button
- Dashboard with chart card, stat cards, forecast card, transaction table
- Account page with profile card and password form

Interaction states:
- Default, hover, focus, disabled, error for all form controls and buttons
- Use subtle motion: 180ms ease for entrances and hover lift

Output requirements:
- Build reusable components and variants first
- Name layers clearly
- Use Auto Layout throughout
- Keep implementation realistic for shadcn/ui + Tailwind
