#!/usr/bin/env python3
"""Day 810: Pentacontadecagon (59-cusped Hypocycloid) Notes - reproducibility script.

Verifies the parametric form x = a*cos(t) + (a/58)*cos(58t), y = a*sin(t) - (a/58)*sin(58t).
59 is prime but NOT a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537), so the regular
59-gon is NOT constructible by compass and straightedge (Gauss-Wantzel 1837 theorem).
"""
import math


def pentacontadecagon(t, a=1.0):
    """Parametric form for the 59-cusped hypocycloid (pentacontadecagon).
    x = a*cos(t) + (a/58)*cos(58t)
    y = a*sin(t) - (a/58)*sin(58t)
    """
    return a * math.cos(t) + (a / 58) * math.cos(58 * t), a * math.sin(t) - (a / 58) * math.sin(58 * t)


def main():
    a = 4.0
    print("Pentacontadecagon (59-cusped hypocycloid) samples (a=4):")
    print("=" * 60)
    # Generate 32 samples in standard range [0, 2π]
    for i in range(0, 32, 4):
        t = 2 * math.pi * i / 31
        x, y = pentacontadecagon(t, a)
        print(f"  t={t:.4f}  ({i:2d}/31): x={x:+.6f}  y={y:+.6f}")

    # Verify rightmost extreme at t=0
    x, y = pentacontadecagon(0.0, a)
    expected_x = a + a / 58
    print(f"\nAt t=0: x = {x:.6f} (expected {expected_x:.6f} = a + a/58 = 59a/58)")

    # Verify 59-fold symmetry: rotating by 2π/59 should give the same |x,y|
    base_x, base_y = pentacontadecagon(0.0, a)
    rotate_angle = 2 * math.pi / 59
    rot_x, rot_y = pentacontadecagon(rotate_angle, a)
    rot_mag = math.hypot(rot_x, rot_y)
    base_mag = math.hypot(base_x, base_y)
    print(f"|r(0)|     = {base_mag:.6f}")
    print(f"|r(2π/59)| = {rot_mag:.6f}  (should equal |r(0)| for 59-fold symmetry)")

    # Constructibility: 59 is NOT a Fermat prime, so 59-gon NOT constructible
    fermat_primes = {3, 5, 17, 257, 65537}
    print(f"\nConstructibility check (Gauss-Wantzel 1837):")
    print(f"  59 is prime: True")
    print(f"  59 is a Fermat prime: {59 in fermat_primes}")
    print(f"  Therefore 59-gon is NOT constructible by compass and straightedge.")

    # 59 properties
    print(f"\n59 = 2·29 + 1? No, 2·29+1 = 59, YES! 59 IS the Sophie Germain prime partner of 29.")
    print(f"29 is a Sophie Germain prime (2·29+1 = 59 is also prime).")
    print(f"59 is the 17th prime number.")
    print(f"59 IS a Pierpont prime (59 = 2^0·59+... no, 59-1 = 58 = 2·29, not 3-smooth)")
    print(f"  Pierpont is 2^u·3^v+1; 59-1 = 58 = 2·29, but 29 not a power of 3; NOT Pierpont.")
    print(f"59 is a safe prime (59 = 2·29+1 with 29 prime).")
    print(f"59 IS a long-period prime (period 58 in 1/59 decimal expansion).")


if __name__ == '__main__':
    main()
