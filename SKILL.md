# SpotAI / Form Repository Skill Guide

## Purpose

This repository builds a **Life Identity Network** around one promise:

> **You don't choose your character. Your life creates it.**

`SpotAI` is a working codename. `Form` is the durable product object, not necessarily the final company/app name.

## Production mandate

This repository is not a disposable prototype. Product experiments may be narrow, but engineering should be production-oriented so validated experiences can be promoted instead of rewritten.

Production-oriented means:

- validated runtime configuration,
- secure startup and secret handling,
- explicit authorization boundaries,
- rate limiting and abuse controls,
- deterministic and versioned identity logic,
- bounded AI provider adapters,
- durable database state,
- reliable asynchronous jobs,
- explicit media consent,
- health/readiness checks,
- graceful shutdown,
- observability and testability,
- idempotent/retry-safe writes where required,
- production mobile performance budgets.

Do not label unfinished code “production-ready” merely because infrastructure exists. Each user-facing path must still pass correctness, safety, performance, privacy and operational validation.

## Product hierarchy

Preserve this hierarchy in code, UX and architecture:

1. **Life** — what the user wants and which real moments they choose to count.
2. **Form** — persistent identity derived from that evidence.
3. **Crew** — persistent small-group relationship identity.
4. **Season** — recurring evolution period.
5. **Memory** — visualized history of real approved experiences.
6. **World** — temporary experiential context entered by an existing Form.

> **Worlds end. Your Form remembers.**

## Core loop

`WANT → LIVE → AWAKEN → SHARE → CREW → EVOLVE → NEXT SEASON`

Every significant feature should strengthen at least one stage without weakening explainability, consent or persistent identity.

## Non-negotiable product rules

### Real life first

AI can interpret and visualize real user-approved evidence. Do not fabricate fake life activity and count it as evidence. Do not infer personality from a face.

### User-controlled evidence

The user decides which moments count. They must be able to inspect why a Form changed and remove evidence where supported.

### Deterministic identity

AI classification is structured input. Versioned deterministic rules apply Trait changes and resolve Form identity. AI must never be final authority for archetype, level, payment, consent, authorization or Crew membership.

### Persistent Form

A Form must remain recognizable across camera activation, Blender manifestations, Memories, Crew experiences, Seasons and Worlds. Do not generate a disconnected avatar for every interaction.

### Crew before public graph

Initial Crew size is roughly 2–5. Do not add an Instagram-style public feed, open DMs or creator economy before the core identity/social loop has retention.

### Worlds amplify; they do not create the product

The product must work without entertainment/IP partnerships. A user enters every World with their existing Form.

### Payment upgrades expression

Keep core participation broadly accessible. Monetize premium cinematics, manifestations, Memories, finales and later World/Season expression. Do not use randomized loot boxes.

### Privacy is architecture

Do not require continuous background location, contact uploads, always-on microphone, unrestricted photo scanning or hidden health access. Use explicit scoped permissions.

### 18+ first

Initial production rollout remains adult-first while consent, moderation, generated-media and relationship safety are proven.

## Production runtime rules

Production must fail closed when required configuration is invalid.

- `@form/config` owns runtime validation.
- Production cannot boot with `AI_PROVIDER=stub`.
- Approved web origins must be explicitly configured in production.
- Secrets and authorization headers must be redacted from logs.
- API traffic must pass security-header, CORS and rate-limit controls.
- `/health/live` indicates process liveness; `/health/ready` checks MySQL + Redis readiness.
- SIGTERM/SIGINT must trigger graceful shutdown of API, queue/Redis infrastructure and DB pool.
- Development-only preview/user endpoints remain inaccessible in production.

## 3D / Blender rules

Blender is an **offline authoring tool**, never identity authority.

Pipeline:

```text
canonical Form state
  → reviewed FormAssetManifest
  → Blender-authored GLB
  → mobile renderer
```

Use the standardized `FORM_RIG` and semantic animation action names documented in `docs/BLENDER_FORM_PIPELINE.md`.

Do not ship archetype-specific logic inside random animation code. Map semantic actions such as `open_palm` or `hands_together` through reviewed manifests.

Start with `VECTOR I`. Do not build every Form before one manifestation is excellent and performant.

## O rules

`O` is a separate intelligence/guide/world character:

