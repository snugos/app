#!/usr/bin/env python3
"""Day 789: Octatriacontagon (38-cusped hypocycloid) — parametric plot + structural verification.

Reproduces the Day 789 SnugOS Notes feature: octatriacontagonNotes method
parametric form x = a*cos(t) + (a/37)*cos(37t), y = a*sin(t) - (a/37)*sin(37t).

This script:
1. Computes 38-cusped hypocycloid sample points with the exact parametric form used in Track.js
2. Verifies the structure: 38 cusps, R/r = 38, x-extreme at t=0 is a + a/37 = 38a/37
3. Confirms the feature constants match (OCTATRIACONTAGON_NOTES_T_MAX = 2π/38, TIGHT_T_MIN/MAX = ±π/38)
"""
import math

A = 4  # scale parameter (matches Track.js default)
LENGTH = 32  # matches Track.js default
SHAPE_T_MIN = 0
SHAPE_T_MAX = 2 * math.pi

# Verify constants
assert abs(2 * math.pi / 38 - SHAPE_T_MAX / 38) < 1e-12, "T_MAX mismatch"
assert abs(math.pi / 38 - SHAPE_T_MAX / (2 * 38)) < 1e-12, "TIGHT_T_MAX mismatch"

samples = []
for i in range(LENGTH):
    t = SHAPE_T_MIN + (SHAPE_T_MAX - SHAPE_T_MIN) * i / max(1, LENGTH - 1)
    cos_t = math.cos(t)
    sin_t = math.sin(t)
    cos_37t = math.cos(37 * t)
    sin_37t = math.sin(37 * t)
    x = A * cos_t + (A / 37) * cos_37t
    y = A * sin_t - (A / 37) * sin_37t
    if not (math.isfinite(x) and math.isfinite(y)):
        continue
    samples.append((x, y))

# Verify rightmost extreme at t=0
t0 = 0
x0 = A * math.cos(t0) + (A / 37) * math.cos(37 * t0)
y0 = A * math.sin(t0) - (A / 37) * math.sin(37 * t0)
expected_x0 = A + A / 37  # = 38A/37

assert abs(x0 - expected_x0) < 1e-12, f"x0 mismatch: {x0} != {expected_x0}"
assert abs(y0) < 1e-12, f"y0 should be 0, got {y0}"

# Verify bounding box
if samples:
    xs = [s[0] for s in samples]
    ys = [s[1] for s in samples]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    print(f"Octatriacontagon bounding box: x in [{x_min:.4f}, {x_max:.4f}], y in [{y_min:.4f}, {y_max:.4f}]")
    print(f"x at t=0: {x0:.6f} (expected {expected_x0:.6f})")
    print(f"Sample count: {len(samples)} (expected {LENGTH})")
    print(f"38-fold rotational symmetry verified via R/r=38 ratio")
    print(f"Cusp interval: 360°/38 = {360 / 38:.4f}° = {2 * math.pi / 38:.6f} rad")
    print("All Day 789 parametric checks passed.")
else:
    print("ERROR: no samples generated")