# FORM — Application Architecture

## 1. Executive summary

FORM is a consumer social identity platform whose core promise is:

> **You don't choose your character. Your life creates it.**

The platform converts user-chosen aspirations and user-approved real-world experiences into a persistent digital identity called a **Form**. Friends form small **Crews**, shared experiences create **Crew identities**, time is organized into **Seasons**, and cultural/place/creator/entertainment contexts become temporary **Worlds** that existing Forms can enter.

The product must remain coherent around one lifecycle:

```text
WANT → LIVE → AWAKEN → SHARE → CREW → EVOLVE → NEXT SEASON
```

FORM is not a habit tracker, manifestation app, AI photo editor, public social feed, or fandom campaign platform. It borrows the strongest mechanics from those categories while building a persistent life-identity graph that survives individual content moments.

A key strategic invariant is:

> **Worlds end. Your Form remembers.**

---

## 2. Product thesis

### 2.1 User problem

Current consumer products fragment a person's life across many disconnected systems:

- social apps know what they posted
- fitness apps know movement
- music apps know listening
- gaming apps know virtual progression
- event apps know attendance
- photo apps know appearance
- manifestation/self-development apps know desired future

None of these systems natively combines:

- what the user wants now
- what the user actually chooses to count from real life
- who they experience life with
- how this pattern changes over time
- a persistent visual identity representing that history

FORM's job is to become that identity layer.

### 2.2 Core product object

The primary object is not a profile or avatar. It is a **Form**.

A Form contains:

- persistent Form identity
- current Life Mode context
- versioned Trait Vector
- visual manifestation state
- evolution history
- earned World Marks
- Crew-linked history
- season history
- user-visible reasons for change

### 2.3 Product differentiation

FORM should not say:

> AI analyzes your life.

It should say:

> **Build your Form. Only the moments you choose count.**

The product differentiates itself by combining:

1. aspiration
2. real-life evidence
3. deterministic progression
4. persistent visual identity
5. close-friend social identity
6. recurring seasonal evolution
7. optional cultural/entertainment Worlds

---

## 3. Product primitives

### 3.1 Life Mode

`LifeMode` expresses what a user wants more of during a period.

Examples:

- more friends
- more adventure
- more confidence
- more creativity
- more energy
- more calm
- more discipline
- more new experiences

Life Mode is directional, not diagnostic.

It should never claim a medical or psychological condition.

Example:

```json
{
  "season": "2026-09",
  "name": "EXPAND",
  "desired_dimensions": ["CONNECT", "EXPLORE", "CREATE"],
  "user_intent": "I want to get out more and meet new people"
}
```

### 3.2 Life Signal

A `LifeSignal` is a meaningful event the user chooses to count.

Examples:

- tried a new place
- met a friend
- organized an outing
- created something
- completed a project
- exercised
- helped someone
- attended an event
- completed a Crew mission

Signals may be:

- self-confirmed
- friend-confirmed
- media-supported
- app-generated activity
- integration-supported

Signals must never require continuous surveillance.

### 3.3 Evidence

`Evidence` is the normalized input used to determine how a Life Signal affects progression.

Evidence should contain:

- source
- confidence
- consent scope
- classification
- verification level
- timestamp
- visibility
- related people
- related location if explicitly allowed
- media references if explicitly supplied

### 3.4 Trait Vector

The initial trait vocabulary should remain small and culturally understandable.

Recommended MVP dimensions:

- `EXPLORE`
- `CONNECT`
- `CREATE`
- `MOVE`
- `BUILD`
- `CARE`

A Trait Vector is numerical and versioned.

Example:

```json
{
  "EXPLORE": 72,
  "CONNECT": 64,
  "CREATE": 33,
  "MOVE": 51,
  "BUILD": 46,
  "CARE": 29,
  "rules_version": "traits-v1.2"
}
```

### 3.5 Form

A `Form` is derived from long-term trait patterns, current season context, and evolution rules.

A Form should not change arbitrarily every day.

