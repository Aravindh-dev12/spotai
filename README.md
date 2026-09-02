# SpotAI / FORM

FORM is a life-identity network built around one rule: **you do not choose your character; your life creates it.**

The Phase 1 scaffold implements the smallest coherent loop:

`Life Mode -> Life Signal -> deterministic trait update -> Form awakening/evolution -> Crew -> Season recap`

See `APP_ARCHITECTURE.md` for the full product architecture and `SKILL.md` for repository rules.

## Monorepo

- `apps/mobile` — Expo/React Native client shell.
- `apps/api` — Fastify HTTP API.
- `apps/worker` — async jobs for classification, recap and creative generation.
- `packages/domain` — canonical product types, schemas and deterministic progression.
- `packages/events` — cross-service event contracts.
- `packages/ai-gateway` — provider-neutral AI boundary.
- `packages/db` — PostgreSQL schema.

## Local services

Run PostgreSQL and Redis, copy `.env.example` to `.env`, install dependencies, then start the packages you need.

The current code intentionally uses an AI stub. Identity state must never depend directly on a model vendor response.
