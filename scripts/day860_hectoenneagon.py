#!/usr/bin/env python3
"""Day 860 Hectoenneagon (109-cusped hypocycloid) verification.

109 IS the 29th prime number and NOT a Fermat prime (Fermat primes are 3, 5, 17, 257, 65537),
so 109 fails the Gauss-Wantzel 1837 constructibility criterion.
Parametric: x = a*cos(t) + (a/108)*cos(108t), y = a*sin(t) - (a/108)*sin(108t).
"""
import math


def main():
    a = 4.0
    n = 32
    n_cusps = 109
    a_over_108 = a / 108
    print(f"Hectoenneagon (109-cusped hypocycloid) verification")
    print(f"  109 IS the 29th prime and NOT a Fermat prime (NOT constructible per Gauss-Wantzel 1837)")
    print(f"  R/r = 109, ~{360.0 / n_cusps:.4f} degree cusp intervals")
    print(f"  aOver108 = a/108 = {a_over_108:.6f}")
    print()
    print(f"  x at t=0 = a*cos(0) + aOver108*cos(0) = a + aOver108 = {a + a_over_108:.6f} = 109a/108 = {109 * a / 108:.6f}")
    print()

    for shape, (t_min, t_max) in [
        ("standard", (0.0, 2.0 * math.pi)),
        ("inverted", (2.0 * math.pi, 0.0)),
        ("hectoenneagon", (0.0, 2.0 * math.pi / n_cusps)),
        ("tight", (-math.pi / n_cusps, math.pi / n_cusps)),
    ]:
        samples = []
        for i in range(n):
            t = t_min + (t_max - t_min) * i / max(1, n - 1)
            x = a * math.cos(t) + a_over_108 * math.cos(108 * t)
            y = a * math.sin(t) - a_over_108 * math.sin(108 * t)
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

    # Sanity: 109 IS prime (29th prime) but NOT a Fermat prime
    n = 109
    is_prime = n > 1 and all(n % p != 0 for p in range(2, int(math.isqrt(n)) + 1))
    fermat_primes = {3, 5, 17, 257, 65537}
    is_fermat = n in fermat_primes
    print()
    print(f"  Primality check: 109 IS prime = {is_prime} (29th prime)")
    print(f"  Fermat prime check: 109 IS Fermat = {is_fermat} (Fermat primes: 3, 5, 17, 257, 65537)")
    print(f"  Constructibility (Gauss-Wantzel 1837): 109 NOT constructible since 109 is prime but NOT Fermat")


if __name__ == "__main__":
    main()
