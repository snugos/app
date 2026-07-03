#!/usr/bin/env python3
"""Day 859 Hectooctagon (108-cusped hypocycloid) verification.

108 = 2^2 * 3^3. 2^2 is a power of 2 and 3 is a Fermat prime, but 3^3 has 3
with multiplicity 3, so 108 fails the Gauss-Wantzel 1837 distinctness criterion.
Parametric: x = a*cos(t) + (a/107)*cos(107t), y = a*sin(t) - (a/107)*sin(107t).
"""
import math


def main():
    a = 4.0
    n = 32
    n_cusps = 108
    a_over_107 = a / 107
    print(f"Hectooctagon (108-cusped hypocycloid) verification")
    print(f"  108 = 2^2 * 3^3 (NOT constructible per Gauss-Wantzel 1837: 3^3 has 3 with multiplicity 3)")
    print(f"  R/r = 108, ~{360.0 / 108:.4f} degree cusp intervals")
    print(f"  aOver107 = a/107 = {a_over_107:.6f}")
    print()
    print(f"  x at t=0 = a*cos(0) + aOver107*cos(0) = a + aOver107 = {a + a_over_107:.6f} = 108a/107 = {108 * a / 107:.6f}")
    print()

    for shape, (t_min, t_max) in [
        ("standard", (0.0, 2.0 * math.pi)),
        ("inverted", (2.0 * math.pi, 0.0)),
        ("hectooctagon", (0.0, 2.0 * math.pi / n_cusps)),
        ("tight", (-math.pi / n_cusps, math.pi / n_cusps)),
    ]:
        samples = []
        for i in range(n):
            t = t_min + (t_max - t_min) * i / max(1, n - 1)
            x = a * math.cos(t) + a_over_107 * math.cos(107 * t)
            y = a * math.sin(t) - a_over_107 * math.sin(107 * t)
            if not (math.isfinite(x) and math.isfinite(y)):
                continue
            samples.append((x, y))
        xs = [p[0] for p in samples]
        ys = [p[1] for p in samples]
        print(
            f"  {shape}: n_finite={len(samples)}/{n} "
            f"x=[{min(xs):.4f}, {max(xs):.4f}] y=[{min(ys):.4f}, {max(ys):.4f}] "
            f"xRange={max(xs) - min(xs):.4f} yRange={max(ys) - min(ys):.4f}"
        )

    # Sanity: 108 is NOT constructible per Gauss-Wantzel 1837
    n = 108
    factors = []
    rem = n
    for p in [2, 3]:
        while rem % p == 0:
            factors.append(p)
            rem //= p
    if rem > 1:
        factors.append(rem)
    fprime_multiplicity = {}
    fermat_primes = {3, 5, 17, 257, 65537}
    for f in factors:
        if f in fermat_primes:
            fprime_multiplicity[f] = fprime_multiplicity.get(f, 0) + 1
    has_power_of_2 = 2 in factors
    distinct_fps = all(v == 1 for v in fprime_multiplicity.values())
    constructible = has_power_of_2 and distinct_fps
    print()
    print(f"  108 factorization: {factors}")
    print(f"  2 is a power of 2: True (2^2)")
    print(f"  3 multiplicity: {factors.count(3)} (FAILS distinctness criterion since >1)")
    print(f"  Constructible per Gauss-Wantzel 1837: {constructible}")


if __name__ == "__main__":
    main()