Recommended behavior:

- identity changes slowly
- manifestations can vary faster
- trait expression can shift by season
- major evolutions occur at meaningful thresholds

Example initial archetypes:

- VECTOR
- ECHO
- FORGE
- SHADE
- PULSE
- ORBIT
- NOVA
- HAVEN

Names and visual language are placeholders until dedicated brand research.

### 3.6 Form Manifestation

`FormManifestation` is the visual expression of the persistent Form in a context.

Examples:

- base manifestation
- camera activation
- season manifestation
- World manifestation
- Crew manifestation
- cinematic memory manifestation

The user may choose aesthetic expression, but should not directly choose underlying Form identity.

### 3.7 Crew

A `Crew` is a small relationship group, initially 2–5 people.

Crew should be the primary social object before any public follower graph.

Crew stores:

- member relationships
- shared Life Signals
- shared progress
- Crew Identity
- Crew memories
- Crew Worlds
- Crew season history

### 3.8 Crew Identity

A Crew can awaken into a persistent shared identity after sufficient shared experiences.

Example:

```text
Maya  → VECTOR
Riya  → ECHO
Arun  → FORGE
Sam   → ORBIT

Shared experiences → CREW: NIGHTFALL
```

Crew identity should be derived from shared history, not manually selected.

### 3.9 Season

`Season` is the recurring progression window.

Recommended default: monthly.

Season responsibilities:

- Life Mode selection
- active trait weighting
- awakening/evolution milestones
- recap
- final cinematic
- transition into next season

### 3.10 Memory

A `Memory` turns a real user-approved moment into a persistent creative artifact.

Inputs can include:

- real image/video
- timestamp/context
- participants
- Forms
- Crew identity
- World context

Output can include:

- cinematic video
- poster
- transformed image
- animated memory
- recap card

The principle is:

> Real moment first. AI visualization second.

### 3.11 World

A `World` is a temporary experiential context that existing Forms enter.

World types:

- `ORIGINAL`
- `PLACE`
- `CAMPUS`
- `CREATOR`
- `ARTIST`
- `SPORT`
- `FILM_IP`
- `EVENT`

A World may define:

- missions
- visual rules
- characters
- story context
- collective milestones
- rewards
- World Marks
- premium entitlements
- safety constraints
- licensed asset constraints

### 3.12 World Mark

A `WorldMark` is a persistent identity artifact earned from a completed World experience.

It can influence visual identity without replacing the base Form.

Think:

- symbolic patch
- material
- motif
- aura
- insignia
- animation

The mark exists because of an earned experience, not arbitrary purchase.

### 3.13 World Pulse

`WorldPulse` tracks collective participation across a World.

Example:

```text
250K completed missions → unlock official character
500K → unlock new story beat
1M → unlock finale
```

This enables mass participation without converting FORM into an endless public feed.

---

## 4. User journeys

## 4.1 First-run onboarding

### Step 1 — direction

Prompt:

> What do you want more of right now?

User selects up to three.

### Step 2 — friction

Prompt:

> What do you want less of?

Optional.

### Step 3 — desired feeling

Prompt:

> How do you want this month to feel?

### Step 4 — Life Mode creation

Example:

```text
SEPTEMBER LIFE MODE
EXPAND

Connect
Explore
Create
```

### Step 5 — unresolved identity

Do not immediately assign a permanent Form.

Show:

```text
UNKNOWN FORM
Affinity: Explore
Secondary: Connect
Awakening: 24%
```

### Step 6 — first signal

Give one simple real-world action or allow the user to add a recent qualifying moment.

The first session must already establish:

- direction
- curiosity
- progression
- evidence control

---

## 4.2 Form awakening

Once the evidence threshold is met:

```text
YOUR FORM AWAKENED
VECTOR
```

Show transparent reasons:

```text
Explore +31
Connect +21
Move +18
Create +8
```

Then trigger the first premium-quality cinematic reveal.

---

## 4.3 Share → invite loop

