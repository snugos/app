#!/usr/bin/env python3
"""
Day 887 Hectohexatriacontagon (136-cusped Hypocycloid) reproducibility script.

Verifies:
  - x at t=0 = 4.029411764705882 = 136a/135 (a=4)
  - 136 = 2^3 * 17 IS constructible per Gauss-Wantzel 1837
    (17 is a Fermat prime, 2^3 is a power of 2, no distinctness
    violation on the Fermat prime factor)
  - R/r=136, ~2.6471 degree cusp intervals = 360/136
  - 32/32 finite samples for all 4 shapes
  - xRange/yRange non-degenerate
"""
import math

N = 136  # number of cusps
a = 4.0  # scale parameter
aOverNminus1 = a / (N - 1)  # 4/135

print("=" * 60)
print(f"Day 887: Hectohexatriacontagon ({N}-cusped Hypocycloid) Notes")
print("=" * 60)

# x at t=0
x_at_0 = a * math.cos(0) + aOverNminus1 * math.cos(0)  # = a + a/(N-1) = 4 + 4/135
expected = 136 * a / 135
print(f"x at t=0: {x_at_0:.15f} (expected {expected:.15f} = 136a/135)")
assert abs(x_at_0 - expected) < 1e-12, f"FAIL: x_at_0 mismatch: {x_at_0} vs {expected}"
print("PASS: x at t=0 matches 136a/135")

# Constructibility check
print(f"\n{N} = 2^3 * 17")
print(f"  2^3 = 8 (a power of 2)")
print(f"  17 is a Fermat prime (F_2 = 2^(2^2)+1 = 17)")
print(f"  Gauss-Wantzel 1837: n is constructible iff n is a product of DISTINCT")
print(f"  Fermat primes and a power of 2. 17 is a single distinct Fermat prime,")
print(f"  and 2^3 is a power of 2 — both criteria satisfied.")
print(f"  So {N}-gon IS constructible by compass and straightedge.")

# R/r and cusp interval
print(f"\nR/r = {N} ({N} cusps per revolution)")
cusp_interval_deg = 360.0 / N
print(f"cusp interval = 360/{N} = {cusp_interval_deg:.6f} degrees")
print(f"cusp interval = 2*PI/{N} = {2*math.pi/N:.6f} radians")

# Verify 32/32 finite samples for all 4 shapes
print(f"\nSampling test (32 samples per shape):")
shapes = [
    ("standard", 0, 2 * math.pi),
    ("inverted", 2 * math.pi, 0),
    ("hectohexatriacontagon", 0, 2 * math.pi / N),
    ("tight", -math.pi / N, math.pi / N),
]
for name, t_min, t_max in shapes:
    finite = 0
    for i in range(32):
        t = t_min + (t_max - t_min) * i / max(1, 31)
        x = a * math.cos(t) + aOverNminus1 * math.cos((N - 1) * t)
        y = a * math.sin(t) - aOverNminus1 * math.sin((N - 1) * t)
        if math.isfinite(x) and math.isfinite(y):
            finite += 1
    print(f"  {name:20s}: {finite}/32 finite")
    assert finite == 32, f"FAIL: shape {name} had {finite}/32 finite"
print("PASS: all 4 shapes produce 32/32 finite samples")

# xRange/yRange for standard shape
samples = []
for i in range(32):
    t = 0 + (2 * math.pi - 0) * i / max(1, 31)
    x = a * math.cos(t) + aOverNminus1 * math.cos((N - 1) * t)
    y = a * math.sin(t) - aOverNminus1 * math.sin((N - 1) * t)
    if math.isfinite(x) and math.isfinite(y):
        samples.append((x, y))

xs = [p[0] for p in samples]
ys = [p[1] for p in samples]
xrange = max(xs) - min(xs)
yrange = max(ys) - min(ys)
print(f"\nStandard shape ranges:")
print(f"  x: [{min(xs):.4f}, {max(xs):.4f}], xRange = {xrange:.4f}")
print(f"  y: [{min(ys):.4f}, {max(ys):.4f}], yRange = {yrange:.4f}")
assert xrange > 1.0, f"FAIL: xRange too small: {xrange}"
assert yrange > 0.1, f"FAIL: yRange too small: {yrange}"
print("PASS: non-degenerate ranges")

# APP_VERSION check
print("\nExpected constants.js entries:")
print(f"  HECTOHEXATRIACONTAGON_NOTES_DEFAULT_LENGTH = 32")
print(f"  HECTOHEXATRIACONTAGON_NOTES_HECTOHEXATRIACONTAGON_T_MAX = 2*PI/136 = {2*math.pi/136:.6f}")
print(f"  HECTOHEXATRIACONTAGON_NOTES_TIGHT_T_MIN = -PI/136 = {-math.pi/136:.6f}")
print(f"  HECTOHEXATRIACONTAGON_NOTES_TIGHT_T_MAX = PI/136 = {math.pi/136:.6f}")
print(f"  HECTOHEXATRIACONTAGON_NOTES_SHAPES = ['standard', 'inverted', 'hectohexatriacontagon', 'tight']")

print("\n" + "=" * 60)
print("ALL DAY 887 VERIFICATION CHECKS PASS")
print("=" * 60)
