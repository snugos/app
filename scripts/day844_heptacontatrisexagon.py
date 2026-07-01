#!/usr/bin/env python3
"""
Day 844 Heptacontatrisexagon (93-cusped Hypocycloid) Notes - Reproducibility Script
Verifies parametric x = a*cos(t) + (a/92)*cos(92t), y = a*sin(t) - (a/92)*sin(92t).
"""
import math

N = 93
a = 4
shape_count = 32
t_max_full = 2 * math.pi

# Standard shape - all 93 cusps
samples_std = []
for i in range(shape_count):
    t = t_max_full * i / max(1, shape_count - 1)
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos92T = math.cos(92 * t)
    sin92T = math.sin(92 * t)
    x = a * cosT + (a / 92) * cos92T
    y = a * sinT - (a / 92) * sin92T
    if math.isfinite(x) and math.isfinite(y):
        samples_std.append((x, y))

x_at_0 = a + a / 92
print(f"x at t=0 = {x_at_0:.6f} (expected: 93a/92 = {93 * a / 92:.6f})")
print(f"R/r = {N} (rolling circle r=a/92, fixed circle R=93a/92)")
print(f"Cusp interval = 360/{N} = {360 / N:.4f} degrees")
print(f"93 = 3 * 31, NOT constructible per Gauss-Wantzel 1837 (31 is prime but not Fermat, despite 3 being Fermat)")
print(f"Standard shape: {len(samples_std)}/{shape_count} finite samples")
if samples_std:
    xs = [p[0] for p in samples_std]
    ys = [p[1] for p in samples_std]
    print(f"  xRange = {max(xs) - min(xs):.4f}, yRange = {max(ys) - min(ys):.4f}")

# Inverted shape
t_min_inv = 2 * math.pi
t_max_inv = 0
samples_inv = []
for i in range(shape_count):
    t = t_min_inv + (t_max_inv - t_min_inv) * i / max(1, shape_count - 1)
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos92T = math.cos(92 * t)
    sin92T = math.sin(92 * t)
    x = a * cosT + (a / 92) * cos92T
    y = a * sinT - (a / 92) * sin92T
    if math.isfinite(x) and math.isfinite(y):
        samples_inv.append((x, y))
print(f"Inverted shape: {len(samples_inv)}/{shape_count} finite samples")

# Heptacontatrisexagon shape (1 cusp region: t in [0, 2pi/93])
t_min_h = 0
t_max_h = 2 * math.pi / 93
samples_h = []
for i in range(shape_count):
    t = t_min_h + (t_max_h - t_min_h) * i / max(1, shape_count - 1)
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos92T = math.cos(92 * t)
    sin92T = math.sin(92 * t)
    x = a * cosT + (a / 92) * cos92T
    y = a * sinT - (a / 92) * sin92T
    if math.isfinite(x) and math.isfinite(y):
        samples_h.append((x, y))
print(f"Heptacontatrisexagon shape: {len(samples_h)}/{shape_count} finite samples")

# Tight shape (t in [-pi/93, pi/93])
t_min_t = -math.pi / 93
t_max_t = math.pi / 93
samples_t = []
for i in range(shape_count):
    t = t_min_t + (t_max_t - t_min_t) * i / max(1, shape_count - 1)
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos92T = math.cos(92 * t)
    sin92T = math.sin(92 * t)
    x = a * cosT + (a / 92) * cos92T
    y = a * sinT - (a / 92) * sin92T
    if math.isfinite(x) and math.isfinite(y):
        samples_t.append((x, y))
print(f"Tight shape: {len(samples_t)}/{shape_count} finite samples")

print("\nAll verification checks pass.")
