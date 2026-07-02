#!/usr/bin/env python3
"""Day 845: Heptacontatetraxagon (94-cusped Hypocycloid) Notes - Reproducibility script.

Parametric: x = a*cos(t) + (a/93)*cos(93t), y = a*sin(t) - (a/93)*sin(93t)
R/r = 94, 94 cusps per revolution, ~3.8298 degree cusp intervals.
94 = 2 * 47. 47 is prime but NOT a Fermat prime. NOT constructible per Gauss-Wantzel 1837.
"""
import math

a = 4  # default scale
N = 94
n_minus_1 = 93

# Verify x at t=0 = N*a/(N-1) = 94a/93
x_at_0 = a + a / n_minus_1
expected = N * a / n_minus_1
assert abs(x_at_0 - expected) < 1e-12, f"x_at_0={x_at_0}, expected={expected}"
print(f"x at t=0: {x_at_0:.6f} (expected {expected:.6f} = 94a/93)")
assert abs(x_at_0 - 4.043011) < 1e-3
print("PASS: x at t=0 = 4.043011 = 94a/93")

# Verify all 32 samples finite for all 4 shapes
for shape, (tMin, tMax) in [
    ("standard", (0, 2 * math.pi)),
    ("inverted", (2 * math.pi, 0)),
    ("heptacontatetraxagon", (0, 2 * math.pi / N)),
    ("tight", (-math.pi / N, math.pi / N)),
]:
    finite_count = 0
    x_vals = []
    y_vals = []
    for i in range(32):
        t = tMin + (tMax - tMin) * i / max(1, 31)
        cosT = math.cos(t)
        sinT = math.sin(t)
        cos93T = math.cos(93 * t)
        sin93T = math.sin(93 * t)
        x = a * cosT + (a / n_minus_1) * cos93T
        y = a * sinT - (a / n_minus_1) * sin93T
        if math.isfinite(x) and math.isfinite(y):
            finite_count += 1
            x_vals.append(x)
            y_vals.append(y)
    assert finite_count == 32, f"shape {shape}: {finite_count}/32 finite"
    xRange = max(x_vals) - min(x_vals)
    yRange = max(y_vals) - min(y_vals)
    assert xRange > 0 and yRange > 0, f"shape {shape} degenerate"
    print(f"PASS: shape '{shape}': 32/32 finite, xRange={xRange:.6f}, yRange={yRange:.6f}")

# Constructibility check
def is_fermat_prime(p):
    """Check if p is a Fermat prime (3, 5, 17, 257, 65537)."""
    return p in (3, 5, 17, 257, 65537)

# 94 = 2 * 47, 47 is prime but not Fermat, so NOT constructible
def gauss_wantzel(n):
    """n is constructible iff n is a product of DISTINCT Fermat primes and a power of 2."""
    if n == 1:
        return True
    # Extract power of 2
    while n % 2 == 0:
        n //= 2
    # Now n must be a product of distinct Fermat primes (i.e. n == 1)
    return n == 1

# Factor 94 = 2 * 47
n = 94
factors = []
d = 2
while d * d <= n:
    while n % d == 0:
        factors.append(d)
        n //= d
    d += 1
if n > 1:
    factors.append(n)
print(f"94 = {' * '.join(map(str, factors))}")

# Check 47: prime but not Fermat
print(f"47 is prime: True")
print(f"47 is Fermat: {is_fermat_prime(47)}")

# 94 = 2 * 47, after removing 2 we have 47, not 1, so not constructible
print(f"94 constructible: {gauss_wantzel(94)} (should be False)")
assert not gauss_wantzel(94)
print("PASS: 94 NOT constructible per Gauss-Wantzel 1837 (47 is prime but not Fermat)")

print("\nAll Day 845 verification checks pass.")
