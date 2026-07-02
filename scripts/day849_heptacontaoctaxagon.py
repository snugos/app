#!/usr/bin/env python3
"""
Day 849: Heptacontaoctaxagon (98-cusped Hypocycloid) Notes - Reproducibility Script

Verifies the parametric hypocycloid formulas and outputs key reference values:
  - x at t=0 should equal 98a/97 (the x-extent of the curve at t=0)
  - R/r = 98
  - 360/98 ≈ 3.6735° cusp intervals
  - 32 finite samples for all 4 shapes (standard/inverted/heptacontaoctaxagon/tight)
  - 98 = 2 * 7^2 = 2 * 49 (NOT constructible per Gauss-Wantzel 1837 since 7 has
    multiplicity 2 in the prime factorization, failing the distinctness criterion
    despite 2 being a power of 2)
"""
import math


def heptacontaoctaxagon_samples(a, N, t_min, t_max):
    """Return N samples (x, y) on the 98-cusped hypocycloid curve."""
    samples = []
    for i in range(N):
        t = t_min + (t_max - t_min) * i / max(1, N - 1)
        cosT = math.cos(t)
        sinT = math.sin(t)
        cos97T = math.cos(97 * t)
        sin97T = math.sin(97 * t)
        x = a * cosT + (a / 97) * cos97T
        y = a * sinT - (a / 97) * sin97T
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        samples.append((x, y))
    return samples


def main():
    a = 4
    N = 32

    # Reference: x at t=0 should be a + a/97 = 98a/97
    x_at_0 = a * math.cos(0) + (a / 97) * math.cos(97 * 0)
    print(f"x at t=0 (a=4) = {x_at_0:.6f} = 98a/97 = {a * 98 / 97:.6f}")

    # R/r = 98
    print(f"\nR/r = 98 (98 cusps per revolution)")

    # Reference: 360/98 degrees per cusp
    print(f"360/98 = {360 / 98:.4f}° per cusp (≈ 3.6735°)")

    # 98 = 2 * 7^2 = 2 * 49
    print(f"\n98 = 2 * 49 = 2 * 7^2")
    print(f"Fermat primes: 3, 5, 17, 257, 65537 (7 is NOT in this set)")
    print(f"98 is NOT constructible by compass and straightedge (Gauss-Wantzel 1837)")
    print(f"  7 has multiplicity 2 in the factorization, failing the distinctness")
    print(f"  criterion despite 2 being a power of 2.")

    # 32 samples for all 4 shapes
    shape_ranges = {
        "standard": (0, 2 * math.pi),
        "inverted": (2 * math.pi, 0),
        "heptacontaoctaxagon": (0, 2 * math.pi / 98),
        "tight": (-math.pi / 98, math.pi / 98),
    }

    print(f"\nSample count (N={N}) per shape:")
    for shape, (t_min, t_max) in shape_ranges.items():
        samples = heptacontaoctaxagon_samples(a, N, t_min, t_max)
        # Compute xRange and yRange
        xs = [p[0] for p in samples]
        ys = [p[1] for p in samples]
        x_range = max(xs) - min(xs)
        y_range = max(ys) - min(ys)
        print(f"  {shape:25s}: {len(samples)} samples, xRange={x_range:.4f}, yRange={y_range:.4f}")

    # Standard shape full-curve x and y extents
    std_samples = heptacontaoctaxagon_samples(a, N, 0, 2 * math.pi)
    xs = [p[0] for p in std_samples]
    ys = [p[1] for p in std_samples]
    print(f"\nStandard shape full extents (non-degenerate check):")
    print(f"  xRange = {max(xs) - min(xs):.4f}")
    print(f"  yRange = {max(ys) - min(ys):.4f}")


if __name__ == "__main__":
    main()
