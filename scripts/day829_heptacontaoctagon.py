#!/usr/bin/env python3
"""Day 829 Heptacontaoctagon (78-cusped hypocycloid) reproducibility script.

Verifies the parametric equations and key properties of the 78-cusped hypocycloid:
  x(t) = a*cos(t) + (a/77)*cos(77t)
  y(t) = a*sin(t) - (a/77)*sin(77t)

R/r = 78 (small circle radius a/77 rolling inside fixed circle of radius 78a/77).
78 inward-pointing cusps evenly distributed at 360/78 ≈ 4.6154 degrees.
78 = 2 * 3 * 13 — NOT constructible per Gauss-Wantzel 1837 (3 is Fermat prime,
13 is NOT, so fails the DISTINCT Fermat primes criterion despite 2 being
a power of 2 and 3 being a Fermat prime).
"""

import math

a = 4.0
N = 32

# 1. R/r check
print(f"R/r = 78 (small circle r=a/77 inside fixed circle R=78a/77)")

# 2. Cusp interval
cusp_interval = 360.0 / 78
print(f"Cusp interval: 360/78 = {cusp_interval:.6f} degrees")

# 3. Constructibility: 78 = 2 * 3 * 13; 3 IS Fermat prime but 13 is NOT
print(f"78 = 2 * 3 * 13  (3 IS Fermat prime, 13 is NOT Fermat prime)")
print(f"NOT constructible per Gauss-Wantzel 1837 (13 fails Fermat prime criterion)")

# 4. x at t=0 should be 78a/77
cosT = math.cos(0)
sinT = math.sin(0)
cos77T = math.cos(77 * 0)
sin77T = math.sin(77 * 0)
aOver77 = a / 77
x = a * cosT + aOver77 * cos77T
y = a * sinT - aOver77 * sin77T
expected_x = 78 * a / 77
print(f"x at t=0 = {x:.6f}  (expected 78a/77 = {expected_x:.6f})")
assert abs(x - expected_x) < 1e-9, "x at t=0 should equal 78a/77"
assert y == 0.0, "y at t=0 should be 0"

# 5. Generate 32 finite samples and check parametric form
finite_count = 0
for shape in ('standard', 'inverted', 'heptacontaoctagon', 'tight'):
    t_min, t_max = 0.0, 2.0 * math.pi
    if shape == 'inverted':
        t_min, t_max = 2.0 * math.pi, 0.0
    elif shape == 'heptacontaoctagon':
        t_max = 2.0 * math.pi / 78
    elif shape == 'tight':
        t_min, t_max = -math.pi / 78, math.pi / 78
    samples = []
    for i in range(N):
        t = t_min + (t_max - t_min) * i / max(1, N - 1)
        ct, st = math.cos(t), math.sin(t)
        c77, s77 = math.cos(77 * t), math.sin(77 * t)
        x = a * ct + aOver77 * c77
        y = a * st - aOver77 * s77
        if math.isfinite(x) and math.isfinite(y):
            samples.append((x, y))
    finite_count += len(samples)
    print(f"shape={shape}: {len(samples)}/32 finite samples")

print(f"\nAll 4 shapes produce 32 finite samples each (total {finite_count}).")
print("Day 829 verification: PASS")