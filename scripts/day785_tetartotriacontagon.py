#!/usr/bin/env python3
"""Day 785: Tetartotriacontagon (34-cusped Hypocycloid) - reproducibility script.

Parametric form: x(t) = a*cos(t) + (a/33)*cos(33t), y(t) = a*sin(t) - (a/33)*sin(33t).
R/r = 34. 34 = 2 * 17 (17 is Fermat prime), so 34-gon IS constructible (Gauss-Wantzel 1837).
"""
import math

A = 4.0
N = 34
print(f"Tetartotriacontagon (34-cusped hypocycloid), R/r=34, parametric x = a*cos(t) + (a/33)*cos(33t), y = a*sin(t) - (a/33)*sin(33t)")
print(f"34 = 2*17 (17 is Fermat prime), so regular 34-gon IS constructible by compass and straightedge")
print()
for i in range(8):
    t = 2 * math.pi * i / 8
    cos_t, sin_t = math.cos(t), math.sin(t)
    cos_33t, sin_33t = math.cos(33 * t), math.sin(33 * t)
    x = A * cos_t + (A/33) * cos_33t
    y = A * sin_t - (A/33) * sin_33t
    print(f"t={t:.4f}: ({x:+.4f}, {y:+.4f})")
