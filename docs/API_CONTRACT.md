# Phase 1 API contract

The current Fastify implementation only exposes development previews. Production endpoints should follow these resource boundaries.

- `POST /v1/seasons` — start a season.
- `POST /v1/life-modes` — create the current direction.
- `POST /v1/life-signals` — submit a chosen moment; enqueue classification.
- `DELETE /v1/life-signals/:id` — remove evidence and trigger deterministic recomputation.
- `GET /v1/form` — current trait vector, awakening progress, archetype and reasons.
- `GET /v1/form/history` — previous season states and evolutions.
- `POST /v1/crews` — create a Crew.
- `POST /v1/crews/:id/invites` — create relationship-scoped invite.
- `POST /v1/crews/:id/join` — join using invite token.
- `POST /v1/media/upload-intents` — issue short-lived upload intent and consent scope.
- `POST /v1/reveals` — enqueue a consent-checked Form reveal.
- `GET /v1/seasons/:id/recap` — computed season summary.

Write endpoints must be idempotent where retries can occur. The API must never accept a client-supplied final trait vector or archetype.
