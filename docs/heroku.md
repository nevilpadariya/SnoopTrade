# Deploy SnoopTrade's API to Heroku

## Budget and student credits

The student offer provides $13/month for 24 months after approval. A single
Basic web dyno is $7/month and stays on. Keep MongoDB on Atlas Free and the
React frontend on its static host. This template creates no add-ons or workers.
Two Basic dynos would cost $14/month, exceeding the student allowance.

Wait until credits appear in your personal account's Billing page before
deploying. A payment card is required. Charges above the allowance are billed
to that card; unused monthly credit expires and is not a spending cap.

Current official terms and pricing:
- https://www.heroku.com/github-students/
- https://www.heroku.com/pricing/

## First deployment

After credits are confirmed, open:

https://heroku.com/deploy?template=https://github.com/nevilpadariya/SnoopTrade

Choose a globally unique app name, your personal account and a region near
Atlas. Review that the template specifies exactly one Basic web dyno, then
provide the prompted environment values and deploy.

Required inputs:
- `MONGODB_URI`: the current Atlas Drivers URI, with the database user's
  password URL-encoded. The app uses `users`, `stock_data` and `sec_data`.
- `FRONTEND_URL`: the actual frontend origin without a trailing slash.
- `GOOGLE_CLIENT_ID`: the existing web OAuth client ID if Google login is used.
  Set `GOOGLE_CLIENT_IDS` as well if mobile has additional client IDs.

The template generates JWT and admin keys. To preserve existing sessions,
replace `JWT_SECRET_KEY` with the existing value in Heroku Config Vars before
switching clients. Keep secrets in provider settings and out of Git/chat.

Atlas must permit connections from Heroku. Common Runtime outbound IPs vary;
an existing narrow IP allowlist may reject the new backend. Configure network
access deliberately in Atlas; broad internet access expands database exposure
and requires strong credentials with limited database permissions. Do not
delete the old database or application while checking the replacement.

## How the repository builds

The template explicitly selects the Python buildpack on the `heroku-24` stack.
The root `requirements.txt` includes `backend/requirements.txt`; Python 3.12 is
selected in `.python-version`. `Procfile` starts one Uvicorn worker in `backend`
and binds to Heroku's assigned `$PORT`. The frontend is built separately.

If creating an app manually instead of using the template, select the
**heroku/python** buildpack in Settings before connecting this monorepo.
`app.json` defaults are applied when creating from the template; connecting
GitHub to an existing app does not automatically apply those config values.

## Verify and connect clients

1. Check Resources: one Basic `web` dyno, no worker and no add-ons.
2. Copy the actual HTTPS URL from Heroku. Both `/health` and `/health/ready`
   must return HTTP 200; readiness also checks MongoDB.
3. Set `VITE_API_BASE_URL` in the frontend host to that API URL and rebuild.
   The tracked `frontend/.env.production` still points to the old host until
   a working replacement URL is known.
4. Set `EXPO_PUBLIC_API_BASE_URL` for mobile and rebuild the development client
   or app. Test email login, Google login, stock data, transactions and forecasts.
5. If the frontend hostname changes, update Google's authorized frontend
   origins too. The backend URL alone is not the frontend OAuth origin.
6. Connect GitHub in the app's Deploy tab for future updates from `main`.
   Prefer manual deployments initially; only enable automatic deploys after
   the first deployment passes its health and login checks.
7. Retire the old backend only after verification, to avoid paying both hosts.

## Data updates, alerts and limits

GitHub Actions continues stock and SEC ingestion using its `MONGODB_URI` secret.
`ENABLE_SCHEDULER=false` prevents duplicate ingestion and heavy collection jobs
inside the 512 MB web dyno. Automatic alerts, digests and dead-letter retries
still need external scheduling; do not assume deployment enables them.

For external scheduling, the existing authenticated POST routes are
`/admin/trigger/alerts`, `/admin/trigger/digest` and
`/admin/trigger/event-bus-dlq-retry`. Store `ADMIN_API_KEY` as a scheduler secret
and send it in `X-API-Key`. Responses acknowledge background work; verify logs
and resulting records for completion. Configure SMTP separately for email.

Keep `FORECAST_ENGINE=ewm` on the Basic dyno. Monitor memory and logs under real
traffic before adding Prophet or increasing concurrency. The in-memory event
queue is lost on restarts; this deployment is not durable job infrastructure.
