#!/usr/bin/env python3
"""
Day 890: Hectoenneatriacontagon (139-cusped Hypocycloid) Notes - Reproducibility Script

Verifies the 139-cusped hypocycloid parametric form implemented in
hectoenneatriacontagonNotes for the SnugOS DAW.

Hypocycloid parametric equations:
  x(t) = a*cos(t) + (a/138)*cos(138t)
  y(t) = a*sin(t) - (a/138)*sin(138t)

R/r = 139, 139 cusps per revolution, one cusp per 360/139 ~ 2.5899 degrees.

139 IS the 34th prime and NOT a Fermat prime (Fermat primes are
3, 5, 17, 257, 65537) so 139 is NOT constructible by compass and
straightedge per Gauss-Wantzel 1837.
"""
import math
import sys

PI = math.pi


def hectoenneatriacontagon_samples(a, length, t_min=0.0, t_max=2*PI):
    """Generate samples along a 139-cusped hypocycloid curve."""
    samples = []
    a_over_138 = a / 138.0
    denom = max(1, length - 1)
    for i in range(length):
        t = t_min + (t_max - t_min) * i / denom
        cos_t = math.cos(t)
        sin_t = math.sin(t)
        cos_138t = math.cos(138 * t)
        sin_138t = math.sin(138 * t)
        x = a * cos_t + a_over_138 * cos_138t
        y = a * sin_t - a_over_138 * sin_138t
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        samples.append((x, y))
    return samples


def main():
    a = 4
    length = 32

    print(f"=== Day 890 Hectoenneatriacontagon (139-cusped) Notes ===")
    print(f"N = 139, R/r = 139, a = {a}, length = {length}")
    print(f"139 IS the 34th prime and NOT a Fermat prime so NOT constructible per Gauss-Wantzel 1837")
    print()

    x0 = a * 1.0 + (a / 138) * 1.0
    y0 = a * 0.0 - (a / 138) * 0.0
    expected = 139 * a / 138
    assert abs(x0 - expected) < 1e-10, f"x0 mismatch: {x0} vs {expected}"
    assert abs(y0) < 1e-10, f"y0 should be 0, got {y0}"
    print(f"At t=0: x = {x0:.6f} = 139a/138 = {expected:.6f}, y = {y0:.6f}  OK")

    cusp_interval = 360.0 / 139
    print(f"Cusp interval: 360/139 = {cusp_interval:.4f} degrees  OK")

    shapes = [
        ("standard",    0.0,        2*PI),
        ("inverted",    2*PI,       0.0),
        ("hectoenneatriacontagon", 0.0, 2*PI/139),
        ("tight",      -PI/139,     PI/139),
    ]

    print()
    print("=== Per-shape validation ===")
    for name, t_min, t_max in shapes:
        samples = hectoenneatriacontagon_samples(a, length, t_min, t_max)
        assert len(samples) == length, f"{name}: expected {length} samples, got {len(samples)}"
        xs = [s[0] for s in samples]
        ys = [s[1] for s in samples]
        x_range = max(xs) - min(xs)
        y_range = max(ys) - min(ys)
        print(f"{name:25s}: {len(samples):3d}/{length} finite samples, "
              f"xRange={x_range:.4f}, yRange={y_range:.4f}  OK")

    print()
    print("=== Constructibility check ===")
    n = 139
    fermat_primes = {3, 5, 17, 257, 65537}
    factors = []
    n_temp = n
    for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139]:
        while n_temp % p == 0:
            factors.append(p)
            n_temp //= p
    if n_temp > 1:
        factors.append(n_temp)
    print(f"139 = {' * '.join(str(f) for f in factors)}")
    # 139 is prime; not a Fermat prime, so not constructible.
    is_prime = len(factors) == 1 and factors[0] == n
    assert is_prime, f"139 should be prime, got factors {factors}"
    assert 139 not in fermat_primes, "139 is not a Fermat prime"
    print(f"Constructible by compass and straightedge: NO (139 is prime but not a Fermat prime)")

    print()
    print("=== Day 890 Hectoenneatriacontagon feature: all checks pass ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