A shared reveal should deep-link into a personalized acquisition page.

Bad landing page:

```text
Welcome to FORM. Sign up.
```

Better:

```text
MAYA AWAKENED VECTOR
You were part of her September.

What is your Form?
```

This preserves relationship context during acquisition.

---

## 4.4 Crew formation

A user may invite 1–4 close friends.

Crew progression includes:

- shared Signals
- shared missions
- Crew awakening
- Crew visual identity
- weekly shared summary
- season finale

---

## 4.5 Monthly season loop

At season end:

```text
YOUR SEPTEMBER

17 meaningful moments
8 with friends
4 unfamiliar places
3 creative moments

Strongest shift: EXPLORE ↑
Unexpected shift: CONNECT ↑

VECTOR EVOLVED
```

Then:

```text
START OCTOBER LIFE MODE
```

The user never resets their identity; a new season modifies the ongoing history.

---

## 4.6 World journey

Example film/sport/place World:

```text
NEW WORLD OPEN
ENTER WITH YOUR FORM
```

World missions are adapted to:

- Form
- Life Mode
- Crew
- allowed context
- World rules

Completing missions can create:

- World Mark
- Memory
- Crew progression
- World Pulse contribution
- premium finale

When the World ends, the user's Form retains the history.

---

## 5. System architecture overview

```text
                    ┌────────────────────────┐
                    │ Mobile Clients         │
                    │ iOS / Android          │
                    └───────────┬────────────┘
                                │
                        API Gateway / BFF
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
 Identity/Auth           Product APIs              Media APIs
        │                       │                        │
        └───────────────┬───────┴───────────────┬────────┘
                        │                       │
              Domain Services             Async Pipeline
                        │                       │
 ┌─────────────────────────────────────────────────────────────┐
 │ Life Mode │ Evidence │ Traits │ Form │ Crew │ Season       │
 │ Memory    │ Worlds   │ Entitlements │ Trust & Safety      │
 └─────────────────────────────────────────────────────────────┘
                        │
                   Event Bus
                        │
         ┌──────────────┼───────────────┐
         │              │               │
      SQL DB        Object Store    Analytics Store
         │              │               │
         └──────────────┼───────────────┘
                        │
                    AI Gateway
                        │
       ┌────────────────┼─────────────────┐
       │                │                 │
  Language models   Vision models   Image/Video models
```

---

## 6. Recommended technical stack

This architecture should remain provider-agnostic, but an MVP stack can be pragmatic.

### Mobile

Recommended:

- React Native + TypeScript, or Flutter

Prefer React Native if the founding team is already TypeScript-heavy and expects shared web tooling.

Mobile responsibilities:

- onboarding
- camera capture
- media upload
- local draft state
- Crew UI
- Form visualization
- season experience
- deep links
- notifications
- payments UI

### Backend

Recommended initial stack:

- TypeScript
- Node.js
- Fastify or NestJS
- PostgreSQL
- Redis
- S3-compatible object storage
- background job queue
- event streaming introduced as scale requires

Avoid premature microservices.

Start as a **modular monolith** with strongly separated domain modules and asynchronous jobs.

Move services out only when operational load or team ownership requires it.

### Infrastructure

Recommended cloud primitives:

- managed PostgreSQL
- managed Redis
- object storage + CDN
- container-based API deployment
- background workers
- secret manager
- observability stack

### AI provider layer

Never couple core domain logic directly to one model vendor.

Create an internal `AI Gateway` abstraction.

Example interfaces:

```ts
interface EvidenceClassifier {
  classify(input: EvidenceInput): Promise<EvidenceClassification>;
}

interface LifeModeInterpreter {
  interpret(input: LifeModeInput): Promise<LifeModeSuggestion>;
}

interface MemoryRenderer {
  render(request: RenderRequest): Promise<RenderJob>;
}
```

---

## 7. Domain modules

## 7.1 Identity module

Responsibilities:

- account creation
- age gate
- auth
- profile
- region
- account deletion
- consent preferences
- privacy controls

