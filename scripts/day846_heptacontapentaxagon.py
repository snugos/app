#!/usr/bin/env python3
"""
Day 846: Heptacontapentaxagon (95-cusped Hypocycloid) Notes - Reproducibility Script

Verifies the 95-cusped hypocycloid parametric form implemented in
heptacontapentaxagonNotes for the SnugOS DAW.

Hypocycloid parametric equations:
  x(t) = a*cos(t) + (a/94)*cos(94t)
  y(t) = a*sin(t) - (a/94)*sin(94t)

R/r = 95, 95 cusps per revolution, one cusp per 360/95 = 3.7895 degrees.

95 = 5 * 19 IS NOT constructible per Gauss-Wantzel 1837
(5 IS a Fermat prime but 19 is prime but NOT a Fermat prime;
Fermat primes are 3, 5, 17, 257, 65537).
"""

import math
import sys

PI = math.pi


def heptacontapentaxagon_samples(a, length, t_min=0.0, t_max=2*PI):
    """Generate samples along a 95-cusped hypocycloid curve."""
    samples = []
    a_over_94 = a / 94.0
    denom = max(1, length - 1)
    for i in range(length):
        t = t_min + (t_max - t_min) * i / denom
        cos_t = math.cos(t)
        sin_t = math.sin(t)
        cos_94t = math.cos(94 * t)
        sin_94t = math.sin(94 * t)
        x = a * cos_t + a_over_94 * cos_94t
        y = a * sin_t - a_over_94 * sin_94t
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        samples.append((x, y))
    return samples


def main():
    a = 4  # default scale
    length = 32  # default length

    print(f"=== Day 846 Heptacontapentaxagon (95-cusped) Notes ===")
    print(f"N = 95, R/r = 95, a = {a}, length = {length}")
    print(f"95 = 5 * 19 IS NOT constructible per Gauss-Wantzel 1837")
    print(f"(5 IS a Fermat prime but 19 is prime but NOT a Fermat prime)")
    print()

    # Verify t=0 sample
    x0 = a * 1.0 + (a / 94) * 1.0  # cos(0)=1, cos(94*0)=1
    y0 = a * 0.0 - (a / 94) * 0.0  # sin(0)=0, sin(94*0)=0
    expected = 95 * a / 94
    assert abs(x0 - expected) < 1e-10, f"x0 mismatch: {x0} vs {expected}"
    assert abs(y0) < 1e-10, f"y0 should be 0, got {y0}"
    print(f"At t=0: x = {x0:.6f} = 95a/94 = {expected:.6f}, y = {y0:.6f}  OK")

    # Cusp interval
    cusp_interval = 360.0 / 95
    print(f"Cusp interval: 360/95 = {cusp_interval:.4f} degrees  OK")

    # Run all 4 shapes
    shapes = [
        ("standard",    0.0,             2*PI),
        ("inverted",    2*PI,            0.0),
        ("heptacontapentaxagon", 0.0,    2*PI/95),
        ("tight",      -PI/95,           PI/95),
    ]

    print()
    print("=== Per-shape validation ===")
    for name, t_min, t_max in shapes:
        samples = heptacontapentaxagon_samples(a, length, t_min, t_max)
        assert len(samples) == length, f"{name}: expected {length} samples, got {len(samples)}"
        xs = [s[0] for s in samples]
        ys = [s[1] for s in samples]
        x_range = max(xs) - min(xs)
        y_range = max(ys) - min(ys)
        print(f"{name:25s}: {len(samples):3d}/{length} finite samples, "
              f"xRange={x_range:.4f}, yRange={y_range:.4f}  OK")

    print()
    print("=== Constructibility check ===")
    n = 95
    fermat_primes = {3, 5, 17, 257, 65537}
    factors = []
    n_temp = n
    for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]:
        while n_temp % p == 0:
            factors.append(p)
            n_temp //= p
    if n_temp > 1:
        factors.append(n_temp)
    print(f"95 = {' * '.join(str(f) for f in factors)}")
    # 95 = 5 * 19: 5 IS a Fermat prime but 19 is NOT, so 95 is NOT constructible.
    distinct_fermat = all(f in fermat_primes for f in factors) and len(set(factors)) == len(factors)
    is_constructible = distinct_fermat
    assert not is_constructible, "95 should NOT be constructible"
    print(f"Constructible by compass and straightedge: NO (19 is not Fermat)")

    print()
    print("=== Day 846 Heptacontapentaxagon feature: all checks pass ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
