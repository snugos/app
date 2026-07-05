#!/usr/bin/env python3
"""Day 877 reproducibility: Hectoicosikaihexagon (126-cusped Hypocycloid) Notes.

Parametric hypocycloid equations:
  x(t) = a*cos(t) + (a/125)*cos(125t)
  y(t) = a*sin(t) - (a/125)*sin(125t)

R = 126a/125, r = a/125, R/r = 126 (126 cusps per revolution).
126 = 2 * 3^2 * 7, NOT constructible per Gauss-Wantzel 1837:
  - 2 is a power of 2 (good)
  - 3 is a Fermat prime but appears with multiplicity 2 in 3^2 (fails distinctness)
  - 7 is prime but NOT a Fermat prime (fails distinctness)
"""

import math

N = 126  # number of cusps
a = 4    # scale
length = 32
PI2 = 2 * math.pi

t_max = PI2 / N  # HECTOICOSIKAIHEXAGON_NOTES_HECTOICOSIKAIHEXAGON_T_MAX
print(f"HECTOICOSIKAIHEXAGON_NOTES_HECTOICOSIKAIHEXAGON_T_MAX = 2*PI/126 = {t_max:.6f}")
print(f"R/r = {N} (since aOver125 = a/125, so R = 126a/125)")
print(f"Cusp interval: 360/{N} = {360/N:.4f} degrees")

t_min = 0
samples = []
for i in range(length):
    t = t_min + (t_max - t_min) * i / max(1, length - 1)
    cosT = math.cos(t)
    sinT = math.sin(t)
    cosNT = math.cos((N - 1) * t)
    sinNT = math.sin((N - 1) * t)
    aOver = a / (N - 1)
    x = a * cosT + aOver * cosNT
    y = a * sinT - aOver * sinNT
    if math.isfinite(x) and math.isfinite(y):
        samples.append((x, y))

print(f"All {len(samples)} samples finite: {len(samples) == length}")
xs = [p[0] for p in samples]
ys = [p[1] for p in samples]
print(f"x range: {min(xs):.4f} to {max(xs):.4f} xRange: {max(xs) - min(xs):.4f}")
print(f"y range: {min(ys):.4f} to {max(ys):.4f} yRange: {max(ys) - min(ys):.4f}")
print(f"At t=0: x = {samples[0][0]:.6f} (expected {N*a/(N-1):.6f} = {N}a/{N-1})")
print(f"At t=tMax: x = {samples[-1][0]:.6f}")

# Verify constructibility (NOT constructible)
print(f"{N} = 2 * 3^2 * 7, NOT constructible per Gauss-Wantzel 1837")
print(f"  - 2 is a power of 2 (good)")
print(f"  - 3 is a Fermat prime but 3^2 has 3 with multiplicity 2 (fails distinctness)")
print(f"  - 7 is prime but NOT a Fermat prime (fails distinctness)")
