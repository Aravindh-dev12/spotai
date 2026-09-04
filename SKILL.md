# SpotAI Repository Skill Guide — Living Social / NEAR

## Purpose

`SpotAI` is a working codename for a **presence-based social network**.

The product thesis is:

> Traditional social networks connect people to people's content. We are building technology that helps people feel socially present with each other.

The primary durable object is the **relationship**, not the post, feed, game, World, avatar, or AI assistant.

The emotional objective is **NEAR**:

> Reduce perceived digital distance between real humans while preserving consent and boundaries.

## Production mandate

This repository is not disposable prototyping. Experiments may be narrow, but validated experiences must be promotable without a rewrite.

Production-oriented engineering requires:

- validated runtime configuration and secure secret handling,
- real authentication and authorization boundaries,
- rate limiting and abuse controls,
- durable MySQL source-of-truth state,
- Redis/BullMQ only for coordination and jobs,
- idempotent/retry-safe writes where retries are realistic,
- explicit media/presence/recording consent,
- health and readiness checks,
- graceful shutdown,
- observability and testability,
- privacy and deletion/revocation design,
- mobile latency/battery/network budgets.

Never describe unfinished code as production-ready merely because infrastructure exists.

## Product hierarchy

Preserve this hierarchy in new code and UX:

1. **Person** — a real human account.
2. **Connection / US** — a persistent relationship between two people.
3. **Crew** — a persistent small-group relationship with history that belongs to the group.
4. **Presence** — a user-controlled realtime declaration of availability/social distance.
5. **NEAR** — a mutually accepted attempt to reduce social distance through voice/camera/Shared Reality.
6. **Place** — persistent spatial expression of a Connection or Crew, accumulated from authentic shared history.
7. **Moment** — evidence of a real shared experience.
8. **Memory** — durable, permissioned relationship/group history.
9. **Gathering** — temporary multi-person social presence with fluid conversational topology.
10. **Circle** — one-to-many creator/community relationship with explicit access levels.
11. **Window** — discovery into a live or warm social situation, not an infinite content feed.

Underlying technology:

- **Presence Engine** — who is here and at what user-controlled distance.
- **Space Engine** — coherent spatial interpretation across devices.
- **Relationship Engine** — membership, permissions, ownership, boundaries and persistence.
- **Memory Engine** — authentic mutually permitted history.
- **AI Director** — bounded perception/semantic assistance; humans remain foreground.

## Core loop

The primary social loop is:

`SEE WHO IS HERE → COME NEAR → EXPERIENCE TOGETHER → LEAVE A TRACE → RETURN TO THE RELATIONSHIP`

Discovery later extends the loop:

`WINDOW → GATHERING → ENCOUNTER → CONNECTION/CREW → NEAR → SHARED HISTORY`

A feature should strengthen this loop without turning the product into a feed, game, or generic AI wrapper.

## Social-distance model

Presence is not an inferred intimacy score. It is user-controlled realtime state:

`AWAY → AROUND → PRESENT → NEAR → TOGETHER`

Important rules:

- `AWAY`, `AROUND`, and `PRESENT` may be declared unilaterally according to permissions.
- `NEAR` and `TOGETHER` require mutual interaction/session state.
- AI must never infer or publish a friendship/intimacy/romantic compatibility score.
- Presence must expire automatically unless deliberately renewed.
- Users need an equally easy way to restore distance as to reduce it.

## NEAR protocol

Internally, NEAR answers:

1. Who is here?
2. Where are they socially/spatially?
3. Who is near whom?
4. What are people jointly attending to?
5. What are they experiencing together?
6. What is permitted to survive after they leave?

An accepted `COME NEAR` invitation authorizes an attempt. Do not mark camera/Shared Reality as connected until realtime media transport actually establishes it.

## Shared Reality

The goal is not a better video-call grid.

The phone camera is treated as a **presence sensor** and rendering source. Over time the system may use:

- person segmentation,
- body/hand pose,
- rough depth and surfaces,
- stable body scale,
- spatial voice placement,
- shared objects and coordinates,
- gaze/attention cues where reliable and consented,
- synchronized haptics,
- cross-modal coherence.

Prioritize social fidelity over pixel fidelity:

`correct timing + scale + position + voice origin + shared attention + body continuity`

before expensive photorealistic room reconstruction.

Do not make Gaussian splatting, full 3D reconstruction, headset hardware, or neural avatars a V1 dependency.

## Relationship consent and permissions

A Connection must be accepted by the other participant before becoming active.

Per-participant relationship permissions include at minimum:

- presence visibility,
- voice,
- camera,
- Shared Reality,
- AI memory,
- private Moments,
- mature themes,
- sensitive media,
- recording policy.

Defaults must keep AI memory, mature themes and sensitive media off. Recording must never silently start; support `never` or explicit per-session consent.

Blocking, revocation and safety must override relationship persistence.

## Shared memory ownership

The semantic owner of a Memory may be `US` or a Crew, but safety rights remain individual.

Do not implement “both people must approve deletion forever.” Use:

- semantic relationship ownership,
- contribution ownership,
- participant visibility,
- participant revocation,
- group retention rules,
- safety/legal override.

AI can dramatize/reconstruct presentation of authentic approved history. It must not fabricate shared history and present it as real.

## Groups

Crew and Gathering are not “video calls with more tiles.”

Group architecture should eventually model:

