"""Export a SpotAI Form from Blender to a runtime-ready GLB + manifest.

Run from Blender:
  blender my_form.blend --background --python tools/blender/export_form.py -- \
    --archetype VECTOR --level 1 --output assets/forms/vector-i

The .blend file must contain one armature named FORM_RIG and actions matching
SpotAI body-action names. This script intentionally keeps identity/progression
outside Blender: Blender authors appearance and animation only.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import bpy

REQUIRED_BONES = {
    "root": "root",
    "hips": "hips",
    "head": "head",
    "leftHand": "hand.L",
    "rightHand": "hand.R",
}
SUPPORTED_ACTIONS = {
    "idle",
    "move_left",
    "move_right",
    "duck",
    "jump",
    "point",
    "open_palm",
    "hands_together",
}


def args_after_double_dash() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archetype", required=True, choices=["VECTOR", "ECHO", "FORGE", "ORBIT", "PULSE", "HAVEN"])
    parser.add_argument("--level", type=int, default=1)
    parser.add_argument("--output", required=True)
    parser.add_argument("--armature", default="FORM_RIG")
    return parser.parse_args(args_after_double_dash())


def validate_rig(armature_name: str) -> bpy.types.Object:
    obj = bpy.data.objects.get(armature_name)
    if obj is None or obj.type != "ARMATURE":
        raise RuntimeError(f"Required armature '{armature_name}' was not found")
    bone_names = {bone.name for bone in obj.data.bones}
    missing = [name for name in REQUIRED_BONES.values() if name not in bone_names]
    if missing:
        raise RuntimeError(f"Missing required bones: {', '.join(missing)}")
    return obj


def export_glb(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_apply=False,
    )


def main() -> None:
    args = parse_args()
    validate_rig(args.armature)
    actions = {action.name for action in bpy.data.actions}
    animation_map = {name: name for name in sorted(actions & SUPPORTED_ACTIONS)}

    out_dir = os.path.abspath(args.output)
    slug = f"{args.archetype.lower()}-{args.level}"
    glb_path = os.path.join(out_dir, f"{slug}.glb")
    manifest_path = os.path.join(out_dir, "manifest.json")
    export_glb(glb_path)

    manifest = {
        "schemaVersion": 1,
        "archetype": args.archetype,
        "level": args.level,
        "glb": f"./{slug}.glb",
        "rig": {
            "armature": args.armature,
            "rootBone": REQUIRED_BONES["root"],
            "hipsBone": REQUIRED_BONES["hips"],
            "headBone": REQUIRED_BONES["head"],
            "leftHandBone": REQUIRED_BONES["leftHand"],
            "rightHandBone": REQUIRED_BONES["rightHand"],
        },
        "animations": animation_map,
        "abilities": [],
    }
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")

    print(f"SpotAI Form exported: {glb_path}")
    print(f"Manifest exported: {manifest_path}")


if __name__ == "__main__":
    main()
