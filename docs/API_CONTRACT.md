# SpotAI API Contract

This document describes the current Phase 1 HTTP surface and the next runtime boundary. The API is server-authoritative for identity, consent, Crew membership, entitlements and durable history.

## Identity and session

- `POST /v1/auth/guest` — adult-gated alpha account/session creation.
- `GET /v1/me` — current authenticated user.
- `POST /v1/auth/logout` — revoke current bearer session.
- `POST /v1/dev/users` — development-only compatibility endpoint; disabled in production.

## Seasons, Life Mode and evidence

- `GET /v1/seasons/active`
- `POST /v1/seasons`
- `POST /v1/life-modes`
- `GET /v1/life-signals?seasonId=...`
- `POST /v1/life-signals`
- `DELETE /v1/life-signals/:id?seasonId=...`

A client may submit evidence and context, but never a final Trait Vector or archetype. AI classification is an input to deterministic progression.

## Form

- `GET /v1/form?seasonId=...` — current traits, awakening progress, archetype and reasons.
- `GET /v1/form/history?seasonId=...` — explainable mutation history.

Future runtime APIs must resolve a `FormAssetManifest` from canonical Form state. Clients must not choose an unearned archetype/level by changing a GLB URL or manifest.

## Crew

- `GET /v1/crews`
- `POST /v1/crews`
- `GET /v1/crews/:id/members`
- `POST /v1/crews/:id/invites`
- `POST /v1/crews/join`

Initial Crew size is 2–5. Membership remains canonical in the database.

## Media and consent

- `POST /v1/media/upload-intents`
- `POST /v1/media/:id/complete`
- `POST /v1/media/:id/consent`
- `GET /v1/media/:id/view`

Only explicitly selected media is uploaded. Multi-person creative rendering must satisfy participant consent before processing.

## Reveal and recap

- `POST /v1/reveals`
- `GET /v1/reveals/:id`
- `GET /v1/seasons/:id/recap`

Reveal work is asynchronous. A reveal cannot mutate canonical Form identity.

## World Runtime — planned server boundary

The first realtime experience is `SIGNAL_ZERO`. The mobile runtime will consume reviewed World definitions and reviewed Blender Form manifests. Server endpoints should be introduced only when persistence is needed, approximately:

- `GET /v1/form/manifest?seasonId=...`
- `GET /v1/worlds/available`
- `POST /v1/worlds/:id/enter`
- `POST /v1/world-sessions/:id/complete`
- `POST /v1/memories`

World completion may create a Memory, World Mark or history event according to deterministic rules. It must not directly rewrite Trait Vectors or Form archetypes.

## Retry and security rules

Writes that can be retried should support idempotency. Authorization and ownership are checked server-side. Redis/BullMQ may coordinate work but are never canonical state. Signed object URLs must be short-lived. AI output is always treated as untrusted structured input until validated by domain rules.