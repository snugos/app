#!/usr/bin/env python3
"""
Day 791: Tetracontagon (40-cusped Hypocycloid) Notes — Reproducibility Script

Generates sample (x, y) coordinates along a tetracontagon (40-cusped hypocycloid)
parametric curve for verification of the SnugOS Day 791 feature.

The tetracontagon parametric equations:
    x(t) = a * cos(t) + (a / 39) * cos(39 * t)
    y(t) = a * sin(t) - (a / 39) * sin(39 * t)

where a is the scale parameter and t is the angle parameter.
The tetracontagon has 40 inward-pointing cusps (R/r=40, R = 40a/39, r = a/39).
40 = 2^3 * 5 (a product of a power of 2 and the Fermat prime 5), making
the regular tetracontagon constructible by compass and straightedge
(Gauss-Wantzel 1837 theorem).

Run: python3 scripts/day791_tetracontagon.py
"""

import math


def tetracontagon_samples(a=4, length=32, t_min=0.0, t_max=2 * math.pi):
    """Generate samples along a tetracontagon (40-cusped hypocycloid) curve."""
    samples = []
    a_over_39 = a / 39
    denom = max(1, length - 1)
    for i in range(length):
        t = t_min + (t_max - t_min) * i / denom
        cos_t = math.cos(t)
        sin_t = math.sin(t)
        cos_39t = math.cos(39 * t)
        sin_39t = math.sin(39 * t)
        x = a * cos_t + a_over_39 * cos_39t
        y = a * sin_t - a_over_39 * sin_39t
        if math.isfinite(x) and math.isfinite(y):
            samples.append((x, y))
    return samples


def main():
    print("Day 791: Tetracontagon (40-cusped Hypocycloid) Notes — Sample Generator")
    print("=" * 72)
    print()

    print(f"Parametric form:")
    print(f"  x(t) = a * cos(t) + (a/39) * cos(39t)")
    print(f"  y(t) = a * sin(t) - (a/39) * sin(39t)")
    print()
    print(f"40 = 2^3 * 5 (constructible by compass and straightedge, Gauss-Wantzel 1837)")
    print(f"40 inward-pointing cusps, evenly distributed at 360/40 = 9 degree intervals")
    print(f"40-fold rotational D40 dihedral symmetry")
    print()

    samples = tetracontagon_samples(a=4, length=32)
    print(f"Generated {len(samples)} samples (a=4, length=32, t in [0, 2π]):")
    print()
    print(f"{'i':>3}  {'t (rad)':>12}  {'x':>14}  {'y':>14}")
    print(f"{'-'*3}  {'-'*12}  {'-'*14}  {'-'*14}")

    for i, (x, y) in enumerate(samples[:8]):
        t = 2 * math.pi * i / max(1, len(samples) - 1)
        print(f"{i:>3}  {t:>12.6f}  {x:>14.6f}  {y:>14.6f}")

    print(f"  ... ({len(samples) - 16} more samples) ...")

    for i in range(max(0, len(samples) - 8), len(samples)):
        t = 2 * math.pi * i / max(1, len(samples) - 1)
        x, y = samples[i]
        print(f"{i:>3}  {t:>12.6f}  {x:>14.6f}  {y:>14.6f}")

    print()
    print(f"Verification at t=0:")
    x0 = 4 * math.cos(0) + (4 / 39) * math.cos(39 * 0)
    y0 = 4 * math.sin(0) - (4 / 39) * math.sin(39 * 0)
    print(f"  x(0) = {x0:.10f} (expected 4 + 4/39 = {4 + 4/39:.10f}, i.e. 40*4/39)")
    print(f"  y(0) = {y0:.10f} (expected 0)")
    print()
    print(f"At t=0, the tetracontagon is at its rightmost extreme (40a/39, 0).")
    print()

    xs = [s[0] for s in samples]
    ys = [s[1] for s in samples]
    print(f"Bounding box (N={len(samples)} samples):")
    print(f"  x range: [{min(xs):.6f}, {max(xs):.6f}]")
    print(f"  y range: [{min(ys):.6f}, {max(ys):.6f}]")


if __name__ == "__main__":
    main()
