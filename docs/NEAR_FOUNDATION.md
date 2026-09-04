# NEAR Foundation — Implementation Slice 001

## Goal

This slice begins the product pivot from the legacy Life/Form/World hierarchy to a presence-based social network.

It deliberately solves **trusted relationship state before realtime media**.

The first durable path is:

```text
Person A
  ↓ requests
Connection / US
  ↓ Person B accepts
Active relationship
  ↓ both have explicit permissions
Declared Presence
  ↓ COME NEAR
Near invitation
  ↓ mutual acceptance
Authorized NearSession
  ↓ next slice
Realtime voice/camera/Shared Reality transport
```

An accepted invitation does **not** mean camera or Shared Reality is connected. `NearSession.status = authorized` only means both participants agreed to attempt that level of interaction.

## Why this comes before WebRTC

The media layer needs a deterministic answer to:

- who is allowed to call whom,
- whether the relationship exists,
- whether both people accepted it,
- which media capabilities are allowed for each participant,
- whether presence is currently visible,
- whether a `COME NEAR` request was mutually accepted,
- which durable aggregate owns resulting events/history.

Building video first and consent later would create the wrong architecture.

## Domain states

### Connection

```text
pending → active → ended
             ↘ blocked (future safety path)
```

Only the invitee can accept/decline a pending relationship request.

The database uses a canonical `pair_key` so retries cannot create duplicate `US` relationships for the same two users.

### Presence

User-declared states:

```text
AWAY
  ↓
AROUND
  ↓
PRESENT
```

Mutual/session states:

```text
PRESENT
  ↓ mutual COME NEAR + actual transport
NEAR
  ↓ richer Shared Reality transport
TOGETHER
```

The public API in this slice refuses unilateral `near` or `together` declarations.

Presence is expiring. A client must renew it deliberately; stale presence must not become surveillance.

### Representation

```text
signal
voice
camera
shared_reality
```

Representation is bounded by both social state and relationship permissions.

Examples:

- `around` can only be an abstract signal.
- `near` may support voice/camera.
- `shared_reality` is only valid for `together`.

## Default relationship permissions

When a pending Connection is mutually accepted, both participants receive explicit relationship capability settings:

```text
sharePresence   true
voice           true
camera          true
sharedReality   true
aiMemory        false
privateMoments  true
matureThemes    false
sensitiveMedia  false
recording       ask_every_time
```

`camera/sharedReality = true` means this relationship may request that capability. It never bypasses OS permissions or per-session mutual acceptance and never auto-opens a camera.

AI memory, mature themes and sensitive media remain off by default.

## Tables

Migration: `packages/db/migrations/003_near_foundation.sql`

### `connections`

Persistent pair relationship aggregate.

### `connection_participants`

Membership and request direction (`initiator` / `invitee`).

### `connection_permissions`

Per-user permission boundary inside a Connection.

### `connection_presence`

Current expiring presence state for each participant in that relationship.

### `near_invites`

Idempotent `COME NEAR` requests with requested interaction level and expiry.

### `near_sessions`

Durable mutual authorization object. Media transport will later promote sessions through:

```text
authorized → connecting → connected → ended/failed
```

## API surface

### Relationship

`POST /v1/connections`

Request another user as a persistent Connection.

```json
{
  "otherUserId": "uuid",
  "clientRequestId": "uuid"
}
```

The canonical pair acts as a semantic idempotency boundary; retries return the existing relationship instead of duplicating it.

`GET /v1/connections`

Returns active/pending Connections plus only the other participant's currently permitted, non-expired presence.

`GET /v1/connections/:id`

Read one Connection if the caller is a participant.

`POST /v1/connections/:id/respond`

```json
{ "action": "accept" }
```

or decline.

### Permissions

`PATCH /v1/connections/:id/permissions`

Partial explicit updates. If a user disables presence or a capability currently being represented, their visible presence is degraded/ended rather than kept falsely active.

### Declared presence

`PUT /v1/connections/:id/presence`

```json
{
  "state": "around",
  "representation": "signal",
  "ttlSeconds": 1800
}
```

Unilateral `near` and `together` are rejected.

### COME NEAR

`POST /v1/connections/:id/near-invites`

```json
{
  "clientRequestId": "uuid",
  "level": "camera"
}
```

Levels:

- `voice`
- `camera`
- `shared_reality`

The route is independently rate-limited and requests expire quickly.

`GET /v1/near-invites/pending`

Inbox of current non-expired requests.

`POST /v1/near-invites/:id/respond`

```json
{ "action": "accept" }
```

Acceptance re-checks both participants' current permissions and creates an `authorized` NearSession.

`GET /v1/near-sessions/:id`

Participants can inspect the durable session authorization state.

## Domain events

This slice emits:

```text
connection.requested
connection.accepted
connection.declined
connection.permission_changed
presence.updated
presence.ended
near.invited
near.accepted
near.declined
```

The next transport slice should add events such as:

```text
near.connecting
near.connected
near.failed
near.ended
```

Only transport-confirmed state should generate `near.connected`.

## Security / privacy invariants

1. No Connection becomes active without the invitee accepting.
2. Only participants can read relationship state.
3. Only active participants can publish presence or request NEAR.
4. Presence expires.
5. The other person's presence is hidden if they disable presence sharing.
6. `near` and `together` cannot be declared unilaterally.
7. Both participants' current capability permissions are re-checked when a Near invitation is accepted.
8. AI memory is disabled by default.
9. Mature/sensitive media permissions are disabled by default.
10. Recording remains per-session consent, never silent persistence.

## What is intentionally not implemented here

- WebRTC/SFU signaling.
- Camera/mic transport.
- Shared Reality composition.
- Spatial audio.
- haptics.
- Places, Moments or new relationship Memories.
- Crew presence topology.
- Gatherings, Circles or Windows.
- blocking/reporting UI (must be added before broad rollout).

These are deferred because we first need trustworthy durable relationship state.

## Next implementation slice

### Slice 002 — NOW + transport handshake

1. Refactor mobile home into `NOW` with active Connections and expiring presence.
2. Show incoming Connection requests and Near invitations.
3. Add `COME NEAR` action.
4. Introduce provider-neutral realtime signaling interfaces.
5. Create server-authoritative NearSession transitions (`authorized → connecting → connected`).
6. Bind media tokens/rooms to an authorized Connection + NearSession.
7. Add end/disconnect handling and presence degradation.
8. Instrument invite acceptance, connection latency and session duration.

### Slice 003 — first perceptual NEAR experiment

Two phones, no full 3D dependency:

```text
segmented camera
+ same-frame composition
+ stable body scale
+ spatialized voice
+ one shared object
+ latency instrumentation
```

Primary experiment:

> Does this feel more like being together than a normal video call?

Do not expand to Gathering/creator/public discovery until this question has evidence.
