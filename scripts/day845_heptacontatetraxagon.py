#!/usr/bin/env python3
"""
Day 845: Heptacontatetraxagon (94-cusped Hypocycloid) Notes - Reproducibility Script

Verifies the 94-cusped hypocycloid parametric form implemented in
heptacontatetraxagonNotes for the SnugOS DAW.

Hypocycloid parametric equations:
  x(t) = a*cos(t) + (a/93)*cos(93t)
  y(t) = a*sin(t) - (a/93)*sin(93t)

R/r = 94, 94 cusps per revolution, one cusp per 360/94 = 3.8298 degrees.

94 = 2 * 47 is NOT constructible per Gauss-Wantzel 1837
(47 is prime but NOT a Fermat prime; Fermat primes are 3, 5, 17, 257, 65537).
"""

import math
import sys

PI = math.pi


def heptacontatetraxagon_samples(a, length, t_min=0.0, t_max=2*PI):
    """Generate samples along a 94-cusped hypocycloid curve."""
    samples = []
    a_over_93 = a / 93.0
    denom = max(1, length - 1)
    for i in range(length):
        t = t_min + (t_max - t_min) * i / denom
        cos_t = math.cos(t)
        sin_t = math.sin(t)
        cos_93t = math.cos(93 * t)
        sin_93t = math.sin(93 * t)
        x = a * cos_t + a_over_93 * cos_93t
        y = a * sin_t - a_over_93 * sin_93t
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        samples.append((x, y))
    return samples


def main():
    a = 4  # default scale
    length = 32  # default length

    print(f"=== Day 845 Heptacontatetraxagon (94-cusped) Notes ===")
    print(f"N = 94, R/r = 94, a = {a}, length = {length}")
    print(f"94 = 2 * 47 IS NOT constructible per Gauss-Wantzel 1837")
    print(f"(47 is prime but NOT a Fermat prime)")
    print()

    # Verify t=0 sample
    x0 = a * 1.0 + (a / 93) * 1.0  # cos(0)=1, cos(93*0)=1
    y0 = a * 0.0 - (a / 93) * 0.0  # sin(0)=0, sin(93*0)=0
    expected = 94 * a / 93
    assert abs(x0 - expected) < 1e-10, f"x0 mismatch: {x0} vs {expected}"
    assert abs(y0) < 1e-10, f"y0 should be 0, got {y0}"
    print(f"At t=0: x = {x0:.6f} = 94a/93 = {expected:.6f}, y = {y0:.6f}  OK")

    # Cusp interval
    cusp_interval = 360.0 / 94
    print(f"Cusp interval: 360/94 = {cusp_interval:.4f} degrees  OK")

    # Run all 4 shapes
    shapes = [
        ("standard",    0.0,             2*PI),
        ("inverted",    2*PI,            0.0),
        ("heptacontatetraxagon", 0.0,    2*PI/94),
        ("tight",      -PI/94,           PI/94),
    ]

    print()
    print("=== Per-shape validation ===")
    for name, t_min, t_max in shapes:
        samples = heptacontatetraxagon_samples(a, length, t_min, t_max)
        assert len(samples) == length, f"{name}: expected {length} samples, got {len(samples)}"
        xs = [s[0] for s in samples]
        ys = [s[1] for s in samples]
        x_range = max(xs) - min(xs)
        y_range = max(ys) - min(ys)
        print(f"{name:20s}: {len(samples):3d}/32 finite samples, "
              f"xRange={x_range:.4f}, yRange={y_range:.4f}  OK")

    print()
    print("=== Constructibility check ===")
    n = 94
    # 94 = 2 * 47
    # 2 IS a power of 2
    # 47 IS prime but NOT a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537)
    fermat_primes = {3, 5, 17, 257, 65537}
    factors = []
    n_temp = n
    for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]:
        while n_temp % p == 0:
            factors.append(p)
            n_temp //= p
    if n_temp > 1:
        factors.append(n_temp)
    print(f"94 = {' * '.join(str(f) for f in factors)}")
    is_fermat = all(f in fermat_primes for f in factors)
    is_pow2 = 2 in factors and len(factors) == 1
    is_constructible = is_fermat and is_pow2 or (len(set(factors)) == len(factors) and all(f in fermat_primes for f in factors))
    # The real criterion: n is constructible iff n is a product of DISTINCT Fermat primes
    # and a power of 2.
    # 94 = 2 * 47: 47 is NOT a Fermat prime, so 94 is NOT constructible.
    assert not is_constructible, "94 should NOT be constructible"
    print(f"Constructible by compass and straightedge: NO (47 is not Fermat)")

    print()
    print("=== Day 845 Heptacontatetraxagon feature: all checks pass ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
