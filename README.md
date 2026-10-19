# BETADROP

A beta-testing marketplace for software. Founders publish test campaigns, technical testers apply, run the scenario and send reports, and every accepted report pays out a reward code (a license, a subscription, API credits). The interface is in English, Russian and Azerbaijani.

## How a test runs

1. **Apply.** The tester answers 1 to 3 screening questions. The founder approves by hand, or turns on auto-approval for testers above a Trust Score threshold.
2. **Run.** An approved tester gets a personal product link (`?betadrop_id=...`) and 48 hours to report.
3. **Report.** The tester proves the run with one of four methods: a secret code hidden in the product, the account email, a screen recording link, or a call from the founder's backend to `POST /api/v1/verifications`.
4. **Review.** The founder has 72 hours. After that the report is accepted automatically. Accepting a report hands the tester one code from the campaign's pool.

Testers build a public profile with a Trust Score (starts at 50, +2 or +5 per accepted report, -10 for a declined report or a missed deadline), a daily streak with freezes, a 52-week activity heatmap and badges. Rewards worth more than $50 are only open to Trust Score 80+.

Billing, crypto payouts, admin arbitration and Slack notifications are not built yet. The UI says so where they would appear.

## Repository layout

| Path | What it is |
| --- | --- |
| `artifacts/betadrop` | React + Vite web app (Clerk auth, Tailwind, wouter). Copy lives in `src/lib/locales`. |
| `artifacts/api-server` | Express 5 API. Routes in `src/routes`, slot and reward transitions in `src/lib/betadrop.ts`, outgoing webhooks in `src/lib/webhooks.ts`. |
| `lib/db` | Drizzle schema for Postgres. |
| `lib/api-spec` | `openapi.yaml`, the API contract. Orval generates `lib/api-client-react` (React Query hooks) and `lib/api-zod` (validators) from it. |
| `scripts` | `seed-demo` fills an empty catalog with clearly marked demo campaigns. |
| `artifacts/mockup-sandbox` | Replit design scaffold, not part of the product. |

## Running it

Requirements: Node 22+, pnpm 10, Postgres 14+, a Clerk application.

```sh
pnpm install

# database
export DATABASE_URL=postgres://user:pass@localhost:5432/betadrop
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed-demo   # optional

# API on :8080
CLERK_SECRET_KEY=sk_... CLERK_PUBLISHABLE_KEY=pk_... PORT=8080 \
  pnpm --filter @workspace/api-server run dev

# web app on :5173, proxying /api to the API
VITE_CLERK_PUBLISHABLE_KEY=pk_... PORT=5173 BASE_PATH=/ API_URL=http://localhost:8080 \
  pnpm --filter @workspace/betadrop run dev
```

Environment variables:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | API, db, scripts | Postgres connection string |
| `PORT` | API, web | Port to listen on |
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` | API | Verify sessions; proxy Clerk in production |
| `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL` | web | Clerk in the browser (proxy URL optional) |
| `BASE_PATH` | web | Path the app is served under, usually `/` |
| `API_URL` | web (dev only) | Where Vite proxies `/api` locally. On Replit the router does this. |
| `LOG_LEVEL` | API | pino log level |

There is no demo login. Every signed-in screen needs a real Clerk session.

## Checks

```sh
pnpm run typecheck
PORT=5173 BASE_PATH=/ pnpm run build   # Vite configs require both
node artifacts/betadrop/tests/i18n.test.cjs        # translations complete, no em dashes in copy
DATABASE_URL=... pnpm --filter @workspace/api-server test   # full lifecycle against a throwaway database
```

The API test creates its own users and campaigns, so point it at a database you can throw away.

## Changing the API

Edit `lib/api-spec/openapi.yaml`, then run `pnpm --filter @workspace/api-spec run codegen`. Never edit the generated folders by hand.

## Translations

UI strings are written in Russian in the code and looked up in `src/lib/locales/*.ts`, which hold the English and Azerbaijani text. English is the default for new visitors. The i18n test fails if any Russian string in the app, the API error messages or the demo seed has no translation.

## Webhook verification API

```sh
curl -X POST https://your-host/api/v1/verifications \
  -H "Authorization: Bearer bd_live_..." \
  -H "Content-Type: application/json" \
  -d '{"campaignId": 12, "betadropId": "user_2abc..."}'
```

Keys are created under Founder → Integrations and stored hashed. Outgoing webhooks are signed with HMAC-SHA256 over `"<timestamp>.<body>"`; see `/docs#webhooks` in the app for a verification snippet.
