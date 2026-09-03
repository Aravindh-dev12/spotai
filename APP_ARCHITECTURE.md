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

## 3. Production mandate

The implementation target is a production-grade consumer application, not a throwaway prototype. Narrow product experiments are acceptable, but validated paths should be promotable rather than rewritten.

Production-grade in this repository requires:

- validated environment configuration and fail-closed startup,
- explicit auth/authorization boundaries,
- secure logging with secret redaction,
- CORS/security headers/rate limits,
- liveness and dependency readiness probes,
- graceful shutdown,
- durable MySQL canonical state,
- Redis/BullMQ only for coordination and async execution,
- bounded and validated AI provider calls,
- retry-safe/idempotent writes where duplicate execution matters,
- explicit media consent,
- testable domain rules and integration boundaries,
- mobile CPU/GPU/memory budgets for realtime 3D,
- observability, moderation and privacy operations before public launch.

No document or implementation should call the whole app “production-ready” until these paths are validated end-to-end under production-like conditions.

## 4. Domain hierarchy

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

## 5. Identity authority

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

## 6. Current system architecture

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
- validated runtime `@form/config`
- deterministic `@form/domain`
- typed `@form/world-runtime`
- Blender offline authoring/export tools
- pnpm workspaces
- Docker Compose
- GitHub Actions

Use a modular monolith plus asynchronous workers until scale/team boundaries justify service extraction.

## 7. Production API shell

The Fastify API must boot through validated configuration rather than ad hoc `process.env` reads in business logic.

Current production shell responsibilities:

- fail startup when production uses the stub AI provider,
- require explicitly approved browser origins in production,
- configure trusted proxy behavior explicitly,
- apply security headers,
- apply CORS allowlisting,
- apply Redis-backed global rate limiting,
- use session-derived hashed rate-limit keys where possible,
- redact authorization/cookie material from logs,
- expose `/health/live`,
- expose `/health/ready` backed by MySQL + Redis checks,
- disable development-only preview paths in production,
- respond to SIGTERM/SIGINT with graceful shutdown.

The next production hardening step is write idempotency for retry-sensitive endpoints and broader per-route abuse budgets.

## 8. Current product modules

### Identity/auth

Adult-first account/session foundation, authorization, account/privacy lifecycle. Production still needs durable Apple/Google or equivalent account-recovery integration.

### Life Mode

Stores what the user wants more/less of and desired feeling for a Season. Directional, never diagnostic.

### Evidence

Stores user-chosen Life Signals and evidence metadata. Optional media is explicitly selected. Do not silently add background signals.

### Trait/Form engine

`@form/domain` owns deterministic scoring and archetype resolution. MySQL stores canonical state/history.

Initial canonical archetypes in current code:

- VECTOR
- ECHO
- FORGE
- ORBIT
- PULSE
- HAVEN

### Crew

Relationship-scoped groups capped at five in the current MVP. Invitations and membership are canonical server state.

### Media/creative

S3-compatible signed upload, media records, consent records, async reveal job records. Expensive generation remains asynchronous.

### Season

Current Season, Life Mode context, Form progression and recap facts.

### World runtime

`@form/world-runtime` owns deterministic realtime experience rules, body-action mapping and World completion. The first vertical slice is `SIGNAL_ZERO`.

## 9. O architecture

`O` is not the user's Form.

```text
FORM = USER IDENTITY
O    = INTELLIGENCE / GUIDE / WORLD CHARACTER
```

O should eventually operate as an orchestrator rather than a generic chatbot:

```text
                    O
                    │
        ┌───────────┼────────────┐
        ▼           ▼            ▼
   CONTEXT       ACTION       NARRATIVE
   BUILDER       ROUTER        LAYER
        │           │            │
        ▼           ▼            ▼
Life Mode       capabilities    voice
Form            camera          personality
Crew            World           math language
Season          explore         explanations
History         memory
Preferences     Crew
Constraints
```

LLM output is not sufficient by itself. Suggested actions must pass deterministic/business safety filters before display or execution.

O's visual language can use alien mathematics, vectors, orbital curves and geometric fields. That aesthetic is brand expression, not the canonical scoring engine.

## 10. Capability architecture

Long term, do not build permanent Food/Health/Explore/Game silos. Model capabilities that O and the Life Surface can invoke contextually.

```ts
interface Capability {
  id: string;
  inputs: string[];
  permissions: string[];
  contextTriggers: string[];
  safetyClass: string;
  costClass: string;
}
```

Possible capabilities later:

- `cook_from_kitchen`
- `find_place`
- `activate_form`
- `crew_challenge`
- `create_memory`
- `play_motion_world`
- `reflect_on_season`
- `resurface_memory`

