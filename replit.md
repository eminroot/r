# BETADROP

Russian-language beta-testing marketplace connecting software founders and technical testers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/betadrop` — React frontend at `/`.
- `artifacts/api-server` — Express backend at `/api`; domain routes in `src/routes`, transactional transitions in `src/lib/betadrop.ts`.
- `lib/api-spec/openapi.yaml` — API contract; regenerate clients after changes.
- `lib/db/src/schema` — PostgreSQL schema.

## Architecture decisions

- The first release is a core MVP, not the entire production specification. Billing, external integrations, crypto payouts, administrator moderation/arbitration, Pro Tester subscriptions and uploads are not connected.
- Reports accept external media links rather than uploaded bytes. Add App Storage before implementing uploads.
- Role switching changes the workspace, not authority. The API checks campaign ownership and tester identity independently.
- Demo campaigns are clearly marked and cannot receive applications. Public metrics exclude demo campaigns.
- Day streaks use UTC calendar days. Do not silently change this convention before introducing a user timezone setting.

## Product

Public landing/catalog/pricing, Clerk accounts, campaign creation and management, screening/application review, text/media-link/email/secret-code reports, founder review, automatic overdue review approval, unique code vault, Trust Score/XP/activity profile.

## User preferences

- Follow the provided BETADROP specification: dense utility UI, square corners, no shadows or gradients, 1px borders.
- Light palette: background #F6F8FA, surface #FFFFFF, border #D0D7DE, text #1F2328, secondary #656D76, accent #548EAA.
- Dark palette: background #0D1117, surface #161B22, border #30363D, text #E6EDF3, secondary #8B949E, accent #58A6FF.
- Sans-serif body text and monospaced metadata. Preserve the Tester/Founder role switcher.

## Gotchas

- Never expose campaign reward-code pools or verification hashes in public responses.
- Authenticated screens require real Clerk sessions; do not add demo authentication or bypasses.
- Codegen uses `Headers.entries()`; the shared API client requires `dom.iterable` in its TypeScript libs.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
