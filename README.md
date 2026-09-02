# SpotAI (working codename)

SpotAI is the current repository/app codename. **Form** is the internal product object: the evolving identity created from moments the user explicitly chooses to count. The consumer brand can be renamed later without changing the domain model.

> You don't choose your character. Your life creates it.

## Core loop

`WANT -> LIVE -> AWAKEN -> SHARE -> CREW -> EVOLVE -> NEXT SEASON`

AI may classify and render, but it never directly writes canonical identity state. Trait progression and Form resolution remain deterministic and explainable.

## Tech stack

- **Mobile:** Expo + React Native + Expo Router + TypeScript
- **API:** Fastify + TypeScript + Zod
- **Primary database:** MySQL 8.4 / InnoDB / utf8mb4
- **Database driver:** mysql2/promise
- **Object storage:** S3-compatible storage; MinIO locally
- **Async jobs:** Redis + BullMQ
- **AI boundary:** provider-neutral `@form/ai-gateway`
- **Identity/progression:** deterministic `@form/domain`
- **Monorepo:** pnpm workspaces
- **Local infrastructure:** Docker Compose
- **CI:** GitHub Actions

## Implemented product flow

The mobile client now supports:

1. 18+ account creation and opaque bearer session storage.
2. Life Mode onboarding.
3. Unknown Form / awakening progression.
4. User-chosen Life Signals.
5. Explainable Form state with reasons.
6. Core tabs: **You / Camera / Crew / Season**.
7. Explicit photo selection and S3-compatible signed upload.
8. Reveal-job creation and BullMQ processing lifecycle.
9. Crew creation.
10. Crew invite token creation and invite joining.
11. Season recap from persisted evidence.

The backend also persists domain events, analytics events, notification outbox records and entitlement state foundations.

## Monorepo

- `apps/mobile` — Expo / React Native client.
- `apps/api` — Fastify HTTP API.
- `apps/worker` — BullMQ async jobs.
- `packages/domain` — schemas and deterministic Form engine.
- `packages/db` — MySQL repositories and migrations.
- `packages/media` — S3-compatible signed upload/download boundary.
- `packages/ai-gateway` — provider-neutral AI boundary.
- `packages/events` — domain event contracts.

## Run locally

Requirements: Node 22+, pnpm 10+, Docker.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm --filter @form/api dev
```

Run the worker in another terminal:

```bash
pnpm --filter @form/worker dev
```

Run mobile:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm --filter @form/mobile dev
```

For a physical phone, use the computer's LAN IP instead of `localhost`.

Local services:

- MySQL: `localhost:3306`
- Redis: `localhost:6379`
- MinIO S3 API: `localhost:9000`
- MinIO console: `localhost:9001`

## Important API surface

- `POST /v1/auth/guest`
- `GET /v1/me`
- `POST /v1/auth/logout`
- `POST /v1/seasons`
- `POST /v1/life-modes`
- `POST /v1/life-signals`
- `DELETE /v1/life-signals/:id?seasonId=...`
- `GET /v1/form?seasonId=...`
- `GET /v1/crews`
- `POST /v1/crews`
- `GET /v1/crews/:id/members`
- `POST /v1/crews/:id/invites`
- `POST /v1/crews/join`
- `POST /v1/media/upload-intents`
- `POST /v1/media/:id/complete`
- `GET /v1/media/:id/view`
- `POST /v1/reveals`
- `GET /v1/reveals/:id`
- `GET /v1/seasons/:id/recap`

`/v1/dev/users` remains development-only for compatibility and is disabled in production.

## Privacy and identity invariants

- The user chooses which moments count.
- Optional media is explicitly selected; no background photo scanning.
- Multi-person media carries an explicit consent scope.
- AI classification cannot directly mutate Form state.
- Form changes remain reproducible from persisted evidence.
- Removing evidence can trigger deterministic recomputation.
- Redis is never the canonical source of truth.
- Worlds, Food, Health, public feed and DMs remain outside Phase 1.

## Still not production-complete

The current repository is a working Phase 1 application foundation, not a shipped consumer product. The following still require production implementations before public launch:

- Apple/Google identity or another account recovery path
- production image/video reveal renderer
- push-notification delivery provider
- app-store billing and receipt verification
- account recovery/deletion UX
- abuse/rate-limit/moderation controls
- production observability and deployment
- real multi-participant media-consent confirmation
- automated end-to-end tests

Do not treat the AI stub as a production renderer. A reveal job intentionally remains `processing` until a renderer adapter creates a persisted output asset.

See `APP_ARCHITECTURE.md`, `SKILL.md`, and `docs/PHASE_1_MVP.md` before expanding scope.