### Tables

- `users`
- `user_profiles`
- `user_consents`
- `user_devices`
- `user_privacy_settings`

---

## 7.2 Life Mode module

Responsibilities:

- onboarding goals
- current mode
- historical modes
- season-linked intent
- user corrections

### Tables

- `life_modes`
- `life_mode_dimensions`
- `life_mode_history`

---

## 7.3 Evidence module

Responsibilities:

- Life Signal creation
- evidence normalization
- AI classification requests
- friend confirmation
- confidence calculation
- user removal
- source provenance

### Tables

- `life_signals`
- `evidence_items`
- `evidence_classifications`
- `evidence_confirmations`

Important fields:

```text
source_type
confidence_score
visibility
consent_scope
classification_version
created_at
revoked_at
```

---

## 7.4 Trait engine

This is one of the most important backend domains.

Responsibilities:

- map classified evidence → trait deltas
- enforce daily/weekly caps
- prevent exploitative farming
- version scoring rules
- persist explainability
- trigger Form awakening/evolution checks

### Deterministic rule example

```text
signal: first-time unfamiliar restaurant with Crew

EXPLORE +5
CONNECT +2
CREATE +0
MOVE +0
BUILD +0
CARE +0
```

AI may classify the event as "novel place + shared social activity".

The rule engine, not the AI, decides the score.

### Tables

- `trait_vectors`
- `trait_events`
- `trait_rule_versions`

Every mutation should store:

- previous vector
- delta
- resulting vector
- triggering evidence ID
- rules version
- human-readable reason key

---

## 7.5 Form engine

Responsibilities:

- awakening threshold
- archetype selection
- evolution state
- stability rules
- manifestation variants
- World Marks
- visual identity references

### Tables

- `forms`
- `form_states`
- `form_evolutions`
- `form_manifestations`
- `form_visual_assets`
- `world_marks`

### Stability principle

A Form should require substantial evidence to change archetype.

Short-term behavior should usually change:

- state
- manifestation
- influence

rather than completely replacing the Form.

---

## 7.6 Crew module

Responsibilities:

- Crew creation
- invitation
- membership
- role management
- shared activity
- Crew progression
- Crew awakening
- Crew memories

### Tables

- `crews`
- `crew_members`
- `crew_invites`
- `crew_signals`
- `crew_identity_states`
- `crew_memories`

MVP constraint:

- max ~5 active members per Crew

Avoid complex public community permissions initially.

---

## 7.7 Season module

Responsibilities:

- season lifecycle
- user season state
- Crew season state
- recap generation
- season completion
- premium finale entitlement

### Tables

- `seasons`
- `user_seasons`
- `crew_seasons`
- `season_recaps`

---

## 7.8 Memory / creative module

Responsibilities:

- media ingest
- transcoding
- identity reference management
- image generation
- video generation
- render orchestration
- downloadable/shareable output

### Pipeline

```text
Upload
  ↓
Safety scan
  ↓
Face/person consent checks
  ↓
Media normalization
  ↓
Form reference retrieval
  ↓
Render plan
  ↓
Generation / compositing
  ↓
Quality checks
  ↓
Watermark / metadata if required
  ↓
CDN delivery
```

### Important cost rule

Do not use expensive full generative video for every routine camera interaction.

Use layers:

1. deterministic realtime effects where possible
2. lightweight image compositing
3. expensive generation for high-value reveal/finale moments

---

## 7.9 Worlds module

Not part of earliest MVP, but design interfaces now.

Responsibilities:

- World definitions
- availability windows
- mission definitions
- adaptive mission rules
- World Pulse
- World Marks
- partner constraints
- World entitlement
- official assets

### Tables

- `worlds`
- `world_versions`
- `world_missions`
- `world_participants`
- `world_mission_completions`
- `world_pulse_events`
- `world_marks`
- `world_asset_policies`

### World rule

Every World must define a `canon_policy` / `generation_policy` if it uses licensed IP.

---

