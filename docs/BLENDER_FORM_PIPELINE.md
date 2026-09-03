# Blender → SpotAI Form Pipeline

Blender is the authoring pipeline for persistent 3D manifestations. It is **not** a source of identity truth. Canonical archetype, level, progression, consent and entitlements come from SpotAI domain state.

## Runtime contract

Each reviewed Form level ships as:

```text
assets/forms/<form-level>/
  <form-level>.glb
  manifest.json
```

`manifest.json` is the bridge between deterministic Form state and `@form/world-runtime`. It identifies the asset, rig contract, animation actions, ability mappings and runtime metadata.

The client must obtain the allowed manifestation from canonical Form state. Swapping a local asset or manifest cannot award an archetype, evolution, World Mark or entitlement.

## Standard rig

Required armature: `FORM_RIG`.

Minimum required bones:

- `root`
- `hips`
- `head`
- `hand.L`
- `hand.R`

First action vocabulary:

- `idle`
- `move_left`
- `move_right`
- `duck`
- `jump`
- `point`
- `open_palm`
- `hands_together`

Keep names stable. Runtime code should map semantic actions to Blender actions rather than contain archetype-specific animation hacks.

## VECTOR I first

`VECTOR I` is the only production-quality Form required for the first realtime vertical slice.

Quality bar:

1. recognizable persistent silhouette,
2. optimized mobile mesh/materials/textures,
3. valid `FORM_RIG`,
4. idle and locomotion actions,
5. open-palm `VECTOR FIELD` action,
6. hands-together charge action,
7. VFX attachment anchors,
8. clean GLB export,
9. responsive performance on a mid-range phone,
10. same identity readable in reveal, World and Memory outputs.

Do not model every Form before this works.

## Export

```bash
blender vector.blend --background --python tools/blender/export_form.py -- \
  --archetype VECTOR \
  --level 1 \
  --output assets/forms/vector-i
```

The exporter validates required rig structure and emits the GLB/runtime manifest. Ability metadata must come from reviewed source data, not arbitrary model output.

## O asset

`O` is separate from Form identity. O is an intelligence/guide/world character.

The repository contains a procedural engineering starter:

```bash
blender --background --python tools/blender/generate_o.py -- \
  --output assets/o/o-rocky-v0.glb
```

The placeholder establishes scene/runtime anchors such as:

- `O_MATH_CORE_RING`
- `O_MATH_FX_ANCHOR`
- `O_INTERACTION_ANCHOR`

Production O still requires deliberate art direction, topology, materials, rigging, animation, sound and mobile optimization.

### O visual language

O should communicate through a coherent alien mathematical system rather than generic chatbot UI. Candidate visual primitives include vectors, deltas, sigma notation, geometric fields, orbit lines, topology-like surfaces and particle equations. These are creative language, not canonical identity calculations.

## AI boundary

AI may assist with concept exploration, texture ideation, animation reference, pose interpretation, scene planning, recap/reveal generation and bounded O dialogue.

AI must never silently change:

- Form archetype or level
- Trait Vector
- Crew membership
- participant consent
- payment/entitlement state
- World completion

The runtime receives a reviewed `FormAssetManifest` selected from canonical state.

## Realtime path

```text
chosen Life evidence
  → deterministic Form state
  → allowed FormAssetManifest
  → Blender-authored GLB
  → live camera pose landmarks
  → gesture detector
  → semantic body action
  → Form animation + ability
  → deterministic World reducer
  → completion event
  → Memory / durable history
```

## First World: SIGNAL ZERO

Target duration: approximately 45 seconds.

First interaction sequence:

1. camera establishes user pose,
2. `VECTOR I` activates,
3. open palm triggers Vector Field,
4. O responds with mathematical/VFX language,
5. hands together charges/finalizes the interaction,
6. deterministic World state reaches completion,
7. app creates a short Memory/reveal suitable for sharing.

World completion emits a normal SpotAI domain event. It cannot directly mutate Form identity.

## Performance rules

- Prefer baked animation and deterministic realtime VFX over per-frame generative rendering.
- Keep GLB/textures within an explicit mobile budget before adding detail.
- Use LOD or simplified manifestations if required.
- Expensive AI image/video generation belongs after the realtime interaction, for high-value Memory/reveal output.
- Never require Blender on the device; Blender is an offline/CI authoring tool.