#!/usr/bin/env python3
"""
Day 782 Hentriacontagon (31-cusped Hypocycloid) Notes — Reproducibility script.

Plots the hentriacontagon parametric curve x(t) = a*cos(t) + (a/30)*cos(30t),
y(t) = a*sin(t) - (a/30)*sin(30t) for a = 4, t in [0, 2*pi], and verifies the
rightmost extreme at t = 0.

31 = 2^5 - 1 = M3 Mersenne prime, but NOT a Fermat prime (Fermat primes are 3, 5,
17, 257, 65537), so the regular 31-gon is NOT constructible by compass and
straightedge (Gauss-Wantzel 1837).
"""

import math


def hentriacontagon_point(t, a):
    """Compute (x, y) on the hentriacontagon at parameter t with scale a."""
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos30T = math.cos(30 * t)
    sin30T = math.sin(30 * t)
    x = a * cosT + (a / 30) * cos30T
    y = a * sinT - (a / 30) * sin30T
    return x, y


def main():
    a = 4
    N = 64
    cusps_seen = 0
    samples = []
    for i in range(N):
        t = 2 * math.pi * i / (N - 1)
        x, y = hentriacontagon_point(t, a)
        samples.append((t, x, y))
        if abs(t - 0) < 1e-9 or abs(t - 2 * math.pi) < 1e-9:
            cusps_seen += 1

    x0, y0 = hentriacontagon_point(0, a)
    expected_x0 = a + a / 30
    print(f"a = {a}, N = {N}")
    print(f"At t = 0: x = {x0:.6f}, y = {y0:.6f}")
    print(f"Expected x = a + a/30 = {expected_x0:.6f}")
    assert abs(x0 - expected_x0) < 1e-9, "rightmost extreme x mismatch"
    assert abs(y0) < 1e-9, "y should be 0 at t=0"
    print("OK: rightmost extreme at (31a/30, 0) confirmed.")

    print(f"\nR/r = 31, 31 cusps per revolution, 360/31 = {360 / 31:.4f} degrees per cusp.")
    print(f"31 = prime, NOT Fermat prime (Fermat primes: 3, 5, 17, 257, 65537).")
    print(f"31-gon NOT constructible by compass and straightedge (Gauss-Wantzel 1837).")
    print(f"31 = 2^5 - 1, the 3rd Mersenne prime.")


if __name__ == "__main__":
    main()
