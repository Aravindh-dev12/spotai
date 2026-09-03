# SpotAI — working codename

SpotAI is the current repository/app codename. **Form** is the persistent identity object created from real moments the user explicitly chooses to count. The final consumer/company brand is intentionally unresolved.

> **You don't choose your character. Your life creates it.**

Long-term thesis:

> **Your life creates your Form. Your people create your Crew. Your experiences create your history. Worlds come and go. Your Form remembers.**

## Product loop

`WANT → LIVE → AWAKEN → SHARE → CREW → EVOLVE → NEXT SEASON`

AI may interpret, classify, narrate and render. It never directly writes canonical identity state. Trait progression and Form resolution are deterministic, versioned and explainable.

## Current architecture

- **Mobile:** Expo + React Native + Expo Router + TypeScript
- **API:** Fastify + TypeScript + Zod
- **Database:** MySQL 8.4 / InnoDB / `mysql2/promise`
- **Jobs:** Redis + BullMQ
- **Media:** S3-compatible storage; MinIO locally
- **AI:** provider-neutral `@form/ai-gateway`
- **Identity engine:** deterministic `@form/domain`
- **Realtime experience:** `@form/world-runtime`
- **3D authoring:** Blender → GLB + reviewed Form manifest
- **CI:** GitHub Actions
- **Workspace:** pnpm monorepo

## What is implemented

The current foundation includes adult-gated alpha sessions, Seasons, Life Mode, Life Signals, deterministic traits, Unknown Form/awakening, explainable Form history, evidence deletion/recomputation, Crews, consent-aware media, async reveal jobs, Season recap, domain events and analytics events.

The new 3D/runtime layer adds:

- versioned Blender Form asset contract,
- standardized `FORM_RIG`,
- `VECTOR I` manifest,
- Blender headless exporter,
- procedural rocky `O` engineering starter,
- typed pose/gesture runtime,
- semantic body action → animation/ability mapping,
- deterministic World reducer,
- first original micro-World: `SIGNAL_ZERO`.

`O` is **not** the user's Form. O is a separate intelligence/guide/world character.

## First realtime experience

```text
LIVE CAMERA
  ↓
pose landmarks
  ↓
VECTOR I manifestation
  ↓
open palm
  ↓
VECTOR FIELD ability
  ↓
O mathematical/VFX reaction
  ↓
hands together
  ↓
SIGNAL ZERO complete
  ↓
7–10 second Memory/reveal
  ↓
share
```

This is deliberately a narrow vertical slice. The goal is to prove that earned identity becomes more compelling when the Form can move, react and persist—not to build a large AR game before retention is proven.

## Monorepo

- `apps/mobile` — consumer Expo app.
- `apps/api` — Fastify API/BFF.
- `apps/worker` — BullMQ jobs.
- `packages/domain` — deterministic Form progression.
- `packages/db` — MySQL repositories/schema.
- `packages/media` — signed media boundary.
- `packages/ai-gateway` — bounded AI contracts/adapters.
- `packages/events` — domain event contracts.
- `packages/world-runtime` — pose, abilities and deterministic World runtime.
- `assets/forms` — reviewed Form manifests/3D outputs.
- `tools/blender` — Blender generation/export tooling.
- `docs` — product/API/3D implementation plans.

## Run locally

Requirements: Node 22+, pnpm 10+, Docker.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm --filter @form/api dev
```

Worker:

```bash
pnpm --filter @form/worker dev
```

Mobile:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm --filter @form/mobile dev
```

For a physical phone, use the computer's LAN IP instead of `localhost`.

Local services:

- MySQL: `localhost:3306`
- Redis: `localhost:6379`
- MinIO S3 API: `localhost:9000`
- MinIO console: `localhost:9001`

## Blender

Export a reviewed Form asset:

```bash
blender vector.blend --background --python tools/blender/export_form.py -- \
  --archetype VECTOR --level 1 --output assets/forms/vector-i
```

Generate the temporary O engineering asset:

```bash
blender --background --python tools/blender/generate_o.py -- \
  --output assets/o/o-rocky-v0.glb
```

Blender is an offline authoring tool. It is not required on the phone and it never determines canonical Form identity.

## Product invariants

- Only moments the user chooses count.
- No background photo scanning is required.
- Multi-person creative media requires explicit consent.
- AI classification cannot directly mutate Form state.
- Form changes are reproducible from evidence + rules version.
- Users can inspect why their Form changed and remove evidence.
- Crew size is initially 2–5.
- Redis is not canonical state.
- Blender assets are manifestations, not identity authority.
- World completion is deterministic and cannot directly rewrite a Form.
- Payment upgrades expression, not participation.
- Launch target remains 18+ until safety/consent systems mature.

## Scope order

1. Make Life Mode → Signal → Awakening compelling.
2. Make one `VECTOR I` reveal excellent.
3. Make Crew invitations/retention work.
4. Make `SIGNAL_ZERO` responsive on a mid-range phone.
5. Turn completed experiences into shareable Memories.
6. Prove next-Season retention.
7. Add payments for premium expression.
8. Only then broaden Worlds.

Do **not** jump to Food, Health, a public feed, open DMs, creator economy, broad AR multiplayer or major licensed IP Worlds before the core loop is validated.

## Not production-complete

Still required before public launch: durable Apple/Google or equivalent account recovery, production AI adapters/rendering, polished consent UX, push delivery, app-store billing/receipt verification, abuse/rate limits/moderation, observability/deployment, integration/e2e tests, production-quality VECTOR/O art, mobile 3D renderer integration and live pose tracking.

Read `SKILL.md`, `APP_ARCHITECTURE.md`, `docs/PHASE_1_MVP.md`, `docs/API_CONTRACT.md` and `docs/BLENDER_FORM_PIPELINE.md` before expanding scope.