# SpotAI / FORM — Application Architecture

## 1. Product thesis

SpotAI is the working codename for a **Life Identity Network**.

> **You don't choose your character. Your life creates it.**

The platform converts user-chosen aspirations and user-approved real-life experiences into a persistent identity called a **Form**. Small groups of friends become **Crews**. Time is organized into **Seasons**. Real experiences become **Memories**. Temporary cultural/place/original/IP contexts become **Worlds** entered by the user's existing Form.

> **Worlds end. Your Form remembers.**

The consumer/company brand may change. `Form`, `Crew`, `Season`, `Memory` and `World` are domain concepts and should not depend on the final brand name.

## 2. Core lifecycle

```text
WANT → LIVE → AWAKEN → SHARE → CREW → EVOLVE → NEXT SEASON
```

- **WANT:** choose what the user wants more of now.
- **LIVE:** record real moments the user chooses to count.
- **AWAKEN:** deterministic progression resolves an earned Form.
- **SHARE:** high-quality identity artifact leaves the app.
- **CREW:** close friends join and create relationship context.
- **EVOLVE:** Form/Crew/history deepen through evidence.
- **NEXT SEASON:** direction changes without resetting identity.

The critical retention question is: **“Do you want to see what your Form becomes next?”**

## 3. Domain hierarchy

1. `LifeMode` — current desired direction.
2. `LifeSignal` / `Evidence` — chosen real-world moments and provenance.
3. `TraitVector` — small, versioned dimensions: EXPLORE, CONNECT, CREATE, MOVE, BUILD, CARE.
4. `Form` — persistent earned identity.
5. `FormManifestation` — visual/3D expression of the Form.
6. `Crew` / `CrewIdentity` — persistent close-friend identity.
7. `Season` — recurring evolution period.
8. `Memory` — creative representation of approved real history.
9. `World` — temporary experiential context.
10. `WorldMark` / `WorldPulse` — durable World trace and collective progress.
11. `Entitlement` — server-authoritative paid expression/access.

## 4. Identity authority

The architecture deliberately separates **interpretation** from **identity mutation**.

```text
User-approved evidence
  → AI classification
  → validated structured result
  → deterministic versioned Trait rules
  → canonical TraitVector
  → deterministic Form resolution/evolution
  → durable history
```

AI may classify a Life Signal as exploratory/social/creative. AI does not directly write Trait values or select a final archetype.

Every meaningful Form change should persist enough information to explain and reproduce it: evidence ID, confidence, rule version, previous vector, delta, resulting vector and human-readable reason.

Evidence deletion triggers recomputation where supported.

## 5. Current system architecture

```text
Expo / React Native mobile
          │
          ▼
Fastify API / BFF
          │
 ┌────────┼──────────────┬──────────────┐
 │        │              │              │
Auth   Product        Media         World/runtime
 │        │              │              │
 └────────┴──────┬───────┴──────────────┘
                 │
              MySQL
        canonical durable state
                 │
        ┌────────┴────────┐
        │                 │
   Redis/BullMQ      S3-compatible
   async jobs         object storage
        │                 │
        └────────┬────────┘
                 │
             AI Gateway
```

### Current stack

- React Native + Expo Router + TypeScript
- Node.js + Fastify + Zod
- MySQL 8.4 / InnoDB / `mysql2/promise`
- Redis + BullMQ
- S3-compatible storage / MinIO locally
- provider-neutral `@form/ai-gateway`
- deterministic `@form/domain`
- typed `@form/world-runtime`
- pnpm workspaces
- Docker Compose
- GitHub Actions

Use a modular monolith plus asynchronous workers until scale/team boundaries justify service extraction.

## 6. Current product modules

### Identity/auth

Adult-first account/session foundation, authorization, account/privacy lifecycle. Production still needs durable recovery/identity provider integration.

### Life Mode

Stores what the user wants more/less of and desired feeling for a Season. Directional, never diagnostic.

### Evidence

Stores user-chosen Life Signals, evidence level, media references, timestamps, visibility, AI classification and removal state.