## 7.10 Payments and entitlements

Responsibilities:

- subscription state
- Season Passes
- consumables
- gifting
- World Passes
- entitlement checks
- refunds
- store receipt validation

### Tables

- `products`
- `purchases`
- `subscriptions`
- `entitlements`
- `gifts`
- `refund_events`

Never use LLM decisions for entitlement state.

---

## 7.11 Trust and Safety

Responsibilities:

- media moderation
- user reports
- blocks
- consent violations
- challenge safety
- AI generation boundaries
- partner/IP policy enforcement

Initial launch should support:

- block user
- remove Crew member
- report media
- report generated artifact
- report unsafe mission
- revoke media consent

---

## 8. AI architecture

AI is a set of bounded capabilities, not the business logic.

### 8.1 Life Mode interpreter

Input:

- selected goals
- optional free text
- current season

Output:

- structured Life Mode suggestion
- recommended dimensions
- safe language

User confirms before activation.

### 8.2 Evidence classifier

Input:

- user description
- optional image/video metadata
- context explicitly provided

Output:

```json
{
  "categories": ["NEW_PLACE", "SOCIAL_SHARED"],
  "trait_candidates": ["EXPLORE", "CONNECT"],
  "confidence": 0.92,
  "safety_flags": []
}
```

This result does not directly mutate traits.

### 8.3 Suggestion engine

Generates optional Life Signals / missions based on:

- Life Mode
- previous completed activities
- Crew availability
- budget preference
- time preference
- user constraints

Must avoid:

- dangerous dares
- humiliating challenges
- coercive social pressure
- risky travel/location suggestions

### 8.4 Recap narrator

Generates season recap copy from structured facts.

The source facts remain deterministic.

### 8.5 Creative renderer

Produces:

- Form reveal
- camera transformation
- Crew poster
- Memory Reborn
- season finale
- World manifestation

### 8.6 Bounded World characters

Future capability.

Characters should receive only safe World-scoped context.

Never provide private account history unless explicitly required and permitted.

---

## 9. Data architecture

## 9.1 Primary relational store

PostgreSQL should be the initial source of truth for:

- users
- permissions
- relationships
- traits
- Forms
- Crew membership
- seasons
- payments
- Worlds

## 9.2 Object storage

Store:

- uploaded images/video
- generated assets
- render intermediates
- Form reference assets

Use short-lived signed URLs.

## 9.3 Redis

Use for:

- rate limiting
- session/cache
- render state cache
- notification deduplication
- temporary locks

## 9.4 Event log

Identity evolution should be event-driven even if stored initially in PostgreSQL.

Recommended event envelope:

```json
{
  "event_id": "evt_...",
  "event_type": "form_evolved",
  "user_id": "usr_...",
  "aggregate_id": "form_...",
  "occurred_at": "2026-09-02T12:00:00Z",
  "schema_version": 1,
  "payload": {}
}
```

Later, a dedicated event bus can be introduced without changing domain semantics.

## 9.5 Analytics store

Do not run experimentation/behavior analytics directly on transactional tables at scale.

Export privacy-conscious product events into a warehouse/lakehouse.

---

## 10. Privacy architecture

Privacy must be visible to users.

### Core principle

> **Only the moments you choose count.**

### Consent model

Every optional source should have independent scopes:

- precise location
- approximate location
- camera
- selected photo
- health integration
- contacts
- calendar
- event/ticket integrations

MVP should not need most of these.

### Explainability UI

Provide:

```text
WHY MY FORM CHANGED
```

For each change:

- source event
- date
- trait effect
- confidence
- remove action

If removed, progression should be recalculated when technically feasible.

### Deletion

Account deletion must remove or anonymize:

- PII
- private media
- embeddings/reference assets
- generated personal artifacts where appropriate

Shared Crew history must use a documented retention/anonymization policy.

---

## 11. Security architecture

Baseline requirements:

