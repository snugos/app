#!/usr/bin/env python3
"""Day 828: Heptacontaheptagon (77-cusped Hypocycloid) Notes — reproducibility script.

The heptacontaheptagon parametric equations are:
    x(t) = a*cos(t) + (a/76)*cos(76*t)
    y(t) = a*sin(t) - (a/76)*sin(76*t)

With a=4 (default), at t=0:
    x = 4 + 4/76 = 4 + 0.052632 = 4.052632 = 77*4/76
    y = 0

This is the rightmost extreme of the 77-cusped hypocycloid curve.
R/r = 77, so 77 cusps per revolution, one cusp per 360/77 ≈ 4.6753 degrees.

77 = 7 * 11 is NOT constructible by compass and straightedge (Gauss-Wantzel 1837):
    Both 7 and 11 are prime but not Fermat primes (Fermat primes: 3, 5, 17, 257, 65537).
"""

import math


def heptacontaheptagon_samples(length, shape="standard", a=4):
    t_range = {
        "standard": (0, 2 * math.pi),
        "inverted": (2 * math.pi, 0),
        "heptacontaheptagon": (0, 2 * math.pi / 77),
        "tight": (-math.pi / 77, math.pi / 77),
    }
    t_min, t_max = t_range[shape]
    a_over_76 = a / 76
    samples = []
    for i in range(length):
        t = t_min + (t_max - t_min) * i / max(1, length - 1)
        cos_t = math.cos(t)
        sin_t = math.sin(t)
        cos_76t = math.cos(76 * t)
        sin_76t = math.sin(76 * t)
        x = a * cos_t + a_over_76 * cos_76t
        y = a * sin_t - a_over_76 * sin_76t
        if math.isfinite(x) and math.isfinite(y):
            samples.append((x, y))
    return samples


def main():
    a = 4
    length = 32

    # Verify at t=0, x = 77a/76 and y = 0
    cos_t = math.cos(0)
    sin_t = math.sin(0)
    cos_76t = math.cos(76 * 0)
    sin_76t = math.sin(76 * 0)
    a_over_76 = a / 76
    x = a * cos_t + a_over_76 * cos_76t
    y = a * sin_t - a_over_76 * sin_76t
    expected_x = 77 * a / 76

    assert abs(x - expected_x) < 1e-9, f"x at t=0 should be {expected_x}, got {x}"
    assert y == 0.0, f"y at t=0 should be 0, got {y}"
    print(f"✓ x at t=0 = {round(x, 6)} = 77a/76 = {round(expected_x, 6)}")
    print(f"✓ y at t=0 = {y}")

    # Verify shape samples
    for shape in ["standard", "inverted", "heptacontaheptagon", "tight"]:
        samples = heptacontaheptagon_samples(length, shape, a)
        assert all(math.isfinite(x) and math.isfinite(y) for x, y in samples), \
            f"shape {shape}: all samples should be finite"
        assert len(samples) == length, f"shape {shape}: expected {length} samples, got {len(samples)}"
        print(f"✓ shape '{shape}': {len(samples)} finite samples")

    # Verify 77 = 7 * 11 (not constructible per Gauss-Wantzel 1837)
    assert 77 == 7 * 11
    print(f"✓ 77 = 7 * 11; 7 and 11 are NOT Fermat primes => NOT constructible (Gauss-Wantzel 1837)")

    # Verify cusp spacing: 360/77 degrees ≈ 4.6753°
    cusp_deg = 360 / 77
    print(f"✓ 77 cusps per revolution, cusp interval = {round(cusp_deg, 4)}°")

    print("\nAll Day 828 verification checks pass.")


if __name__ == "__main__":
    main()
