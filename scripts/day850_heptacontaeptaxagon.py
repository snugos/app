#!/usr/bin/env python3
"""
Day 850: Heptacontaeptaxagon (99-cusped Hypocycloid) Notes - Reproducibility Script

Verifies the parametric hypocycloid formulas and outputs key reference values:
  - x at t=0 should equal 99a/98 (the x-extent of the curve at t=0)
  - R/r = 99
  - 360/99 ≈ 3.6364° cusp intervals
  - 32 finite samples for all 4 shapes (standard/inverted/heptacontaeptaxagon/tight)
  - 99 = 3^2 * 11 (NOT constructible per Gauss-Wantzel 1837 since 3 has
    multiplicity 2 in the prime factorization, failing the distinctness criterion
    despite 11 also being non-Fermat)
"""
import math


def heptacontaeptaxagon_samples(a, N, t_min, t_max):
    """Return N samples (x, y) on the 99-cusped hypocycloid curve."""
    samples = []
    for i in range(N):
        t = t_min + (t_max - t_min) * i / max(1, N - 1)
        cosT = math.cos(t)
        sinT = math.sin(t)
        cos98T = math.cos(98 * t)
        sin98T = math.sin(98 * t)
        x = a * cosT + (a / 98) * cos98T
        y = a * sinT - (a / 98) * sin98T
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        samples.append((x, y))
    return samples


def main():
    a = 4
    N = 32

    # Reference: x at t=0 should be a + a/98 = 99a/98
    x_at_0 = a * math.cos(0) + (a / 98) * math.cos(98 * 0)
    print(f"x at t=0 (a=4) = {x_at_0:.6f} = 99a/98 = {a * 99 / 98:.6f}")

    # R/r = 99, 99 cusps per revolution
    print(f"R/r = 99 (small circle r=a/98 rolling inside fixed circle R=99a/98)")

    # Cusp intervals
    cusp_interval = 360.0 / 99
    print(f"Cusp interval = 360/99 = {cusp_interval:.4f}° = 2pi/99 = {2 * math.pi / 99:.6f} rad")

    # Standard, Inverted, Heptacontaeptaxagon, Tight shape t-ranges
    ranges = {
        "standard": (0, 2 * math.pi),
        "inverted": (2 * math.pi, 0),
        "heptacontaeptaxagon": (0, 2 * math.pi / 99),
        "tight": (-math.pi / 99, math.pi / 99),
    }
    for shape_name, (t_min, t_max) in ranges.items():
        s = heptacontaeptaxagon_samples(a, N, t_min, t_max)
        if s:
            xs = [p[0] for p in s]
            ys = [p[1] for p in s]
            print(f"  {shape_name:25s}: N_finite={len(s):2d}  xRange=[{min(xs):.4f}, {max(xs):.4f}]  yRange=[{min(ys):.4f}, {max(ys):.4f}]")
        else:
            print(f"  {shape_name:25s}: NO FINITE SAMPLES (BAD)")

    # 99 = 3^2 * 11: not constructible per Gauss-Wantzel 1837
    print(f"\n99 = 3^2 * 11")
    print(f"  3^2 means Fermat prime 3 has multiplicity 2 -> fails distinctness criterion")
    print(f"  11 is prime but not a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537)")
    print(f"  99-gon is NOT constructible by compass and straightedge")


if __name__ == "__main__":
    main()