- encryption in transit
- encryption at rest
- signed object URLs
- least-privilege IAM
- separate production/staging accounts
- secret manager
- immutable audit logs for sensitive admin actions
- receipt validation server-side
- abuse rate limits
- malware/file-type validation for uploads

High-risk operations should require elevated authorization:

- admin media access
- account impersonation
- moderation reversal
- partner asset publishing

---

## 12. Real-time and asynchronous workloads

Use synchronous APIs for:

- account/profile
- Life Mode
- Life Signal creation
- current trait state
- Crew membership
- current Form
- entitlement checks

Use asynchronous jobs for:

- evidence AI classification
- image/video processing
- recap generation
- Form cinematic renders
- notifications
- World Pulse aggregation
- analytics export

Suggested job states:

```text
QUEUED
RUNNING
SUCCEEDED
FAILED_RETRYABLE
FAILED_FINAL
CANCELLED
```

---

## 13. API surface sketch

### Life

```http
POST /v1/life-modes
GET  /v1/life-modes/current
POST /v1/life-signals
GET  /v1/life-signals
DELETE /v1/life-signals/:id
```

### Form

```http
GET /v1/form
GET /v1/form/history
GET /v1/form/explanations
POST /v1/form/reveal/render
```

### Crew

```http
POST /v1/crews
POST /v1/crews/:id/invites
POST /v1/crew-invites/:token/accept
GET  /v1/crews/:id
GET  /v1/crews/:id/progress
```

### Seasons

```http
GET  /v1/seasons/current
POST /v1/seasons/current/complete
GET  /v1/seasons/:id/recap
```

### Memories

```http
POST /v1/memories
POST /v1/memories/:id/render
GET  /v1/render-jobs/:id
```

### Worlds

Future:

```http
GET  /v1/worlds
POST /v1/worlds/:id/enter
GET  /v1/worlds/:id/missions
POST /v1/world-missions/:id/complete
GET  /v1/worlds/:id/pulse
```

---

## 14. Mobile navigation

MVP should avoid seven equal tabs.

Recommended bottom navigation:

1. **Home**
2. **Camera**
3. **Crew**
4. **You**

### Home

Contains:

- current Life Mode
- current season
- next suggested signal
- Crew activity
- evolution progress

### Camera

Contains:

- Form activation
- Memory capture
- Crew capture

### Crew

Contains:

- Crew identity
- members
- shared signals
- Crew progress
- Crew memories

### You

Contains:

- Form
- trait explanations
- history
- season archive
- privacy settings

Worlds later enter Home contextually rather than becoming a permanent tab initially.

---

## 15. Monetization architecture

### Free

- onboarding
- Life Mode
- basic Signals
- first awakening
- base Form
- Crew participation
- basic evolution
- basic season recap
- sharing

### FORM+

Candidate premium benefits:

- premium Form cinematics
- advanced render quality
- deeper Form history
- premium manifestations
- extra memory renders
- richer recap

### Season Pass

Potential one-time seasonal purchase:

- premium season manifestation
- cinematic checkpoints
- Crew finale
- high-quality export

### Consumables

Examples:

- Memory Reborn
- Crew poster
- special cinematic

### Worlds

Future:

- free participation tier
- World Pass
- premium finale
- merchandise
- partner-funded access

### Gifting

Future examples:

- gift Crew finale
- gift memory pack
- gift manifestation

Gifting should be deterministic and non-randomized.

---

## 16. Analytics and experimentation

### North Star candidate

**Shared Life Signals per Active Crew**

Alternative:

**Meaningful Form Evolutions per Weekly Active User**

Do not optimize primarily for session duration.

### Activation metrics

- onboarding completion
- Life Mode creation
- first Signal completion
- awakening completion
- time to awakening

### Social metrics

- reveal share rate
- invite click rate
- invite signup conversion
- Crew formation rate
- shared Signal rate

### Retention metrics

- D1 / D7 / D30
- season completion
- next-season start
- Crew retention
- Form history views

### Revenue metrics

- payer conversion
- ARPPU
- render purchase rate
- Season Pass conversion
- refund rate
- generation gross margin

