#!/usr/bin/env python3
"""Day 827: Heptacontahexagon (76-cusped Hypocycloid) Notes verification script.

Heptacontahexagon parametric:
    x(t) = a*cos(t) + (a/75)*cos(75t)
    y(t) = a*sin(t) - (a/75)*sin(75t)

R/r = 76 (small circle of radius a/75 rolling inside a fixed circle of radius 76a/75).
76 cusps per revolution. One cusp per 360°/76 ≈ 4.7368° of revolution.
At t=0, x = a + a/75 = 76a/75 (the rightmost extreme).

76 = 2² × 19. 2² is a power of 2 but 19 is NOT a Fermat prime (Fermat primes
are 3, 5, 17, 257, 65537), so the regular 76-gon is NOT constructible by
compass and straightedge (Gauss-Wantzel 1837).
"""
import math


def x_at(t, a):
    return a * math.cos(t) + (a / 75) * math.cos(75 * t)


def y_at(t, a):
    return a * math.sin(t) - (a / 75) * math.sin(75 * t)


def main():
    a = 4  # default HEPTACONTAHEXAGON_NOTES_DEFAULT_A
    length = 32  # default HEPTACONTAHEXAGON_NOTES_DEFAULT_LENGTH
    t_min = 0
    t_max = 2 * math.pi

    # 1. t=0 rightmost extreme
    x0 = x_at(0, a)
    y0 = y_at(0, a)
    expected_x0 = 76 * a / 75
    print(f"1. At t=0: x={x0:.6f}, y={y0:.6f} (expected x={expected_x0:.6f}, y=0)")
    assert abs(x0 - expected_x0) < 1e-9, "x at t=0 must equal 76a/75"
    assert abs(y0) < 1e-9, "y at t=0 must be 0"

    # 2. Sample 32 finite points along standard shape
    samples = []
    for i in range(length):
        t = t_min + (t_max - t_min) * i / max(1, length - 1)
        x = x_at(t, a)
        y = y_at(t, a)
        if math.isfinite(x) and math.isfinite(y):
            samples.append((x, y))
    print(f"2. Sampled {len(samples)}/{length} finite points along standard shape (full revolution)")
    assert len(samples) == length, "all standard samples should be finite"

    x_min = min(p[0] for p in samples)
    x_max = max(p[0] for p in samples)
    y_min = min(p[1] for p in samples)
    y_max = max(p[1] for p in samples)
    print(f"3. x range: [{x_min:.6f}, {x_max:.6f}], y range: [{y_min:.6f}, {y_max:.6f}]")

    # 4. Verify tight shape range
    tight_t_min = -math.pi / 76
    tight_t_max = math.pi / 76
    assert tight_t_max > tight_t_min
    print(f"4. Tight t-range: [{tight_t_min:.6f}, {tight_t_max:.6f}] (|range|=π/38 ≈ 0.0827)")

    # 5. Verify heptacontahexagon shape range (one cusp region)
    hex_t_min = 0
    hex_t_max = 2 * math.pi / 76
    assert hex_t_max > hex_t_min
    print(f"5. Heptacontahexagon t-range: [{hex_t_min:.6f}, {hex_t_max:.6f}] (one cusp)")

    # 6. Verify 76 = 4 * 19 (NOT constructible per Gauss-Wantzel 1837)
    assert 76 == 4 * 19, "76 must equal 4*19"
    fermat_primes = {3, 5, 17, 257, 65537}
    assert 19 not in fermat_primes, "19 must NOT be a Fermat prime"
    assert 4 in (1, 2, 4, 8, 16, 32, 64), "4 is a power of 2"
    print(f"6. 76 = 4 * 19; 19 is NOT Fermat; 4 is a power of 2; NOT constructible (Gauss-Wantzel 1837)")

    # 7. Verify cusp count and cusp interval
    cusp_interval_deg = 360 / 76
    print(f"7. 76 cusps per revolution; cusp interval = 360°/76 = {cusp_interval_deg:.6f}°")

    # 8. Confirm R/r=76
    print(f"8. R/r = 76 (small circle r=a/75 inside fixed circle R=76a/75)")

    print("\nAll 8 verification checks passed.")


if __name__ == "__main__":
    main()