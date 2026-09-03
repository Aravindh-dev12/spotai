# Blender → SpotAI Form Pipeline

Blender is an **authoring tool**, not a source of identity truth. A Form's archetype, level and progression remain controlled by the deterministic SpotAI domain engine. Blender supplies the persistent 3D manifestation: mesh, rig, materials, animations and VFX anchors.

## Contract

Each exported Form ships as:

```text
assets/forms/<form-level>/
  <form-level>.glb
  manifest.json
```

The manifest is consumed by `@form/world-runtime` and maps pose/body actions to Blender animation actions and Form abilities.

Required armature: `FORM_RIG`.

Required bones:

- `root`
- `hips`
- `head`
- `hand.L`
- `hand.R`

Supported first-pass Blender Action names:

- `idle`
- `move_left`
- `move_right`
- `duck`
- `jump`
- `point`
- `open_palm`
- `hands_together`

## Export

```bash
blender vector.blend --background --python tools/blender/export_form.py -- \
  --archetype VECTOR \
  --level 1 \
  --output assets/forms/vector-i
```

The script validates the rig, exports a GLB and emits the runtime manifest. Add ability metadata to the manifest after export or generate it from a reviewed source template.

## AI boundary

AI may help with concept art, texture ideation, animation references, scene planning and creative rendering. AI must not silently change a user's Form, level, entitlement or consent state. The runtime receives a known `FormAssetManifest` chosen from deterministic product state.

## Runtime path

```text
Life evidence
  → deterministic Form state
  → FormAssetManifest
  → GLB authored/exported from Blender
  → camera pose frame
  → gesture detector
  → animation + ability mapping
  → World state reducer
  → completion event
  → Life/Memory history
```

## First target

Build only `VECTOR I` first. Required quality bar:

1. rigged Blender model,
2. idle animation,
3. open-palm ability animation,
4. hands-together charge animation,
5. GLB export under mobile GPU budget,
6. 45-second `Signal Zero` encounter,
7. completion emits a normal SpotAI domain event rather than directly mutating Form.

Do not build six high-detail Forms before VECTOR I feels responsive on a mid-range phone.
