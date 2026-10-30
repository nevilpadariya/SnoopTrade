# Project cleanup audit — October 29, 2026

## Scope and evidence

Reviewed tracked files, file sizes, application entry points and imports across
the web frontend, Expo app and Python backend. Knip identified unused TypeScript
files/dependencies/exports; reference searches confirmed candidates before
removal. Ruff identified unused Python imports. Production builds, real MongoDB
integration tests and native JavaScript exports checked the resulting project.

## Removed

- 22 unused frontend dependency declarations: Material UI/Emotion, six unused
  Radix component packages, date-fns, three Embla packages, js-cookie,
  react-chartjs-2, web-vitals, autoprefixer and the unused shared workspace.
- The unused `@snooptrade/shared` dependency from mobile, and its six-file
  workspace. Neither client imported its API client, constants or types.
- Six unreferenced UI files: avatar, dialog, label, separator, tabs and tooltip.
- Unused dropdown menu variants, card/table helpers, a random-company helper,
  a theme-reset helper and unused exports. Internally used select scrolling
  helpers remain in place.
- Seven unreferenced image/logo assets under `frontend/src`; the active public
  favicons and web app manifest icons remain referenced and were preserved.
- The tracked `backend/scripts/form4_scraper.log` generated log.
- Four unused Python imports. Backend package re-exports were retained.

The 20 deleted files total 1,997,238 bytes. Changes also simplify manifests,
workspace configuration and the lockfile. New ignore rules cover tool caches,
Expo output and TypeScript build metadata. Runtime Docker/Heroku packaging
excludes test caches and project documents. README setup/stack descriptions
were brought in line with the actual application.

## Observed size changes

| Item | Before | After |
| --- | ---: | ---: |
| Local `node_modules` allocated size | 1,655,920 KiB | 623,464 KiB |
| Dashboard JS chunk, uncompressed | 221.48 kB | 213.39 kB |
| Dashboard JS chunk, gzip | 62.16 kB | 60.65 kB |
| Main CSS, uncompressed | 91.60 kB | 87.15 kB |
| Main CSS, gzip | 17.89 kB | 17.32 kB |

`pnpm prune -r --yes` removed old installed package versions as well as newly
unused packages. Thus the roughly 1 GiB local saving includes upgrade residue;
it is not all attributable to application dependency removal. Files already
in Git history remain there; no repository history was rewritten.

Most removed dependencies were already absent from the browser bundle. The
largest benefit is local installation/storage and a smaller dependency graph.
The bundle improvements above are measured, but no claim of a particular page
load time or API latency improvement is made without browser/load profiling.

## Validation

- Four frontend tests passed, including the real transaction chart components.
- Frontend and mobile TypeScript checks passed.
- Frontend production build passed.
- Fifteen backend tests passed, including legacy/null-key uniqueness against
  a real disposable MongoDB 8.0 server.
- Two API integration tests passed against MongoDB: health/readiness, signup,
  login, refresh/logout, stock/SEC reads, prefetch and forecasting.
- iOS and Android Expo exports succeeded.
- Frozen-lockfile install, peer checks and Expo compatibility checks passed.
- A second Knip scan reports no unused files, dependencies or exports. Its
  remaining `expo-updates`/`expo-system-ui` entries are plugin configuration
  suggestions, not evidence of unused code or broken JavaScript imports.

The Python API tests emit an existing Starlette/httpx deprecation warning.
Google OAuth, email delivery, production Atlas and physical mobile devices were
not exercised. Tests use disposable data and do not alter production records.

## Remaining runtime considerations

Cleanup does not resolve hosting cold starts, external API rate limits or
database latency. The dashboard still starts multiple signal requests when
changing ticker/period, including a backtest, and polls alerts periodically.
Those features are used; optimize their request timing and profile database
queries rather than deleting them as unused code. In-memory queue durability
and alert/digest scheduling also remain deployment considerations.

Project documents, design references, active routes, operational scripts,
deployment configurations and development environments were preserved.