These are future expansion primitives. Do not implement broad Food/Health/Explore product surfaces before the identity/Crew/Season loop is retained.

## 11. AI architecture

AI is a bounded capability, not canonical business logic.

### Development

`AI_PROVIDER=stub` is permitted for local development and deterministic test flows.

### Production

Production startup must reject `AI_PROVIDER=stub`.

The current provider-neutral gateway supports an OpenAI-compatible HTTP adapter with:

- configurable base URL,
- explicit model selection,
- API-key auth,
- bounded timeout,
- bounded retry,
- JSON-only response request,
- output validation/sanitization before returning structured classification or narration.

The adapter currently supports:

- Life Signal classification,
- Life Mode label generation,
- Season narrative generation.

Creative rendering remains a separate asynchronous provider boundary.

### Non-negotiable AI invariant

> **AI interprets. Deterministic software decides identity progression.**

AI cannot be final authority for:

- archetype,
- Form level/evolution,
- payments/entitlements,
- consent,
- authorization,
- Crew membership,
- deterministic World completion.

## 12. Camera as perception bus

Do not create separate physical camera stacks for every feature.

Conceptual pipeline:

```text
CAMERA FRAME
     │
     ├── person detection
     ├── pose landmarks
     ├── hand landmarks
     ├── segmentation
     ├── object/scene understanding
     └── optional depth
            │
            ▼
      PERCEPTION STATE
```

Consumers can subscribe to the perception state:

- Form activation → pose/segmentation,
- World runtime → pose/hands/depth,
- Memory → recording/scene/consent,
- later contextual capabilities → only the sensors explicitly requested by the user.

No hidden continuous surveillance.

## 13. Blender / Form manifestation architecture

Blender is an offline authoring tool.

```text
canonical Form state
  → reviewed FormAssetManifest
  → Blender-authored rig/mesh/material/actions
  → GLB export
  → mobile renderer
```

The runtime never asks Blender to decide who the user is.

Standard armature: `FORM_RIG`.

The first production art target is `VECTOR I`, not six Forms at once.

See `docs/BLENDER_FORM_PIPELINE.md`.

## 14. First realtime World: SIGNAL_ZERO

The first magic test remains intentionally small:

```text
Camera
+
one person
+
pose tracking
+
VECTOR I
+
3 body-driven abilities
+
one ~45-second encounter
```

Target loop:

```text
camera sees user
  → pose landmarks
  → semantic body action
  → VECTOR I animation/ability
  → SIGNAL_ZERO deterministic reducer
  → World completion
  → durable event
  → short Memory/reveal
  → share
```

No large multiplayer world, live generative video, huge city or licensed superhero IP is needed for this test.

The product innovation is not body tracking itself; it is that the user's **persistent earned Form** enters a World and the result joins their long-term history.

## 15. Life Surface

Long-term UX direction is one continuous perceived surface rather than many disconnected category tabs.

Internal state can still be modular:

```text
CALM
 ↓
O_INTERACTION
 ↓
CAMERA
 ↓
FORM_ACTIVE
 ↓
WORLD
 ↓
RESULT
 ↓
MEMORY
 ↓
CALM
```

The current tabbed MVP is implementation scaffolding and can evolve toward this surface after the core interactions work.

The primary user question should become:

> **What is possible for me right now?**

O may compress choices to three options, such as Easy / Interesting / Unexpected.

## 16. Durable Life Archive model

The long-term moat is not the LLM. It is the accumulated user-controlled history.

Conceptual graph:

```text
                   USER
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       WANTS    RELATIONSHIPS  ACTIONS
          │         │          │
          ▼         ▼          ▼
      LIFE MODE    CREW     EXPERIENCES
          │         │          │
          └─────────┼──────────┘
                    ▼
                   FORM
                    │
              FORM HISTORY
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     MEMORY       SEASON       WORLD
        │                       │
        └──────────────┬────────┘
                       ▼
                  LIFE ARCHIVE
```

Keep MySQL as the source of truth initially. Do not introduce a graph database merely because the conceptual model is a graph.

Long-term interaction:

> “O, show me who I was when I was nineteen.”

## 17. Event architecture

Durable history events should include examples such as:

- `life_mode_started`
- `life_signal_recorded`
- `life_signal_removed`
- `trait_vector_changed`
- `form_awakened`
- `form_evolved`
- `crew_created`
- `crew_joined`
- `experience_started`
- `experience_completed`
- `world_entered`
- `world_completed`
- `world_mark_earned`
- `memory_created`
- `season_completed`

Events must never bypass canonical authorization/consent/state rules.

## 18. Privacy and safety

Core user line:

> **You decide what becomes part of your Form.**

Initial architecture rules:

