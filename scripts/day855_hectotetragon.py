#!/usr/bin/env python3
"""Day 855: Hectotetragon (104-cusped Hypocycloid) Notes - Reproducibility script.

Verifies the parametric equations for the hectotetragon hypocycloid:
  x(t) = a*cos(t) + (a/103)*cos(103t)
  y(t) = a*sin(t) - (a/103)*sin(103t)
"""
import math

N = 104  # 104-cusped hypocycloid (hectotetragon)
a = 4    # scale (matches DEFAULT_A in constants.js)

print(f"=== Day 855: Hectotetragon ({N}-cusped Hypocycloid) Notes ===\n")

# Verify cusp count
R_over_r = N  # 104-fold R/r ratio
cusp_interval_deg = 360.0 / N
print(f"Number of cusps: {N}")
print(f"R/r ratio: {R_over_r}")
print(f"Cusp interval: {cusp_interval_deg:.6f} degrees = 2*pi/{N}")
print(f"Constructibility (Gauss-Wantzel 1837):")
print(f"  {N} = 2^3 * 13")
print(f"  2 is a power of 2 (allowed), but 13 is prime but NOT a Fermat prime")
print(f"  Fermat primes are 3, 5, 17, 257, 65537; 13 is NOT in that set")
print(f"  -> {N} = 2^3 * 13 is NOT constructible by compass and straightedge")
print()

# Verify x at t=0
t = 0.0
x_t0 = a * math.cos(t) + (a / (N - 1)) * math.cos((N - 1) * t)
print(f"x at t=0: {x_t0:.6f}  (expected {N * a / (N - 1):.6f} = {N}a/{N-1})")
print(f"   -> {N}*{a}/{N-1} = {N * a / (N - 1):.6f}")
print()

# Compute finite samples for all 4 shapes
shapes = {
    "standard":   (0.0, 2 * math.pi),
    "inverted":   (2 * math.pi, 0.0),
    "hectotetragon": (0.0, 2 * math.pi / N),
    "tight":      (-math.pi / N, math.pi / N),
}

length = 32  # matches DEFAULT_LENGTH
for shape_name, (t_min, t_max) in shapes.items():
    samples = []
    for i in range(length):
        t = t_min + (t_max - t_min) * i / max(1, length - 1)
        cos_t = math.cos(t)
        sin_t = math.sin(t)
        cos_nt = math.cos((N - 1) * t)
        sin_nt = math.sin((N - 1) * t)
        x = a * cos_t + (a / (N - 1)) * cos_nt
        y = a * sin_t - (a / (N - 1)) * sin_nt
        if math.isfinite(x) and math.isfinite(y):
            samples.append((x, y))
    finite_count = len(samples)
    if samples:
        xs = [p[0] for p in samples]
        ys = [p[1] for p in samples]
        x_range = max(xs) - min(xs)
        y_range = max(ys) - min(ys)
    else:
        x_range = y_range = 0
    print(f"Shape '{shape_name}': t range [{t_min:.6f}, {t_max:.6f}]")
    print(f"  Finite samples: {finite_count}/{length}")
    print(f"  xRange: {x_range:.4f}, yRange: {y_range:.4f}")
    print()
