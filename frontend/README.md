# SnoopTrade Frontend

React + TypeScript frontend built with Vite.

## Stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- React Router

## Prerequisites

- Node.js 20+
- pnpm 9+

## Environment

Create `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_LOGO_DEV_TOKEN=your_logo_dev_publishable_key
```

## Development

From repo root:

```bash
pnpm install
pnpm --filter snooptrade dev
```

## Typecheck and Build

```bash
pnpm --filter snooptrade typecheck
pnpm --filter snooptrade build
pnpm --filter snooptrade preview
```

`vite build` outputs production files to `frontend/dist`.
