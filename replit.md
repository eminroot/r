# BETADROP

Multilingual beta-testing marketplace connecting software founders and technical testers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev`: run the API server (port 5000)
- `pnpm run typecheck`: full typecheck across all packages
- `pnpm run build`: typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen`: regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push`: push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed-demo`: add demo campaigns to an empty catalog
- `pnpm --filter @workspace/api-server test`: lifecycle test against a throwaway DATABASE_URL
- Required env: `DATABASE_URL` (Postgres), Clerk keys; see README.md for the full list

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/betadrop`: React frontend at `/`.
- `artifacts/api-server`: Express backend at `/api`; domain routes in `src/routes`, transactional transitions in `src/lib/betadrop.ts`.
- `lib/api-spec/openapi.yaml`: API contract; regenerate clients after changes.
- `lib/db/src/schema`: PostgreSQL schema.

## Architecture decisions

- Not built yet: billing, crypto payouts, administrator moderation/arbitration, Pro Tester subscriptions, Slack, uploads. The UI marks them as coming later.
- Webhook verification: founders create API keys (stored as sha256) and call `POST /api/v1/verifications`; a webhook campaign needs that confirmation before the tester can report.
- Outgoing webhooks go only to public HTTPS hosts (checked on save and on every delivery) and are signed with HMAC-SHA256.
- Reports accept external media links rather than uploaded bytes. Add App Storage before implementing uploads.
- Role switching changes the workspace, not authority. The API checks campaign ownership and tester identity independently.
- Demo campaigns are clearly marked and cannot receive applications. Public metrics exclude demo campaigns.
- Day streaks use UTC calendar days. Do not silently change this convention before introducing a user timezone setting. Freezes are derived from activity (one per 7 days in a row, max 2), not stored.
- UI copy: no em dashes, no `--`, short plain sentences. The i18n test enforces the punctuation.

## Product

Landing, catalog, pricing, docs; Clerk accounts; campaigns with screening, Trust Score filters and auto-approval; four verification methods; founder inbox with CSV/Jira export and GitHub issue links; integrations (API keys, signed webhooks); 48h execution and 72h review deadlines; reward vault; public tester profiles with heatmap, streak freezes and badges.

## User preferences

- Follow the provided BETADROP specification: dense utility UI, square corners, no shadows or gradients, 1px borders.
- Light palette: background #F6F8FA, surface #FFFFFF, border #D0D7DE, text #1F2328, secondary #656D76, accent #548EAA.
- Dark palette: background #0D1117, surface #161B22, border #30363D, text #E6EDF3, secondary #8B949E, accent #58A6FF.
- Sans-serif body text and monospaced metadata. Preserve the Tester/Founder role switcher.
- English is the default interface language; also support Russian and Azerbaijani (Latin script). Preserve the user's selected language across visits.

## Gotchas

- Never expose campaign reward-code pools or verification hashes in public responses.
- Authenticated screens require real Clerk sessions; do not add demo authentication or bypasses.
- Codegen uses `Headers.entries()`; the shared API client requires `dom.iterable` in its TypeScript libs.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
