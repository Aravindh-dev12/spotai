"""Generate a procedural first-pass SpotAI O asset in Blender.

This is intentionally a starter, not final art direction. It gives engineering a
repeatable GLB for camera/world integration while the production O model is art-directed.

Run:
  blender --background --python tools/blender/generate_o.py -- --output assets/o/o-rocky-v0.glb
"""
from __future__ import annotations

import argparse
import math
import os
import sys

import bpy


def cli() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="assets/o/o-rocky-v0.glb")
    return parser.parse_args(argv)


def material(name: str, rgba: tuple[float, float, float, float], roughness: float = 0.85):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.roughness = roughness
    return mat


def add_rock(name: str, location: tuple[float, float, float], scale: tuple[float, float, float], mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("SoftRockEdges", "BEVEL")
    bevel.width = 0.055
    bevel.segments = 2
    return obj


def add_eye(name: str, location: tuple[float, float, float], scale: tuple[float, float, float], mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    return obj


def main() -> None:
    args = cli()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    stone = material("O_STONE", (0.19, 0.19, 0.20, 1.0), 0.96)
    stone_light = material("O_STONE_LIGHT", (0.28, 0.28, 0.30, 1.0), 0.92)
    eye = material("O_EYE", (0.82, 0.94, 1.0, 1.0), 0.25)
    core = material("O_CORE", (0.55, 0.72, 0.78, 1.0), 0.4)

    add_rock("O_BODY", (0, 0, 1.05), (0.72, 0.55, 0.88), stone)
    add_rock("O_HEAD", (0, -0.02, 1.88), (0.58, 0.50, 0.48), stone_light)
    add_rock("O_ARM_L", (-0.70, 0, 1.12), (0.18, 0.18, 0.52), stone)
    add_rock("O_ARM_R", (0.70, 0, 1.12), (0.18, 0.18, 0.52), stone)
    add_rock("O_FOOT_L", (-0.30, 0.03, 0.22), (0.28, 0.38, 0.20), stone)
    add_rock("O_FOOT_R", (0.30, 0.03, 0.22), (0.28, 0.38, 0.20), stone)

    add_eye("O_EYE_L", (-0.20, -0.46, 1.95), (0.10, 0.055, 0.13), eye)
    add_eye("O_EYE_R", (0.20, -0.46, 1.95), (0.10, 0.055, 0.13), eye)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.018, major_segments=64, minor_segments=8, location=(0, 0, 1.06), rotation=(math.pi / 2, 0, 0))
    ring = bpy.context.object
    ring.name = "O_MATH_CORE_RING"
    ring.data.materials.append(core)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 2.45))
    anchor = bpy.context.object
    anchor.name = "O_MATH_FX_ANCHOR"

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 1.1))
    interaction = bpy.context.object
    interaction.name = "O_INTERACTION_ANCHOR"

    out = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True)
    print(f"Generated O starter GLB: {out}")


if __name__ == "__main__":
    main()
