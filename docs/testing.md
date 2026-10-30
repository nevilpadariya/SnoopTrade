# Running the test suites

Use Node.js 24 or newer and the pnpm version pinned in the root package.json.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build:frontend
```

The frontend suite checks token renewal/rejection and renders the transaction
chart using the real React and Recharts components in jsdom. HTTP responses in
these frontend tests are simulated; they do not contact a deployed backend.

Install backend development dependencies in a virtual environment, then run:

```sh
PYTHONPATH=backend python -m pytest -q backend/tests
```

For full integration coverage, start a disposable MongoDB 8.0 server and set
`MONGODB_TEST_URI` to its connection string. Never use a production cluster.
Tests create and remove databases named `snooptrade_test_<random suffix>`.

```sh
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 PYTHONPATH=backend python -m pytest -q backend/tests
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 PYTHONPATH=backend python -m pytest -q backend/integration_tests
```

Run these two commands as separate pytest processes: some unit tests substitute
database modules with fakes, while API integration tests require real MongoDB.
The API tests cover readiness, authentication, signup, token renewal/revocation,
stock and SEC reads, combined prefetch and EWM forecasts. They seed their own
market data and do not call Yahoo, SEC, Google OAuth or email delivery services.

CI provisions MongoDB automatically and runs both backend suites separately.
Mobile validation also includes `pnpm --filter snooptrade-mobile exec expo install --check`
and Expo exports for iOS and Android; exports do not replace device testing.
