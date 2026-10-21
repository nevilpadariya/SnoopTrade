# Deploy SnoopTrade on Render Free and MongoDB Atlas Free

This configuration is for a hobby/demo deployment. Render sleeps after inactivity;
the first request can take about a minute. Free-tier limits can change:
https://render.com/docs/free and https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/

## 1. Keep or create the database

In Atlas, check the existing cluster's tier and storage usage. If it is already
Free (formerly M0) and fits the 0.5 GB limit including indexes, reuse it. Moving the
API away from DigitalOcean does not require moving an Atlas database.

Otherwise create an Atlas Free cluster, preferably near Render's Oregon region.
Create a database user with read/write access to the application's three databases:
`users`, `stock_data`, and `sec_data`. Use the Drivers connection string as
`MONGODB_URI`; URL-encode special characters in the password. Do not commit it.
If moving from another cluster, back up and restore all three databases with MongoDB
Database Tools, then check collection counts before switching. Do not delete the source.

Add the Render service's outbound IP ranges (shown in its dashboard) to Atlas
Network Access. GitHub-hosted data-update runners also need network access. Their
addresses vary: use a runner with stable egress for a narrow allowlist. Allowing
`0.0.0.0/0` is a broader fallback, exposes the database endpoint to the internet,
and requires strong credentials with limited database permissions.

## 2. Push the deployment changes

Review `git diff`, commit the changes and push to `main` from your local terminal.
The assistant session may not have permission to write Git metadata.

## 3. Create the Render service

In https://dashboard.render.com choose **New > Blueprint**, connect
`nevilpadariya/SnoopTrade`, and select `main`. Render reads the root `render.yaml`.
Confirm the web service uses the **Free** plan before deploying.

Provide the prompted environment values:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Atlas Drivers connection string |
| `FRONTEND_URL` | Actual frontend origin, such as `https://your-site.example`, without trailing slash |
| `GOOGLE_CLIENT_ID` | Existing Google OAuth web client ID |

The Blueprint generates `JWT_SECRET_KEY` and `ADMIN_API_KEY`. A new JWT key signs
users out; to preserve existing tokens, set the existing secret in Render before
cutover. Set `GOOGLE_CLIENT_IDS` too if mobile uses additional OAuth clients.
No secrets need to be sent in chat.

The Docker image uses Python 3.11 and one Uvicorn process, with `$PORT` supplied by
Render. The readiness endpoint checks MongoDB. If deployment fails there, check
the URI, database user and Atlas network allowlist.

## 4. Update web and mobile clients

Copy the actual HTTPS service URL from Render; do not assume the service name is
the final hostname. In your frontend host set `VITE_API_BASE_URL` to this URL and
rebuild. Replace the old DigitalOcean value in `frontend/.env.production` too.
That existing file remains unchanged until a working replacement URL is known.
For mobile set `EXPO_PUBLIC_API_BASE_URL` to the same URL and rebuild/restart Expo.
Update Google's authorized frontend origins if the frontend hostname changes.

## 5. Keep stock and SEC updates running

In GitHub **Settings > Secrets and variables > Actions**, set `MONGODB_URI` to the
same Atlas URI. Run **Update Stock & SEC Data** manually for AAPL and verify fresh
data. Its schedule remains in UTC and does not follow daylight-saving changes.
Overlapping workflow runs are now serialized and update-step exceptions fail jobs.
GitHub schedules can be delayed; check Actions usage limits and enable scheduled
workflows if GitHub has disabled them for inactivity.

`ENABLE_SCHEDULER=false` avoids duplicate collection jobs and background work on a
sleeping server. The existing GitHub workflow collects stock/SEC data only:
automatic alert scans, hourly digest checks and dead-letter retries require a
separate external worker/cron. Manual application operations remain available.
Do not assume scheduled notifications are active on this deployment.

## 6. Verify before retiring DigitalOcean

- Open `/health` and `/health/ready` on the new API: both should return HTTP 200.
- Check email login, Google login, stocks, SEC transactions and forecasts from the frontend.
- Check Render logs and memory usage while making forecast requests.
- Verify that GitHub's update workflow succeeds and new records appear in Atlas.
- Test after the API has slept, including frontend timeout/retry behavior.
- Only after these checks, remove the old DigitalOcean service in its dashboard.
  Removing `.do/app.yaml` locally does not stop the hosted service or billing.

## Forecasts and optional dependencies

The free deployment explicitly selects `FORECAST_ENGINE=ewm`, the existing
exponential-weighted moving average fallback. Its output format is unchanged,
but results differ from Prophet and it does not train a Prophet insider regressor.
This is a lighter model, not a guarantee that every workload fits 512 MB.

`requirements.txt` contains runtime dependencies. `requirements-dev.txt` adds
pytest/httpx. `requirements-optional.txt` adds Prophet and Kafka for deployments
that need them. To restore Prophet, install the optional requirements and set
`FORECAST_ENGINE=auto`; provision and test adequate memory first. The in-memory
event queue is not durable across sleeps/restarts.

Run local tests with Python 3.11:

```sh
python3.11 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt
PYTHONPATH=backend backend/.venv/bin/python -m pytest -q backend/tests
```
