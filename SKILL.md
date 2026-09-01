# SpotAI / FORM Repository Skill Guide

## Purpose

This repository is for **FORM**, a consumer social identity platform built around one core product promise:

> **You don't choose your character. Your life creates it.**

FORM converts user-chosen aspirations and real-life experiences into a persistent, evolving digital identity called a **Form**. Friends create shared identity through **Crews**. Time is organized into **Seasons**. Cultural, entertainment, place, creator, and eventually licensed IP experiences are represented as **Worlds** that a user's existing Form can enter.

The architecture must preserve this hierarchy:

1. **Life** — what the user wants and what they choose to count from reality.
2. **Form** — the persistent identity created from that evidence.
3. **Crew** — the persistent relationship identity created by shared experiences.
4. **Season** — the time-boxed evolution cycle.
5. **Memory** — visualized proof/history of real experiences.
6. **World** — a temporary context or universe that Forms enter; Worlds never replace Forms.

A critical strategic rule:

> **Worlds end. Your Form remembers.**

## Product principles

### 1. Real life first, AI second

FORM is not an AI-content network. AI should visualize, classify, summarize, adapt, and personalize **real user-approved life evidence**.

Bad direction:
- generate fake activity and call it life
- infer personality from a face
- create arbitrary characters with no provenance
- reward passive scrolling

Correct direction:
- user chooses what they want more of
- user chooses which moments count
- evidence is classified into transparent traits
- deterministic rules drive Form progression
- AI renders the meaning visually

### 2. User-controlled identity

The product must be able to answer:

> **Why did my Form change?**

Users must be able to inspect and remove evidence. AI may classify evidence, but should not freely assign psychological identities.

### 3. Form is persistent

Do not generate unrelated avatars on every interaction. A user's Form must preserve identity across:
- camera transformations
- memories
- seasons
- Crew experiences
- Worlds
- future gameplay

### 4. Crew is the social core

Prioritize small, meaningful groups (roughly 2–5 people) over a public follower graph in early versions.

Avoid shipping an Instagram-style public feed, DMs, or mass creator economy before the core identity loop has retention.

### 5. Worlds amplify the platform; they do not create it

FORM must work with zero movie, sports, artist, or brand partnerships.

Worlds can later be:
- FORM Originals
- Place Worlds
- Campus Worlds
- Creator Worlds
- Artist Worlds
- Sports Worlds
- Film/IP Worlds

A user always enters a World **with their existing Form**.

### 6. Payment upgrades expression, not participation

The first Form, Crew participation, basic evolution, sharing, and basic season completion should remain broadly accessible.

Premium can monetize:
- high-quality cinematics
- advanced memory renders
- premium Form manifestations
- Crew finales
- Season Passes
- World Passes
- physical/digital collectibles
- gifting

Do not create randomized loot boxes or manipulative scarcity mechanics.

### 7. Privacy is product architecture

Do not depend on background surveillance.

Initial product should avoid requiring:
- continuous background location
- contact-book uploads
- always-on microphone
- unrestricted photo-library scanning
- hidden health-data access

Use explicit, scoped permissions. Participation must remain possible without optional integrations.

### 8. 18+ launch first

Until safety, consent, moderation, generated-media handling, and relationship flows are proven, design initial production rollout for adults.

## Core product loop

The primary loop is:

**WANT → LIVE → AWAKEN → SHARE → CREW → EVOLVE → NEXT SEASON**

Where:
- **WANT**: user chooses what they want more of now
- **LIVE**: user completes or records real experiences
- **AWAKEN**: the Form emerges from accumulated evidence
- **SHARE**: a cinematic identity artifact leaves the app
- **CREW**: friends join and shared identity forms
- **EVOLVE**: Form and Crew history deepen
- **NEXT SEASON**: a new direction begins without resetting identity

## Core domain vocabulary

Use these terms consistently in code and documentation:

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

Avoid replacing these with generic terms such as `avatar`, `quest`, or `profile` unless the underlying object genuinely differs.

## Architecture rules

### Domain-driven boundaries

Keep product logic separated into clear domains rather than one giant backend:

- identity / auth
- life-mode planning
- evidence ingestion
- trait progression
- Form identity
- social / Crew
- media / creative rendering
- seasons
- memories
- Worlds
- payments / entitlements
- moderation / trust
- notifications
- analytics / experimentation

### AI boundaries

Use AI for:
- natural-language onboarding interpretation
- evidence classification
- content understanding
- safe contextual suggestions
- recap narration
- visual/video generation
- World mission adaptation
- bounded NPC/character dialogue later

Do **not** use AI as the final source of truth for:
- identity score mutations
- entitlement state
- payment state
- consent state
- relationship membership
- authorization
- irreversible moderation actions without policy controls

### Deterministic progression

Trait changes and Form evolution must be reproducible from stored inputs and versioned rules.

Persist:
- scoring-rule version
- evidence confidence
- reasons for trait changes
- previous and resulting trait vectors

### Event-driven history

Prefer append-only domain events for identity evolution. The user's history is part of the moat and must be reconstructable.

Example events:
- `life_mode_started`
- `life_signal_recorded`
- `evidence_verified`
- `trait_vector_changed`
- `form_awakened`
- `form_evolved`
- `crew_joined`
- `crew_identity_awakened`
- `memory_created`
- `world_entered`
- `world_mark_earned`
- `season_completed`

## MVP scope rule

The first production-worthy version should prove only:

1. Life Mode
2. Unknown Form / awakening progress
3. Life Signals
4. transparent trait progression
5. persistent Form
6. one excellent camera/reveal output
7. friend invites
8. small Crews
9. Crew progress
10. monthly Season recap
11. basic payments

Do not let early implementation expand into Food, Health, AR multiplayer, public feeds, DMs, creator marketplace, large licensed IP Worlds, or broad recommendation engines before this loop is validated.

## Build philosophy

Before implementing any feature, ask:

1. Which stage of `WANT → LIVE → AWAKEN → SHARE → CREW → EVOLVE` does this improve?
2. Does it strengthen persistent identity or distract from it?
3. Can the user understand why the system changed their Form?
4. Does it require data we do not truly need?
5. Can it be tested with a simpler implementation first?

If a feature does not materially strengthen the core loop, defer it.

## Primary architecture document

See `APP_ARCHITECTURE.md` for the full system plan, phased architecture, domain model, backend services, data stores, AI stack, privacy model, deployment topology, analytics, monetization, and roadmap.