- no background location requirement,
- no contact-book upload by default,
- no hidden mic,
- no face-based personality inference,
- no medical/mental-health diagnosis,
- inspectable “Why my Form changed” history,
- evidence removal/recomputation,
- adult-first launch,
- multi-person creative output only with participant consent,
- additive evolution rather than shame/degradation.

Health-related capabilities, if built later, begin as lifestyle/wellbeing and must not become diagnosis/treatment without a separate high-safety architecture.

## 19. Monetization architecture

Core participation remains free enough for network effects.

Free examples:

- Life Mode,
- Life Signals,
- awakening,
- base Form,
- Crew participation,
- basic camera manifestation,
- basic Season recap,
- sharing.

Premium expression can include:

- high-quality cinematics,
- premium manifestation states,
- richer Memory renders,
- deeper history,
- premium Season/Crew finales,
- later World expression.

> **Payment upgrades expression, not participation.**

Payments and entitlements are server-authoritative. No LLM may grant paid state.

## 20. Production testing strategy

### Domain tests

Required for:

- scoring,
- awakening,
- Form resolution,
- recomputation,
- evidence multipliers,
- deterministic World reducer,
- gesture/action mapping.

### API integration tests

Required for:

- auth/session resolution,
- season ownership,
- Life Signal ownership/deletion,
- Crew invite/join authorization,
- consent enforcement,
- reveal eligibility,
- production configuration failure cases,
- rate limiting,
- readiness behavior,
- write idempotency once implemented.

### Infrastructure/e2e

Run production-like MySQL, Redis and object storage. Validate retry and shutdown behavior, not only happy-path HTTP responses.

### Mobile performance

For realtime camera/3D, profile on mid-range physical Android and iOS hardware. Track frame time, memory, thermal behavior, startup, asset size and battery impact.

## 21. Validation metrics

Core product metrics:

- Awakening completion,
- reveal share rate,
- share → install,
- invite → Form discovery,
- Form → Crew formation,
- Crew first-experience completion,
- Memory creation,
- D7 return,
- Season completion,
- Season 2 start.

Deepest metric:

> **Do users want to know what they become next?**

If they only say “cool AI character,” the product is a filter rather than a persistent identity network.

## 22. Current implementation sequence

1. Production config/security/readiness/graceful shutdown.
2. Durable auth/account recovery.
3. Write idempotency and authorization tests.
4. Life Mode / Life Signal / explainable Form hardening.
5. Production VECTOR I Blender asset + reveal.
6. Crew progress and social acquisition loop.
7. Live camera pose pipeline.
8. VECTOR I semantic ability mapping.
9. SIGNAL_ZERO runtime integration.
10. World completion → durable event → Memory/reveal → share.
11. Season recap and next-season loop.
12. Push lifecycle messaging.
13. Billing/receipt verification for premium expression.
14. Moderation, deletion/privacy operations and observability.
15. Production deployment + e2e/load/failure testing.
16. Only after retention: broader original/place/campus/creator Worlds.

## 23. Explicitly deferred

Until the core loop is proven, do not build:

- public algorithmic feed,
- open DMs,
- creator marketplace/economy,
- Food super-app surface,
- Health diagnosis/coach,
- always-on location graph,
- automatic contacts ingestion,
- giant AR multiplayer,
- broad unrestricted AI companion,
- major licensed IP infrastructure.

## 24. Failure modes

### Cool reveal, no return

Fix the Crew/Season/history loop before adding more rendering styles.

### AI becomes identity authority

Reject the architecture. Structured AI classification must feed deterministic rules.

### Realtime Form feels laggy

Reduce geometry/effects/model complexity before expanding Worlds.

### Users perceive surveillance

Default to explicit capture and visible evidence provenance.

### Worlds eclipse the core product

Require existing Form identity and durable post-World history.

### AI/render cost overwhelms economics

Use realtime deterministic effects for routine interactions and expensive generation only for high-value outputs.

### Production instability

Fail startup on bad configuration, enforce readiness/liveness, use bounded retries, rate limits, idempotency and graceful shutdown, and test dependency failure rather than relying on optimistic happy paths.

## 25. Final architectural thesis

```text
User chooses direction
        ↓
User lives real life
        ↓
User chooses what counts
        ↓
AI interprets
        ↓
Deterministic software updates Trait state
        ↓
Persistent Form evolves
        ↓
Form manifests through camera/Blender
        ↓
Crew + Worlds create experiences
        ↓
Real outcomes become Memories/history
        ↓
Season closes
        ↓
Next direction begins
```

> **Your life creates your Form. O helps you discover what comes next. Your people become your Crew. Your experiences become Memories. Every month becomes a Season. Worlds end. Your Form remembers.**