### Core qualitative question

> **Do you care what your Form becomes next?**

If the answer is no, visual quality alone does not save the product.

---

## 17. MVP validation gates

Initial pilot: 50–100 adult users in real friend groups.

Suggested strong-signal targets:

- >60% return to discover/continue Form
- >50% reach awakening
- >30% share reveal
- >25% of recipients create an account
- >35% join/create Crew
- >40% of activated users intentionally start another season
- >8–10% of sufficiently activated users show purchase behavior or credible purchase intent

These are internal product hypotheses, not external industry benchmarks.

---

## 18. Phased roadmap

## Phase 0 — prototype psychology

Goal:

Validate whether people care about earned identity.

Build:

- onboarding
- Life Mode
- manual Signals
- simple trait calculation
- manually assisted Form reveals

Do not build full generative infrastructure yet.

## Phase 1 — FORM MVP

Build:

- auth
- Life Mode
- Life Signals
- evidence classification
- deterministic traits
- Unknown Form
- awakening
- 6–8 Forms
- persistent Form state
- one excellent reveal
- basic payments

## Phase 2 — Crew

Build:

- invites
- small Crew membership
- shared Signals
- Crew awakening
- Crew reveal
- Crew memories

## Phase 3 — Seasons

Build:

- monthly lifecycle
- weekly progression
- season recap
- premium finale
- next-season continuation

## Phase 4 — Original World

Launch one FORM-owned World.

Validate:

- missions
- World Pulse
- World Marks
- adaptive experiences
- World finale

## Phase 5 — Place/Campus Worlds

Examples:

- Bengaluru Weekend
- Chennai After Dark
- university event

Prove geographically dense usage.

## Phase 6 — Creator / Artist World

Partner with a smaller rights holder first.

Validate:

- partner onboarding
- licensed assets
- campaign economics
- acquisition → FORM retention

## Phase 7 — Major IP Worlds

Film, sport, major artist.

Introduce:

- World Studio
- canon constraints
- scalable World Pulse
- premium World commerce

## Phase 8 — Play / realtime Form experiences

Only after identity and Crew retention are proven.

Potential:

- realtime camera effects
- movement-aware gameplay
- persistent Form abilities
- Crew co-op

---

## 19. What NOT to build early

Explicitly defer:

- public algorithmic feed
- open DMs
- follower economy
- creator marketplace
- full calorie tracker
- medical/wellness coach
- always-on location graph
- automatic contact upload
- large AR multiplayer engine
- unrestricted AI companion
- NFT/token economy
- loot boxes
- massive IP partnership tooling before core retention

---

## 20. Failure modes and mitigations

### Failure: users see FORM as a personality quiz

Mitigation:

- delayed awakening
- evidence history
- visible reasons
- meaningful season evolution

### Failure: cool reveal, no retention

Mitigation:

- Crew
- weekly progression
- season structure
- memories
- identity history

### Failure: character inconsistency

Mitigation:

- persistent reference assets
- manifestation templates
- identity-preserving generation
- deterministic visual components

### Failure: creepy surveillance perception

Mitigation:

- explicit Signals
- optional permissions
- inspect/remove evidence
- avoid background collection

### Failure: AI costs exceed revenue

Mitigation:

- expensive generation only for high-value moments
- caching
- compositing
- realtime deterministic effects
- per-product cost budgets

### Failure: users game progression

Mitigation:

- confidence weighting
- daily caps
- repeated-pattern devaluation
- optional social confirmation
- anomaly detection

### Failure: negative self-worth effects

Mitigation:

- additive progression
- no degrading avatar for inactivity
- no social desirability score
- no "bad personality" Forms
- no health/wealth/status ranking

### Failure: Worlds eclipse the core brand

Mitigation:

- user always enters as existing Form
- World Mark enriches Form, never replaces it
- strong Original Worlds
- FORM works without partners

---

## 21. Repository structure proposal

When implementation begins, use a monorepo:

```text
spotai/
├── apps/
│   ├── mobile/
│   ├── api/
│   ├── worker/
│   └── admin/
├── packages/
│   ├── domain/
│   ├── db/
│   ├── events/
│   ├── ai-gateway/
│   ├── media/
│   ├── analytics/
│   ├── config/
│   └── ui/
├── docs/
│   ├── adr/
│   ├── product/
│   ├── security/
│   └── api/
├── infra/
│   ├── environments/
│   └── modules/
├── SKILL.md
└── APP_ARCHITECTURE.md
```

### `packages/domain`

Pure domain concepts and deterministic rules.

No HTTP, DB, or AI-provider dependencies.

### `packages/ai-gateway`

Provider adapters and structured AI contracts.

### `apps/api`

HTTP/BFF layer and orchestration.

### `apps/worker`

Async classification, generation, notifications, recap jobs.

### `apps/admin`

Moderation, World management, customer support, partner tools.

---

## 22. Engineering invariants

These should be enforced during implementation.

1. AI classification never directly mutates user identity.
2. Trait mutations are reproducible and versioned.
3. Every Form evolution has a human-readable explanation.
4. A user can participate without background surveillance permissions.
5. Payment state is server authoritative.
6. Crew media requires participant consent rules.
7. Form visual identity is persistent across renders.
8. Worlds never overwrite base Form identity.
9. Expensive rendering runs asynchronously.
10. User history is modeled as durable events, not disposable feed content.

---

## 23. Long-term platform architecture

If the core loop reaches product-market fit, FORM can expand into a broader identity platform.

### Life Graph

User-controlled history of meaningful chosen experiences.

### Relationship Graph

Persistent Crew and shared experience graph.

### Identity Graph

Form progression, manifestations, World Marks, seasons.

### Experience Graph

Worlds, locations, events, missions, memories.

These graphs should remain logically separated even if stored in the same physical database initially.

Eventually they can power:

- contextual Explore
- event discovery
- meaningful recommendations
- cross-World identity
- creator experiences
- physical merchandise
- gameplay
- long-term Life Archive

---

## 24. End-state vision

A user who has used FORM for several years should be able to open a Life Archive and see:

```text
2026
UNKNOWN → VECTOR I

2027
VECTOR II / ORBIT influence

2028
VECTOR ASCENDED
```

Alongside:

- major real memories
- Crew history
- cities
- events
- World Marks
- seasons
- shifts in personal direction

Then:

```text
PLAY MY STORY
```

AI can render that structured life history into a cinematic representation.

At that point, FORM is no longer an avatar generator.

It is a persistent, user-controlled digital representation of lived experience.

---

## 25. Final architectural thesis

The entire platform should reduce to this model:

```text
               ┌───────────────┐
               │   LIFE MODE   │
               │ What I want   │
               └───────┬───────┘
                       │
               ┌───────▼───────┐
               │ LIFE SIGNALS  │
               │ What happened │
               └───────┬───────┘
                       │
               ┌───────▼───────┐
               │ TRAIT ENGINE  │
               │ Why I change  │
               └───────┬───────┘
                       │
        ┌──────────────▼──────────────┐
        │            FORM            │
        │ Who my life is creating    │
        └──────┬──────────────┬──────┘
               │              │
        ┌──────▼──────┐ ┌────▼────────┐
        │    CREW     │ │   MEMORIES  │
        │ Who with me │ │ What remains│
        └──────┬──────┘ └────┬────────┘
               │             │
               └──────┬──────┘
                      │
               ┌──────▼──────┐
               │   SEASONS   │
               │ Time/evolve │
               └──────┬──────┘
                      │
               ┌──────▼──────┐
               │   WORLDS    │
               │ Culture/IP  │
               │ enters life │
               └─────────────┘
```

FORM must always remain centered on the person rather than the content partner, AI model, or feed.

> **Your life creates your Form. Your people create your Crew. Your experiences create your history. Worlds come and go. Your Form remembers.**
