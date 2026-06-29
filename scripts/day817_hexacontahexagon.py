#!/usr/bin/env python3
"""Day 817: Hexacontahexagon (66-cusped Hypocycloid) Notes Reproducibility Script."""
import math

def hx(t, a=4):
    return a * math.cos(t) + (a / 65) * math.cos(65 * t), a * math.sin(t) - (a / 65) * math.sin(65 * t)

x, y = hx(0, 4)
assert abs(x - 4 * 66 / 65) < 1e-9 and abs(y) < 1e-9
print("t=0: x=%.6f y=%.6f (expected x=%.6f y=0)" % (x, y, 4 * 66 / 65))
print("66 = 2*3*11, NOT constructible (Gauss-Wantzel 1837, since 11 is not Fermat)")
print("Day 817 verification PASSED")