```text
FORM = USER IDENTITY
O    = INTELLIGENCE / WORLD CHARACTER
```

O may communicate through an alien mathematical visual language and bounded AI dialogue. O never decides canonical Form state.

The procedural O generator is an engineering placeholder, not production art.

## World Runtime rules

`@form/world-runtime` owns deterministic realtime experience behavior:

```text
camera pose landmarks
  → gesture detection
  → semantic body action
  → Form animation/ability
  → deterministic World reducer
  → completion event
```

The first allowed realtime World is the bounded original `SIGNAL_ZERO` vertical slice. World completion can create durable history/Memory/World outcomes according to rules, but must not directly rewrite Trait Vectors or Form archetypes.

## AI boundaries

AI may be used for:

- onboarding language interpretation,
- Life Signal classification,
- safe contextual suggestions,
- recap narration,
- creative image/video rendering,
- concept/texture/animation ideation,
- bounded World adaptation,
- bounded O/NPC dialogue later.

The real provider adapter must use bounded timeouts/retries and validate structured output before returning it to product logic.

AI must not be final authority for:

- Trait mutation,
- Form archetype/level,
- entitlement/payment,
- consent,
- relationship membership,
- authorization,
- deterministic World completion,
- irreversible moderation without policy controls.

## Core vocabulary

Use these terms consistently:

- `LifeMode`
- `LifeSignal`
- `Evidence`
- `TraitVector`
- `Form`
- `FormManifestation`
- `FormEvolution`
- `Crew`
- `CrewIdentity`
- `Season`
- `Memory`
- `World`
- `WorldMission`
- `WorldMark`
- `WorldPulse`
- `Entitlement`
- `FormAssetManifest`

## Architecture boundaries

Keep modules separated for runtime config, identity/auth, Life Mode, evidence, deterministic traits, Form, Crew, Season, media/creative rendering, World runtime, payments/entitlements, trust/safety, notifications and analytics.

Prefer a modular monolith plus asynchronous jobs until operational scale justifies service extraction.

Canonical durable state belongs in MySQL. Redis/BullMQ coordinate asynchronous work but are not the source of truth.

## Event/history rule

Identity history is part of the product moat. Persist enough information to reconstruct meaningful progression: rule version, confidence, reasons, previous/resulting Trait Vectors and durable domain events.

Examples include `life_mode_started`, `life_signal_recorded`, `trait_vector_changed`, `form_awakened`, `form_evolved`, `crew_joined`, `memory_created`, `world_entered`, `world_completed`, `world_mark_earned`, `season_completed`.

## Current build order

1. Verify build/tests and authorization.
2. Production config/security/readiness/graceful shutdown.
3. Durable account recovery/identity provider integration.
4. Write idempotency and retry safety.
5. Life Mode → Life Signal → Awakening.
6. Explainable persistent Form.
7. One excellent `VECTOR I` reveal.
8. Crew invitation/formation/progress.
9. Blender `VECTOR I` production manifestation.
10. Live pose tracking + `SIGNAL_ZERO` runtime.
11. Completion → short Memory/reveal → share.
12. Season recap and next-Season retention.
13. Push notifications and lifecycle messaging.
14. Payments/receipt verification for premium expression.
15. Moderation, account deletion and privacy operations.
16. Production observability/deployment and integration/e2e testing.
17. Only after retention: broader original/place/campus/creator Worlds.
18. Major licensed Worlds much later.

## Explicitly deferred

Do not expand early into Food, Health coaching, public feeds, open DMs, creator marketplace, large AR multiplayer, broad recommendation engines or major IP tooling.

## Build test

Before implementing a feature ask:

1. Which core-loop stage does this improve?
2. Does it strengthen persistent identity?
3. Can the user understand why canonical identity changed?
4. Does it collect only necessary data?
5. Can it be validated more simply?
6. Is AI being used as a capability rather than authority?
7. Is Blender/3D being used as manifestation rather than identity logic?
8. Is this safe to operate under production traffic and retries?
9. Are failure, shutdown, privacy and abuse cases defined?

See `APP_ARCHITECTURE.md`, `docs/PHASE_1_MVP.md`, `docs/API_CONTRACT.md` and `docs/BLENDER_FORM_PIPELINE.md`.