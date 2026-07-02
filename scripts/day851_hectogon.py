#!/usr/bin/env python3
"""
Day 851: Hectogon (100-cusped Hypocycloid) Notes - Reproducibility Script

Verifies the parametric hypocycloid formulas and outputs key reference values:
  - x at t=0 should equal 100a/99 (the x-extent of the curve at t=0)
  - R/r = 100
  - 360/100 = 3.6° cusp intervals EXACT
  - 32 finite samples for all 4 shapes (standard/inverted/hectogon/tight)
  - 100 = 2^2 * 5^2 (NOT constructible per Gauss-Wantzel 1837 since 5 has
    multiplicity 2 in 5^2, failing the distinctness criterion despite
    2 being a power of 2 and 5 being a Fermat prime)
"""
import math


def hectogon_samples(a, N, t_min, t_max):
    """Return N samples (x, y) on the 100-cusped hypocycloid curve."""
    samples = []
    for i in range(N):
        t = t_min + (t_max - t_min) * i / max(1, N - 1)
        cosT = math.cos(t)
        sinT = math.sin(t)
        cos99T = math.cos(99 * t)
        sin99T = math.sin(99 * t)
        x = a * cosT + (a / 99) * cos99T
        y = a * sinT - (a / 99) * sin99T
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        samples.append((x, y))
    return samples


def main():
    a = 4
    N = 32

    # Reference: x at t=0 should be a + a/99 = 100a/99
    x_at_0 = a * math.cos(0) + (a / 99) * math.cos(99 * 0)
    print(f"x at t=0 (a=4) = {x_at_0:.6f} = 100a/99 = {a * 100 / 99:.6f}")

    # R/r = 100, 100 cusps per revolution
    print(f"R/r = 100 (small circle r=a/99 rolling inside fixed circle R=100a/99)")

    # Cusp intervals
    cusp_interval = 360.0 / 100
    print(f"Cusp interval = 360/100 = {cusp_interval}° EXACT = 2pi/100 = {2 * math.pi / 100:.6f} rad")

    # Standard, Inverted, Hectogon, Tight shape t-ranges
    ranges = {
        "standard": (0, 2 * math.pi),
        "inverted": (2 * math.pi, 0),
        "hectogon": (0, 2 * math.pi / 100),
        "tight": (-math.pi / 100, math.pi / 100),
    }
    for shape_name, (t_min, t_max) in ranges.items():
        s = hectogon_samples(a, N, t_min, t_max)
        if s:
            xs = [p[0] for p in s]
            ys = [p[1] for p in s]
            print(f"  {shape_name:20s}: N_finite={len(s):2d}  xRange=[{min(xs):.4f}, {max(xs):.4f}]  yRange=[{min(ys):.4f}, {max(ys):.4f}]")
        else:
            print(f"  {shape_name:20s}: NO FINITE SAMPLES (BAD)")

    # 100 = 2^2 * 5^2: not constructible per Gauss-Wantzel 1837
    print(f"\n100 = 2^2 * 5^2")
    print(f"  5^2 means Fermat prime 5 has multiplicity 2 -> fails distinctness criterion")
    print(f"  2^2 IS a power of 2, and 5 IS a Fermat prime, but 5^2's multiplicity violation disqualifies n=100")
    print(f"  100-gon is NOT constructible by compass and straightedge")


if __name__ == "__main__":
    main()
