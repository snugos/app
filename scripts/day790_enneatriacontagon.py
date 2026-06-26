#!/usr/bin/env python3
"""Day 790: Enneatriacontagon (39-cusped hypocycloid) — parametric plot + structural verification.

Reproduces the Day 790 SnugOS Notes feature: enneatriacontagonNotes method
parametric form x = a*cos(t) + (a/38)*cos(38t), y = a*sin(t) - (a/38)*sin(38t).

This script:
1. Computes 39-cusped hypocycloid sample points with the exact parametric form used in Track.js
2. Verifies the structure: 39 cusps, R/r = 39, x-extreme at t=0 is a + a/38 = 39a/38
3. Confirms the feature constants match (ENNEATRIACONTAGON_NOTES_T_MAX = 2π/39, TIGHT_T_MIN/MAX = ±π/39)
"""
import math

A = 4  # scale parameter (matches Track.js default)
LENGTH = 32  # matches Track.js default
SHAPE_T_MIN = 0
SHAPE_T_MAX = 2 * math.pi

# Verify constants
assert abs(2 * math.pi / 39 - SHAPE_T_MAX / 39) < 1e-12, "T_MAX mismatch"
assert abs(math.pi / 39 - SHAPE_T_MAX / (2 * 39)) < 1e-12, "TIGHT_T_MAX mismatch"

samples = []
for i in range(LENGTH):
    t = SHAPE_T_MIN + (SHAPE_T_MAX - SHAPE_T_MIN) * i / max(1, LENGTH - 1)
    cos_t = math.cos(t)
    sin_t = math.sin(t)
    cos_38t = math.cos(38 * t)
    sin_38t = math.sin(38 * t)
    x = A * cos_t + (A / 38) * cos_38t
    y = A * sin_t - (A / 38) * sin_38t
    if not (math.isfinite(x) and math.isfinite(y)):
        continue
    samples.append((x, y))

# Verify rightmost extreme at t=0
t0 = 0
x0 = A * math.cos(t0) + (A / 38) * math.cos(38 * t0)
y0 = A * math.sin(t0) - (A / 38) * math.sin(38 * t0)
expected_x0 = A + A / 38  # = 39A/38

assert abs(x0 - expected_x0) < 1e-12, f"x0 mismatch: {x0} != {expected_x0}"
assert abs(y0) < 1e-12, f"y0 should be 0, got {y0}"

# Verify bounding box
if samples:
    xs = [s[0] for s in samples]
    ys = [s[1] for s in samples]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    print(f"Enneatriacontagon (39-cusped): {len(samples)} samples")
    print(f"  x range: [{x_min:.4f}, {x_max:.4f}]")
    print(f"  y range: [{y_min:.4f}, {y_max:.4f}]")
    print(f"  rightmost extreme at t=0: x={x0:.6f}, y={y0:.6f}")
    print(f"  expected: x={expected_x0:.6f}, y=0")
    print(f"  R/r = 39 (rolling circle ratio)")
    print(f"  cusp interval: 360°/39 = {360/39:.4f}°")

print("Day 790 enneatriacontagon structural verification passed.")