#!/usr/bin/env python3
"""Day 787: Hexatriacontagon (36-cusped Hypocycloid) - reproducibility script.

Parametric form: x(t) = a*cos(t) + (a/35)*cos(35t), y(t) = a*sin(t) - (a/35)*sin(35t).
R/r = 36. 36 = 2^2 * 3^2 (3 is Fermat prime but appears with multiplicity 2), so
36-gon is NOT constructible (Gauss-Wantzel 1837 distinctness criterion fails).
"""
import math

A = 4.0
N = 36
print(f"Hexatriacontagon (36-cusped hypocycloid), R/r=36, parametric x = a*cos(t) + (a/35)*cos(35t), y = a*sin(t) - (a/35)*sin(35t)")
print(f"36 = 2^2 * 3^2 (3 is Fermat prime but appears with multiplicity 2), so regular 36-gon is NOT constructible by compass and straightedge")
print(f"36-fold rotational D36 symmetry, 36 inward-pointing cusps at exactly 10 degree intervals (360/36 = 10)")
print()
for i in range(8):
    t = 2 * math.pi * i / 8
    cos_t, sin_t = math.cos(t), math.sin(t)
    cos_35t, sin_35t = math.cos(35 * t), math.sin(35 * t)
    x = A * cos_t + (A/35) * cos_35t
    y = A * sin_t - (A/35) * sin_35t
    print(f"t={t:.4f}: ({x:+.4f}, {y:+.4f})")