- stable social position,
- proximity-dependent media fidelity,
- conversational clusters,
- shared attention,
- arrival/departure,
- temporary Focus,
- perspective-specific Afterglow,
- group-owned Memories/objects,
- conversion from temporary encounter to persistent Connection/Crew.

Never default to a 30-person camera grid.

For large groups, bandwidth should follow social distance: far participants are abstract/low-bandwidth; active nearby conversations receive rich media.

## Creator / Circle direction

Circle is a later one-to-many relationship object.

The monetization primitive is **defined access + presence + shared experience**, not merely paywalled files.

Creators may have public/member/near/private access tiers, but boundaries must be explicit. AI-generated or AI-personalized creator media must be clearly identified and authorized. Never fabricate personal affection or pretend a creator personally performed an AI-generated interaction.

Mature adult expression may exist only within law/platform/payment/safety constraints and must not define the mainstream network.

## Window / discovery direction

Do not build an Instagram/TikTok feed.

A Window should answer:

> Where is socially meaningful human activity happening?

rather than:

> What video should I watch next?

Discovery should recommend social possibilities using allowed signals such as existing relationships, friend-of-friend paths, declared interests, trusted communities, Circles and active Gatherings. Avoid inferred sensitive traits and manipulative intimacy optimization.

## AI boundaries

AI may help with:

- on-device human/environment perception,
- segmentation/depth/pose/gesture interpretation,
- spatial composition,
- shared-object reference,
- language translation,
- semantic retrieval of approved Memories,
- optional recaps,
- bounded social suggestions/introductions,
- creative environment construction from authentic history,
- trust/safety assistance under policy controls.

AI must not be final authority for:

- relationship meaning,
- relationship membership,
- consent,
- presence permission,
- recording permission,
- mature/sensitive-media permission,
- entitlement/payment,
- irreversible moderation,
- claims about a user's emotions, attraction, mental health or sensitive identity.

Realtime social direction should primarily use deterministic participant/media/permission/network state. Do not run an LLM continuously as the realtime social director.

## Data architecture

Use a relational source of truth. Do not introduce Neo4j prematurely.

Canonical state belongs in MySQL:

- users,
- Connections and participants,
- relationship permissions,
- current/expiring presence,
- NEAR invitations/sessions,
- Crews,
- Moments/Memories,
- Places,
- later Gatherings/Circles.

Persist meaningful domain events for auditability and product learning.

Near-term events include:

- `connection.requested`
- `connection.accepted`
- `connection.declined`
- `connection.blocked`
- `connection.permission_changed`
- `presence.updated`
- `presence.ended`
- `near.invited`
- `near.accepted`
- `near.declined`
- `near.session_authorized`
- later `near.connected` / `near.ended`
- `moment.created`
- `memory.saved`
- `memory.removed`

## Current build order

1. Verify build/typecheck/tests/CI and keep production runtime guardrails intact.
2. Durable Connection/US request + acceptance + membership authorization.
3. Per-participant relationship permissions and revocation-safe boundaries.
4. Expiring declared Presence (`away/around/present`).
5. Idempotent `COME NEAR` invitation + mutual acceptance + durable NearSession authorization.
6. Refactor mobile home from Form-centric UI to **NOW / people / presence**.
7. Realtime media signaling and transport for two people; never mark media connected before transport confirms it.
8. Spatial audio + adaptive bitrate + latency instrumentation.
9. Same-frame segmented composition with stable scale as the first Shared Reality experiment.
10. One shared object/reference interaction.
11. One synchronized gesture/haptic experiment.
12. Measure perceived co-presence, repeat pair sessions and comfortable silence against normal video calling.
13. Persistent Connection Place + opt-in Presence residue.
14. Moment/Memory relationship ownership and revocation.
15. Crew 3–6 person presence, group-owned history and natural clusters.
16. Gathering after small-group NEAR is proven.
17. Circle/creator access after core relationship retention.
18. Window/Social Gravity only after enough live social density exists.
19. Hybrid physical/remote and glasses/spatial-device surfaces later.

## Explicitly deferred / legacy

The existing Life Mode, Trait, Form, Season, Blender manifestation and World Runtime code is legacy/non-priority while the product pivots to Living Social. Do not delete it casually; migrate or retire it deliberately after the NEAR foundation proves itself.

Do not continue early investment in:

- gameplay, quests, points or levels,
- body-action gameplay,
- broad Worlds/metaverse content,
- generic public feeds/Reels clones,
- open random stranger camera,
- food/health super-app expansion,
- creator marketplaces before relationship retention,
- mass recommendation infrastructure before social density.

`Form` may later survive as visual expression of a person across relationships, but it is not the primary product object.

## Build test

Before implementing a feature ask:

1. Does this reduce social distance or improve relationship continuity?
2. Does it preserve user control and an easy Boundary/exit?
3. Is mutual consent required where intimacy increases?
4. Does durable state belong to the correct Person/US/Crew aggregate?
5. Is AI capability rather than authority?
6. Are retries/idempotency/authorization defined?
7. Does the state honestly reflect what the realtime system has actually established?
8. Can it work under mobile latency, battery and bandwidth constraints?
9. Can we measure whether people feel more present and return to the same relationship?
10. Are privacy, blocking, revocation and abuse cases designed before scale?

See `docs/NEAR_FOUNDATION.md` for the current implementation slice. Existing legacy architecture documents remain useful for infrastructure/history but are not authoritative for new product direction where they conflict with this guide.
