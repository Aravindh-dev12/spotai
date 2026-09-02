# SpotAI (working codename)

SpotAI is the current repository/app codename. **Form** is the internal product object: the evolving identity created from moments the user explicitly chooses to count. The consumer brand can be renamed later without changing the domain model.

> You don't choose your character. Your life creates it.

## Phase 1 loop

`direction -> Life Mode -> chosen Life Signal -> classification -> deterministic trait recomputation -> Form awakening -> Crew`

The AI layer classifies or renders. It never writes the user's final identity state directly.

## Monorepo

- `apps/mobile` — Expo / React Native alpha client.
- `apps/api` — Fastify HTTP API.
- `apps/worker` — BullMQ async jobs.
- `packages/domain` — product schemas + deterministic Form engine.
- `packages/db` — PostgreSQL schema and repositories.
- `packages/ai-gateway` — provider-neutral AI boundary.
- `packages/events` — cross-service event contracts.
- `docs` — product/API implementation docs.

## Run locally

Requirements: Node 22+, pnpm 10+, Docker.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm --filter @form/api dev
```

In another terminal:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm --filter @form/mobile dev
```

For a physical phone, use your computer's LAN IP instead of `localhost` for `EXPO_PUBLIC_API_URL`.

The alpha mobile client bootstraps a development-only adult test account, starts a 30-day Season, creates a Life Mode from onboarding choices, accepts Life Signals, and shows deterministic awakening progress. `/v1/dev/users` is disabled when `NODE_ENV=production`.

## Implemented API surface

- `GET /health`
- `POST /v1/dev/users` — alpha only
- `POST /v1/seasons`
- `POST /v1/life-modes`
- `POST /v1/life-signals`
- `DELETE /v1/life-signals/:id?seasonId=...`
- `GET /v1/form?seasonId=...`
- `POST /v1/crews`
- `POST /v1/life-signals/preview`

Authenticated alpha endpoints currently use `x-user-id`. Replace this with real authentication before external testing.

## Not yet production-ready

Real authentication, Crew invites/join, consented media upload, object storage, paid plans, notifications, production AI provider, reveal rendering, analytics, abuse controls and deployment infrastructure still need implementation. Public feed, DMs, Food, Health, AR multiplayer, creator economy and licensed Worlds remain intentionally outside Phase 1.

See `APP_ARCHITECTURE.md`, `SKILL.md`, and `docs/PHASE_1_MVP.md` before extending scope.
