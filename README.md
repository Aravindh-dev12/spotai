# SpotAI (working codename)

SpotAI is the current repository/app codename. **Form** is the internal product object: the evolving identity created from moments the user explicitly chooses to count. The consumer brand can be renamed later without changing the domain model.

> You don't choose your character. Your life creates it.

## Production direction

This repository is being developed as a production-grade consumer application, not a throwaway prototype. Product experiments can be narrow, but infrastructure and domain boundaries should be implemented so successful experiments can be promoted rather than rewritten.

The current production priorities are:

1. validated runtime configuration and secure startup,
2. durable auth and authorization boundaries,
3. bounded real AI adapters with deterministic identity rules,
4. rate limiting, secure headers, readiness/liveness checks and graceful shutdown,
5. reliable media, job and event infrastructure,
6. one excellent VECTOR I manifestation and camera interaction,
7. deterministic SIGNAL_ZERO completion into durable history/Memory,
8. Crew and Season retention,
9. billing/entitlements only after the free identity loop is working.

Core product invariants still apply: shipping faster never means allowing AI, Blender or a World runtime to silently become identity authority.

## Core loop

`WANT -> LIVE -> AWAKEN -> SHARE -> CREW -> EVOLVE -> NEXT SEASON`

AI may classify and render, but it never directly writes canonical identity state. Trait progression and Form resolution remain deterministic, versioned and explainable.

## Tech stack

- **Mobile:** Expo + React Native + Expo Router + TypeScript
- **API:** Fastify + TypeScript + Zod
- **Runtime config:** validated `@form/config`
- **Primary database:** MySQL 8.4 / InnoDB / utf8mb4
- **Database driver:** mysql2/promise
- **Object storage:** S3-compatible storage; MinIO locally
- **Async jobs:** Redis + BullMQ
- **API guardrails:** CORS allowlist, Helmet security headers, Redis-backed rate limiting, liveness/readiness probes, secret-redacted logs and graceful shutdown
- **AI boundary:** provider-neutral `@form/ai-gateway`; development stub plus production OpenAI-compatible adapter
- **Identity/progression:** deterministic `@form/domain`
- **Realtime World logic:** deterministic `@form/world-runtime`
- **3D authoring:** Blender offline pipeline -> reviewed GLB/manifest assets
- **Monorepo:** pnpm workspaces
- **Local infrastructure:** Docker Compose
- **CI:** GitHub Actions

## Implemented product foundation

1. 18+ account creation and opaque bearer sessions.
2. One recoverable active Season per user.
3. One editable Life Mode per Season.
4. Unknown Form / awakening progression.
5. User-chosen Life Signals with explicit evidence level.
6. Deterministic progression using versioned rules.
7. Evidence-strength multipliers without changing semantic classification.
8. Explainable `form_history` snapshots containing previous, delta and resulting traits.
9. Evidence deletion followed by deterministic recomputation.
10. Core mobile areas for You / Camera / Crew / Season.
11. S3-compatible signed upload for explicitly selected media.
12. Participant consent records for multi-person media.
13. Reveal jobs only after Form awakening and required media consent.
14. Crews with invite/join flows and a hard maximum of five members.
15. Season recap from persisted evidence.
16. Append-only domain events and product analytics events.
17. Deterministic World runtime foundation and VECTOR I asset manifest.
18. Blender export tooling and procedural O engineering placeholder.
19. Validated production environment configuration.
20. Production API guardrails: CORS, security headers, rate limiting, readiness/liveness, secret-redacted logs and graceful shutdown.
21. Real OpenAI-compatible AI adapter with timeout/retry bounds and structured output validation.
22. Production startup refuses the stub AI provider.

## Monorepo

- `apps/mobile` — Expo / React Native client.
- `apps/api` — Fastify HTTP API/BFF.
- `apps/worker` — BullMQ async jobs.
- `packages/config` — validated runtime configuration.
- `packages/domain` — schemas and deterministic Form engine.
- `packages/db` — MySQL schema and repositories.
- `packages/media` — S3-compatible signed upload/download boundary.
- `packages/ai-gateway` — provider-neutral AI boundary.
- `packages/events` — domain event contracts.
- `packages/world-runtime` — deterministic pose/action/World state runtime.
- `tools/blender` — offline Form/O asset generation and export utilities.

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

## AI configuration

Development can use:

```env
AI_PROVIDER=stub
```

Production must use a real provider adapter:

```env
NODE_ENV=production
AI_PROVIDER=openai-compatible
AI_API_KEY=...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=...
APP_ORIGINS=https://your-approved-origin.example
```

`@form/config` rejects production startup if the stub provider is selected or required production environment values are missing.

The AI adapter can interpret Life Signals, produce Life Mode labels and narrate structured Season facts. It still cannot write canonical Trait Vectors, Form archetypes, entitlements, consent or relationship membership.

## Important API surface

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
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

Development-only endpoints remain disabled in production.

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
- Blender authors manifestations, never identity.
- World completion is deterministic and cannot directly rewrite canonical Form identity.

## Still required before public launch

This is now being built toward production, but the full production app is not complete yet. Remaining high-priority work includes durable Apple/Google account recovery, stricter write idempotency, comprehensive authorization/integration/e2e tests, production creative rendering, polished participant-consent UX, push delivery, billing/receipt verification, account deletion/recovery UX, abuse/moderation tooling, production observability/deployment, real mobile pose tracking, a production-quality VECTOR I Blender asset, and the complete SIGNAL_ZERO -> Memory -> share loop.

See `APP_ARCHITECTURE.md`, `SKILL.md`, `docs/PHASE_1_MVP.md`, `docs/API_CONTRACT.md`, and `docs/BLENDER_FORM_PIPELINE.md` before expanding scope.
