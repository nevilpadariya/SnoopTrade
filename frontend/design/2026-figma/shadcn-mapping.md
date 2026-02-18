# shadcn/ui Mapping Plan

This maps your redesign components to implementation primitives in `/frontend/src/components/ui`.

## Global App Shell
- Figma: `TopNav`, `MobileBottomNav`, `ContextRail`
- shadcn:
  - `NavigationMenu` (can add)
  - existing `Button`, `Avatar`, `Tooltip`
  - custom wrappers in `src/components/layout/*`

## Buttons
- Figma variants:
  - `Primary`
  - `Secondary`
  - `Ghost`
  - `Destructive`
  - `Icon`
- shadcn: `Button` variants in `src/components/ui/button.tsx`
- Add variants:
  - `brand` (high emphasis)
  - `soft` (for cards/filters)

## Inputs and Form Controls
- Figma: `TextField`, `PasswordField`, `SearchField`, `SegmentedRange`
- shadcn:
  - existing `Input`
  - existing `Tabs` for segmented range
  - optional `Form`, `FormField`, `FormMessage` (add from shadcn)

## Cards
- Figma: `StatCard`, `ChartCard`, `ForecastCard`, `IdentityCard`
- shadcn: existing `Card`, `CardHeader`, `CardContent`, `CardFooter`
- Add card density variants:
  - `cozy`
  - `compact`

## Data Display
- Figma: `TransactionTable`, `SignalBadge`, `MetricPill`
- shadcn:
  - existing `Table`
  - existing `Badge`
  - optional `ScrollArea` for large table containers

## Overlay + Feedback
- Figma: `Toast`, `ModalConfirm`, `Skeleton`
- shadcn:
  - existing `sonner` toaster
  - existing `Dialog`
  - existing `Skeleton`

## Charts
- Figma tokens define color and stroke weights.
- Implementation still uses Recharts wrappers (`ChartContainer`, `ForecastChartContainer`).
- Add shared chart theme utility:
  - `/src/lib/chartTheme.ts`

## Token-to-Component Rules
- Borders use semantic tokens only (`border`, `input`).
- Surface styles use semantic tokens only (`card`, `muted`, `background`).
- Do not hardcode hex values in JSX.
- Use motion only via class utilities, not inline transition styles.

## Recommended New Folders
- `src/components/layout` (app shell pieces)
- `src/components/dashboard` (cards/charts/table wrappers)
- `src/components/auth` (shared auth panel parts)
- `src/lib/design-tokens.ts` (runtime token constants if needed)
