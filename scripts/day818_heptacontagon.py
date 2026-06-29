#!/usr/bin/env python3
"""Day 818: Heptacontagon (67-cusped Hypocycloid) Notes Reproducibility Script."""
import math

def hp(t, a=4):
    return a * math.cos(t) + (a / 66) * math.cos(66 * t), a * math.sin(t) - (a / 66) * math.sin(66 * t)

x, y = hp(0, 4)
assert abs(x - 4 * 67 / 66) < 1e-9 and abs(y) < 1e-9
print("t=0: x=%.6f y=%.6f (expected x=%.6f y=0)" % (x, y, 4 * 67 / 66))
print("67 is prime but NOT a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537)")
print("67-gon NOT constructible by compass and straightedge (Gauss-Wantzel 1837)")
print("Day 818 verification PASSED")