### Trait/Form engine

Pure deterministic progression. AI output is input only. Form archetype and evolution must be reproducible.

### Crew

Small relationship group, initially 2–5 people. Crew is the social core before any public follower graph.

### Season

Recurring evolution window with Life Mode, progress, recap and next-Season continuation.

### Media/creative

Explicit media selection, signed upload/download, participant consent, async reveal jobs and later Memory rendering.

### Events/analytics

Durable domain events for identity history plus privacy-conscious product analytics events.

## 7. Blender and persistent 3D Form architecture

Blender is an **offline authoring tool**, not identity authority.

```text
canonical Form state
  → reviewed FormAssetManifest
  → Blender-authored GLB
  → mobile renderer
```

Each Form level should have a stable manifest and GLB. The first production target is `VECTOR I`.

Required principles:

- persistent silhouette/material language,
- standardized `FORM_RIG`,
- semantic action names,
- reviewed ability mappings,
- mobile GPU budget,
- same identity across camera, reveal, Memory and World.

A user cannot obtain another archetype/level merely by substituting an asset URL or manifest. Canonical state controls the allowed manifestation.

See `docs/BLENDER_FORM_PIPELINE.md`.

## 8. O architecture

`O` is not a Form.

```text
FORM = USER IDENTITY
O    = INTELLIGENCE / GUIDE / WORLD CHARACTER
```

O can provide bounded dialogue, narrative reaction and a distinctive alien mathematical visual language. O must not become a hidden authority that decides Trait changes, consent, payments or World completion.

The procedural Blender O generator is an engineering placeholder. Production O requires deliberate art direction, rigging, animation, audio and performance optimization.

## 9. Realtime World Runtime

The first realtime work is a narrow original micro-World called `SIGNAL_ZERO`.

```text
live camera
  → pose landmarks
  → gesture detector
  → semantic body action
  → Form animation + ability
  → O/world reaction
  → deterministic World reducer
  → completion event
  → Memory / durable history
```

`@form/world-runtime` should remain deterministic for interaction state. AI can adapt narration or creative output around that state but should not decide whether the user completed the World.

### First interaction

```text
VECTOR I activates
  → open palm
  → VECTOR FIELD
  → O mathematical reaction
  → hands together
  → charge/finalize
  → SIGNAL ZERO complete
  → 7–10 second Memory/reveal
  → share
```

This is a validation instrument, not permission to build broad AR multiplayer.

## 10. AI architecture

Use a provider-neutral AI Gateway.

AI may handle:

- Life Mode language interpretation,
- Life Signal classification,
- safe suggestions,
- recap narration,
- concept/texture/animation ideation,
- reveal/Memory image-video rendering,
- bounded World adaptation,
- bounded O dialogue.

AI must not be final authority for:

- Trait mutation,
- Form archetype/level,
- authorization,
- consent,
- Crew membership,
- payment/entitlement,
- deterministic World completion,
- irreversible moderation without policy controls.

## 11. Media, privacy and consent

Core principle:

> **Only the moments you choose count.**

Initial product should not require background location, contact-book upload, always-on microphone, unrestricted photo scanning or hidden health access.

Media is explicitly selected. Multi-person creative media requires participant consent scope. Signed URLs should be short-lived. Account/media deletion and consent revocation require documented lifecycle behavior.

Never infer psychological identity from facial appearance.

## 12. Async rendering

Expensive creative work is asynchronous.

```text
request
  → validate identity + ownership + consent + entitlement
  → queue
  → renderer adapter
  → safety/quality checks
  → persist output asset
  → signed delivery
```

Use deterministic realtime effects for routine interactions. Reserve expensive generative image/video work for reveals, Memories and finales where emotional/revenue value justifies cost.

## 13. Mobile information architecture

Current core surfaces:

- **You** — Form, traits, explanations/history.
- **Camera** — activation/reveal and later live runtime.
- **Crew** — close-friend membership/progress.
- **Season** — current direction and recap.

