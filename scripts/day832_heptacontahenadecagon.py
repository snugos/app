#!/usr/bin/env python3
"""Day 832: Heptacontahenadecagon (81-cusped Hypocycloid) Notes - reproducibility check.

Parametric form (matching the JS implementation):
    x(t) = a*cos(t) + (a/80)*cos(80t)
    y(t) = a*sin(t) - (a/80)*sin(80t)

81 = 3^4 = 9^2; 81-fold rotational D81 symmetry; 81 cusps per revolution;
cusp interval 360/81 = 4.4444... degrees.
81 = 3^4 is NOT constructible per Gauss-Wantzel 1837 (3 is Fermat prime but
appears with multiplicity 4, failing the DISTINCT Fermat primes criterion).
R/r = 81/1, with rolling circle radius r = a/80 and fixed circle radius R = 81a/80.

At t=0: cosT=1, sinT=0, cos80T=1, sin80T=0 -> x = a + a/80 = 81a/80, y = 0.
This is the rightmost extreme of the curve at (81a/80, 0).
"""
import math


def x_of_t(t, a):
    return a * math.cos(t) + (a / 80) * math.cos(80 * t)


def y_of_t(t, a):
    return a * math.sin(t) - (a / 80) * math.sin(80 * t)


a = 4.0
print(f"a = {a}")
print(f"x at t=0 = {x_of_t(0, a)} (expected 81a/80 = {81 * a / 80})")
print(f"y at t=0 = {y_of_t(0, a)}")
print(f"81 = 3^4 = {3**4}")
print(f"R/r = {81} (rolling circle r=a/80, fixed circle R=81a/80)")
print(f"cusp interval 360/81 = {360/81} degrees")

# Sample 32 points along all 4 shapes
for shape, (tmin, tmax) in [
    ("standard", (0.0, 2 * math.pi)),
    ("inverted", (2 * math.pi, 0.0)),
    ("heptacontahenadecagon", (0.0, 2 * math.pi / 81)),
    ("tight", (-math.pi / 81, math.pi / 81)),
]:
    n = 32
    samples = []
    for i in range(n):
        t = tmin + (tmax - tmin) * i / max(1, n - 1)
        x = x_of_t(t, a)
        y = y_of_t(t, a)
        samples.append((x, y))
    finite = sum(1 for x, y in samples if math.isfinite(x) and math.isfinite(y))
    xs = [x for x, _ in samples]
    ys = [y for _, y in samples]
    print(f"  shape={shape}: n={n}, finite={finite}, xRange={max(xs)-min(xs):.4f}, yRange={max(ys)-min(ys):.4f}")
