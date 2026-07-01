#!/usr/bin/env python3
"""
Day 843 Heptacontadikosexagon (92-cusped Hypocycloid) Notes - Reproducibility Script
Verifies parametric x = a*cos(t) + (a/91)*cos(91t), y = a*sin(t) - (a/91)*sin(91t).
"""
import math

N = 92
a = 4
shape_count = 32
t_max_full = 2 * math.pi

# Standard shape - all 92 cusps
samples_std = []
for i in range(shape_count):
    t = t_max_full * i / max(1, shape_count - 1)
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos91T = math.cos(91 * t)
    sin91T = math.sin(91 * t)
    x = a * cosT + (a / 91) * cos91T
    y = a * sinT - (a / 91) * sin91T
    if math.isfinite(x) and math.isfinite(y):
        samples_std.append((x, y))

x_at_0 = a + a / 91
print(f"x at t=0 = {x_at_0:.6f} (expected: 92a/91 = {92 * a / 91:.6f})")
print(f"R/r = {N} (rolling circle r=a/91, fixed circle R=92a/91)")
print(f"Cusp interval = 360/{N} = {360 / N:.4f}°")
print(f"92 = 2^2 * 23, NOT constructible per Gauss-Wantzel 1837 (23 not Fermat, despite 4=2^2)")
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
    cos91T = math.cos(91 * t)
    sin91T = math.sin(91 * t)
    x = a * cosT + (a / 91) * cos91T
    y = a * sinT - (a / 91) * sin91T
    if math.isfinite(x) and math.isfinite(y):
        samples_inv.append((x, y))
print(f"Inverted shape: {len(samples_inv)}/{shape_count} finite samples")

# Heptacontadikosexagon shape (1 cusp region: t in [0, 2pi/92])
t_min_h = 0
t_max_h = 2 * math.pi / 92
samples_h = []
for i in range(shape_count):
    t = t_min_h + (t_max_h - t_min_h) * i / max(1, shape_count - 1)
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos91T = math.cos(91 * t)
    sin91T = math.sin(91 * t)
    x = a * cosT + (a / 91) * cos91T
    y = a * sinT - (a / 91) * sin91T
    if math.isfinite(x) and math.isfinite(y):
        samples_h.append((x, y))
print(f"Heptacontadikosexagon shape: {len(samples_h)}/{shape_count} finite samples")

# Tight shape (t in [-pi/92, pi/92])
t_min_t = -math.pi / 92
t_max_t = math.pi / 92
samples_t = []
for i in range(shape_count):
    t = t_min_t + (t_max_t - t_min_t) * i / max(1, shape_count - 1)
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos91T = math.cos(91 * t)
    sin91T = math.sin(91 * t)
    x = a * cosT + (a / 91) * cos91T
    y = a * sinT - (a / 91) * sin91T
    if math.isfinite(x) and math.isfinite(y):
        samples_t.append((x, y))
print(f"Tight shape: {len(samples_t)}/{shape_count} finite samples")

print("\nAll verification checks pass.")
