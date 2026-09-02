# SpotAI (working codename)

SpotAI is the current repository/app codename. **Form** is the internal product object: the evolving identity created from moments the user explicitly chooses to count. The consumer brand can be renamed later without changing the domain model.

> You don't choose your character. Your life creates it.

## Core loop

`WANT -> LIVE -> AWAKEN -> SHARE -> CREW -> EVOLVE -> NEXT SEASON`

AI may classify and render, but it never directly writes canonical identity state. Trait progression and Form resolution remain deterministic, versioned and explainable.

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

## Implemented Phase 1 product flow

1. 18+ account creation and opaque bearer sessions.
2. One recoverable active Season per user.
3. One editable Life Mode per Season.
4. Unknown Form / awakening progression.
5. User-chosen Life Signals with explicit evidence level.
6. Deterministic progression using versioned `traits-v1` rules.
7. Evidence-strength multipliers without changing semantic classification.
8. Explainable `form_history` snapshots containing previous, delta and resulting traits.
9. Evidence deletion followed by deterministic recomputation.
10. Core mobile tabs: **You / Camera / Crew / Season**.
11. S3-compatible signed upload for explicitly selected media.
12. Participant consent records for multi-person media.
13. Reveal jobs only after Form awakening and required media consent.
14. Crews with invite/join flows and a hard maximum of five members.
15. Season recap from persisted evidence.
16. Append-only domain events and product analytics events.
17. Automated deterministic progression tests in CI.

## Monorepo

- `apps/mobile` — Expo / React Native client.
- `apps/api` — Fastify HTTP API.
- `apps/worker` — BullMQ async jobs.
- `packages/domain` — schemas and deterministic Form engine.
- `packages/db` — MySQL schema and repositories.
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
- `GET /v1/seasons/active`
- `POST /v1/seasons`
- `POST /v1/life-modes`
- `GET /v1/life-signals?seasonId=...`
- `POST /v1/life-signals`
- `DELETE /v1/life-signals/:id?seasonId=...`
- `GET /v1/form?seasonId=...`
- `GET /v1/form/history?seasonId=...`
- `GET /v1/crews`
- `POST /v1/crews`
- `GET /v1/crews/:id/members`
- `POST /v1/crews/:id/invites`
- `POST /v1/crews/join`
- `POST /v1/media/upload-intents`
- `POST /v1/media/:id/complete`
- `POST /v1/media/:id/consent`
- `GET /v1/media/:id/view`
- `POST /v1/reveals`
- `GET /v1/reveals/:id`
- `GET /v1/seasons/:id/recap`

`/v1/dev/users` remains development-only for compatibility and is disabled in production.

## Privacy and identity invariants

- The user chooses which moments count.
- Optional media is explicitly selected; no background photo scanning.
- Multi-person media creates explicit participant consent records.
- AI classification cannot directly mutate Form state.
- Form changes are reproducible from persisted evidence and a rules version.
- Users can see trait deltas explaining why their Form changed.
- Removing evidence triggers deterministic recomputation.
- Crew membership is canonical in MySQL and capped at five members.
- Redis is never the canonical source of truth.
- Worlds, Food, Health, public feed and DMs remain outside Phase 1.

## Still not production-complete

This is a strong Phase 1 application foundation, not a shipped consumer product. Before public launch it still needs:

- Apple/Google identity or another durable account-recovery path
- production image/video reveal renderer
- polished participant-consent inbox/UX in mobile
- push-notification delivery provider
- app-store billing and server-side receipt verification
- account recovery/deletion UX
- abuse/rate-limit/moderation controls
- production observability and deployment
- integration/e2e tests against real MySQL, Redis and object storage

Do not treat the AI stub as a production renderer. A reveal job intentionally remains `processing` until a renderer adapter creates a persisted output asset.

See `APP_ARCHITECTURE.md`, `SKILL.md`, and `docs/PHASE_1_MVP.md` before expanding scope.
