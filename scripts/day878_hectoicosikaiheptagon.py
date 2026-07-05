#!/usr/bin/env python3
"""Day 878 reproducibility script - hectoicosikaiheptagon (127-cusped Hypocycloid).

127 = 2^7 - 1 is the 7th Mersenne prime. It is NOT a Fermat prime
(Fermat primes are 3, 5, 17, 257, 65537), so per Gauss-Wantzel 1837 the
regular 127-gon is NOT constructible by compass and straightedge.

Parametric:
  x(t) = a*cos(t) + (a/126)*cos(126t)
  y(t) = a*sin(t) - (a/126)*sin(126t)

with a = 4 (default scale).
"""
import math

a = 4
aOver126 = a / 126
n = 127

# t = 0 -> x = a + a/126 = a * (1 + 1/126) = a * 127/126
x_at_0 = a * 1.0 + aOver126 * 1.0
print(f"x at t=0: {x_at_0:.6f} (expected: {a * 127 / 126:.6f} = 127a/126)")

# 127 = 2^7 - 1 (Mersenne prime M_7)
mersenne = 2**7 - 1
print(f"2^7 - 1 = {mersenne} (matches 127? {mersenne == 127})")

# T_MAX = 2*PI/127
t_max = 2 * math.pi / 127
print(f"HECTOICOSIKAIHEPTAGON_NOTES_HECTOICOSIKAIHEPTAGON_T_MAX = 2*PI/127 = {t_max:.6f}")

# 127 is the 31st prime (counting 2 as the 1st)
# Just verify it's prime
def is_prime(m):
    if m < 2:
        return False
    for d in range(2, int(m**0.5) + 1):
        if m % d == 0:
            return False
    return True

print(f"127 is prime: {is_prime(127)}")
print(f"127 is Mersenne prime (2^p - 1, p=7): {is_prime(7)} and {mersenne == 127}")

# Fermat primes up to 127: 3, 5, 17 (next is 257)
fermat_primes_under_127 = [p for p in [3, 5, 17] if p < 127]
print(f"Fermat primes < 127: {fermat_primes_under_127}")
print(f"127 is a Fermat prime: {127 in fermat_primes_under_127 or 127 in [3, 5, 17, 257, 65537]}")

# Generate 32 samples and verify finiteness
N = 32
t_min, t_max_t = 0.0, 2 * math.pi
all_finite = True
xmin, xmax, ymin, ymax = math.inf, -math.inf, math.inf, -math.inf
for i in range(N):
    t = t_min + (t_max_t - t_min) * i / max(1, N - 1)
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos126T = math.cos(126 * t)
    sin126T = math.sin(126 * t)
    x = a * cosT + aOver126 * cos126T
    y = a * sinT - aOver126 * sin126T
    if not (math.isfinite(x) and math.isfinite(y)):
        all_finite = False
    xmin, xmax = min(xmin, x), max(xmax, x)
    ymin, ymax = min(ymin, y), max(ymax, y)

print(f"32/32 finite samples: {all_finite}")
print(f"xRange: [{xmin:.4f}, {xmax:.4f}]  width={xmax - xmin:.4f}")
print(f"yRange: [{ymin:.4f}, {ymax:.4f}]  width={ymax - ymin:.4f}")

# Cusp interval = 360 / 127 degrees
deg = 360.0 / 127
print(f"Cusp interval: 360/127 = {deg:.4f} degrees")