Worlds should initially appear contextually rather than as a permanent content feed.

## 14. Monetization

Core participation remains free enough to support network effects:

- Life Mode,
- Life Signals,
- first awakening,
- base Form,
- Crew participation,
- basic evolution,
- basic recap/share.

Premium upgrades expression:

- higher-quality cinematics,
- premium manifestations,
- advanced Memories,
- Crew/Season finales,
- later World passes/expression,
- gifting.

No randomized loot boxes or pay-to-determine identity.

## 15. Analytics and validation

Do not optimize for passive session duration.

Measure:

- onboarding completion,
- first Life Signal,
- awakening completion/time,
- reveal completion/share,
- recipient signup conversion,
- Crew formation/shared activity,
- World start/completion,
- Memory share,
- D1/D7/D30,
- Season completion,
- next-Season start,
- payer conversion and generation gross margin.

A beautiful reveal without return behavior is a novelty, not product-market fit.

## 16. Build order

### Stage A — identity foundation

Life Mode → chosen evidence → deterministic traits → Unknown Form → awakening → explanations/removal.

### Stage B — social foundation

Crew create/invite/join, relationship-scoped activity and shared retention.

### Stage C — expression

One excellent `VECTOR I` reveal and persistent Blender manifestation.

### Stage D — realtime proof

Live pose tracking, mobile 3D renderer and `SIGNAL_ZERO`.

### Stage E — Memory/share

Turn completed real/realtime experiences into short, high-quality shareable Memories.

### Stage F — Seasons + monetization

Prove next-Season continuation; then add paid premium expression with server-authoritative receipts/entitlements.

### Stage G — Worlds

Only after core retention: original → place/campus → creator/music → major licensed IP.

## 17. Explicitly deferred

Until the core loop is validated, do not expand into:

- public algorithmic feed,
- open DMs,
- follower/creator economy,
- Food product,
- Health/medical coaching,
- always-on location graph,
- automatic contacts,
- broad AR multiplayer,
- marketplace/token/NFT economy,
- major IP partner infrastructure.

## 18. Engineering invariants

1. AI never directly mutates canonical identity.
2. Trait/Form progression is deterministic and versioned.
3. Every meaningful identity change is explainable.
4. User participation does not require background surveillance.
5. Payment and entitlements are server authoritative.
6. Multi-person creative media follows consent rules.
7. Form visual identity persists across manifestations.
8. Blender is manifestation tooling, not identity logic.
9. Worlds never overwrite base Form identity.
10. World completion is deterministic.
11. Expensive generation runs asynchronously.
12. Durable history is modeled as events/state, not disposable feed content.
13. Redis is coordination/cache, never canonical state.
14. O is a bounded character/intelligence, not a hidden identity authority.

## 19. Long-term platform

If the core loop reaches product-market fit, the platform grows into four connected but logically separated graphs:

- **Life Graph** — user-controlled meaningful experiences.
- **Relationship Graph** — Crew/shared history.
- **Identity Graph** — Form progression, manifestations, Seasons, World Marks.
- **Experience Graph** — Worlds, places, events, missions and Memories.

This can eventually support contextual discovery, cross-World identity, creator/partner experiences, physical/digital collectibles and a long-term Life Archive.

A multi-year user should be able to see an earned history such as:

```text
2026  UNKNOWN → VECTOR I
2027  VECTOR II / ORBIT influence
2028  VECTOR ASCENDED
```

and eventually choose **PLAY MY STORY**, where AI renders structured, user-controlled history into a cinematic representation.

## 20. Final thesis

```text
Life Mode
   ↓
Chosen Life Signals
   ↓
AI interpretation
   ↓
Deterministic Trait Engine
   ↓
Persistent Form
   ├── Blender manifestation
   ├── Camera/reveal
   ├── Crew
   ├── Seasons
   ├── Memories
   └── Worlds
```

The person remains the center—not the AI model, 3D engine, content partner or feed.

> **Your life creates your Form. Your people create your Crew. Your experiences create your history. Worlds come and go. Your Form remembers.**