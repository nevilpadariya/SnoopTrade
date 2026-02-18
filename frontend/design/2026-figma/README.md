# SnoopTrade 2026 Redesign (Figma + shadcn/ui)

This folder is a Figma-ready redesign package for the web app.

## Files
- `figma-brief.md`: Full board structure, screen specs, motion, and component rules.
- `shadcn-mapping.md`: Exact mapping from Figma components to `shadcn/ui` primitives.
- `tokens-2026.json`: Design tokens (color, typography, spacing, radius, elevation, motion).
- `figma-ai-prompt.md`: Prompt to paste into Figma AI / Make for fast first-pass generation.

## Quick Start (Figma)
1. Create a new Figma file named `SnoopTrade 2026`.
2. Add pages:
   - `00 Cover`
   - `01 Foundations`
   - `02 Components`
   - `03 Screens`
   - `04 Prototype`
3. Install fonts:
   - `Sora` (headlines)
   - `Manrope` (body/UI)
   - `JetBrains Mono` (numbers/ticker/code)
4. Copy token values from `tokens-2026.json` into Figma Variables (or Tokens Studio).
5. Build components from `shadcn-mapping.md` and compose screens from `figma-brief.md`.

## Visual Direction
Style name: **Signal Glass 2026**

- Dense, data-first layout with calm high-contrast surfaces.
- Green-forward brand with graphite neutrals and mint highlights.
- Subtle glass + grain + radial glow, not heavy neon.
- Large expressive headings, compact UI body text, monospaced market numbers.

## Scope Covered
- Landing
- Login
- Sign up
- Create password
- Dashboard
- Account settings

## Notes
- This redesign is zero-cost: all fonts and libraries are free.
- It is aligned to your existing route/component architecture, so migration to implementation is straightforward.
