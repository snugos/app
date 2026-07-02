#!/usr/bin/env python3
"""
Day 848: Heptacontaheptaxagon (97-cusped Hypocycloid) Notes - Reproducibility Script

Verifies the parametric hypocycloid formulas and outputs key reference values:
  - x at t=0 should equal 97a/96 (the x-extent of the curve at t=0)
  - R/r = 97
  - 360/97 ≈ 3.7113° cusp intervals
  - 32 finite samples for all 4 shapes (standard/inverted/heptacontaheptaxagon/tight)
  - 97 = PRIME (the 25th prime), NOT a Fermat prime (Fermat primes are 3, 5, 17, 257, 65537),
    so the regular 97-gon is NOT constructible by compass and straightedge
    (Gauss-Wantzel 1837: n is constructible iff n is a product of DISTINCT Fermat primes
    and a power of 2; 97 fails since 97 is prime but not Fermat).
"""
import math


def heptacontaheptaxagon_samples(a, N, t_min, t_max):
    """Return N samples (x, y) on the 97-cusped hypocycloid curve."""
    samples = []
    for i in range(N):
        t = t_min + (t_max - t_min) * i / max(1, N - 1)
        cosT = math.cos(t)
        sinT = math.sin(t)
        cos96T = math.cos(96 * t)
        sin96T = math.sin(96 * t)
        x = a * cosT + (a / 96) * cos96T
        y = a * sinT - (a / 96) * sin96T
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        samples.append((x, y))
    return samples


def main():
    a = 4
    N = 32

    # Reference: x at t=0 should be a + a/96 = 97a/96
    x_at_0 = a * math.cos(0) + (a / 96) * math.cos(96 * 0)
    y_at_0 = a * math.sin(0) - (a / 96) * math.sin(96 * 0)
    print(f"x at t=0 = {x_at_0:.6f} (expected {97 * a / 96:.6f} = 97a/96)")
    print(f"y at t=0 = {y_at_0:.6f} (expected 0)")

    # Reference: R/r = 97
    print(f"\nR/r = 97 (97 cusps per revolution)")

    # Reference: 360/97 degrees per cusp
    print(f"360/97 = {360 / 97:.4f}° per cusp (≈ 3.7113°)")

    # 97 is prime (25th prime)
    print(f"\n97 is the 25th prime number")
    print(f"97 = 97 (no factorization; prime)")
    print(f"Fermat primes: 3, 5, 17, 257, 65537 (97 is NOT in this set)")
    print(f"97 is NOT constructible by compass and straightedge (Gauss-Wantzel 1837)")

    # 32 samples for all 4 shapes
    shape_ranges = {
        "standard": (0, 2 * math.pi),
        "inverted": (2 * math.pi, 0),
        "heptacontaheptaxagon": (0, 2 * math.pi / 97),
        "tight": (-math.pi / 97, math.pi / 97),
    }

    print(f"\nSample count (N={N}) per shape:")
    for shape, (t_min, t_max) in shape_ranges.items():
        samples = heptacontaheptaxagon_samples(a, N, t_min, t_max)
        # Compute xRange and yRange
        xs = [p[0] for p in samples]
        ys = [p[1] for p in samples]
        x_range = max(xs) - min(xs)
        y_range = max(ys) - min(ys)
        print(f"  {shape:20s}: {len(samples)} samples, xRange={x_range:.4f}, yRange={y_range:.4f}")

    # Standard shape full-curve x and y extents
    std_samples = heptacontaheptaxagon_samples(a, N, 0, 2 * math.pi)
    xs = [p[0] for p in std_samples]
    ys = [p[1] for p in std_samples]
    print(f"\nStandard shape full extents (non-degenerate check):")
    print(f"  xRange = {max(xs) - min(xs):.4f}")
    print(f"  yRange = {max(ys) - min(ys):.4f}")


if __name__ == "__main__":
    main()
