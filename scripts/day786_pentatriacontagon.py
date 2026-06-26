#!/usr/bin/env python3
"""Day 786: Pentatriacontagon (35-cusped Hypocycloid) - reproducibility script.

Parametric form: x(t) = a*cos(t) + (a/34)*cos(34t), y(t) = a*sin(t) - (a/34)*sin(34t).
R/r = 35. 35 = 5 * 7 (neither is a Fermat prime), so 35-gon is NOT constructible (Gauss-Wantzel 1837).
"""
import math

A = 4.0
N = 35
print(f"Pentatriacontagon (35-cusped hypocycloid), R/r=35, parametric x = a*cos(t) + (a/34)*cos(34t), y = a*sin(t) - (a/34)*sin(34t)")
print(f"35 = 5*7 (5 is Fermat prime but 7 is not), so regular 35-gon is NOT constructible by compass and straightedge")
print()
for i in range(8):
    t = 2 * math.pi * i / 8
    cos_t, sin_t = math.cos(t), math.sin(t)
    cos_34t, sin_34t = math.cos(34 * t), math.sin(34 * t)
    x = A * cos_t + (A/34) * cos_34t
    y = A * sin_t - (A/34) * sin_34t
    print(f"t={t:.4f}: ({x:+.4f}, {y:+.4f})")
