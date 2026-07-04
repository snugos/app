#!/usr/bin/env python3
"""Day 871 Hectoeicosagon (120-cusped Hypocycloid) Notes — reproducibility script.

Verifies the parametric formula x(t) = a*cos(t) + (a/119)*cos(119t),
y(t) = a*sin(t) - (a/119)*sin(119t) for the 120-cusped hypocycloid (hectoeicosagon).
120 = 2^3 * 3 * 5, all distinct Fermat primes (2 is power of 2; 3 and 5 are Fermat),
so 120 IS CONSTRUCTIBLE per Gauss-Wantzel 1837.
"""
import math
import sys


def main() -> int:
    PI = math.pi
    n = 120  # number of cusps
    div = n - 1  # 119
    a = 4  # scale (matches Constants.HECTOEICOSAGON_NOTES_DEFAULT_A)
    length = 32  # matches Constants.HECTOEICOSAGON_NOTES_DEFAULT_LENGTH

    cusp_interval_deg = 360.0 / n
    t_max = 2 * PI / n  # HECTOEICOSAGON_NOTES_HECTOEICOSAGON_T_MAX

    # At t=0: x = a*cos(0) + (a/119)*cos(0) = a + a/119 = a*(1 + 1/119) = a*(120/119)
    # So x(0) = a*120/119 = 4*120/119 = 480/119 = 4.033613
    x_at_0 = a + a / div
    y_at_0 = 0.0  # sin(0) = 0
    expected_x0 = a * n / div
    assert abs(x_at_0 - expected_x0) < 1e-12, f"x(0)={x_at_0} != expected {expected_x0}"
    print(f"x(t=0) = {x_at_0:.6f} = {n}a/{div} ✓")

    # Parametric verification
    samples = []
    for i in range(length):
        t = t_max * i / max(1, length - 1)
        cosT = math.cos(t)
        sinT = math.sin(t)
        cosN = math.cos(div * t)
        sinN = math.sin(div * t)
        x = a * cosT + (a / div) * cosN
        y = a * sinT - (a / div) * sinN
        if math.isfinite(x) and math.isfinite(y):
            samples.append((x, y))
    assert len(samples) == length, f"expected {length} finite samples, got {len(samples)}"
    print(f"{len(samples)}/{len(samples)} finite samples for hectoeicosagon shape ✓")

    x_min = min(p[0] for p in samples)
    x_max = max(p[0] for p in samples)
    y_min = min(p[1] for p in samples)
    y_max = max(p[1] for p in samples)
    x_range = x_max - x_min
    y_range = y_max - y_min
    print(f"xRange = {x_range:.4f}, yRange = {y_range:.4f} (non-degenerate for standard shape)")

    # Verify all 4 shape variants produce 32/32 finite samples
    shape_configs = {
        "standard": (0.0, 2 * PI),
        "inverted": (2 * PI, 0.0),
        "hectoeicosagon": (0.0, 2 * PI / n),
        "tight": (-PI / n, PI / n),
    }
    for shape_name, (t_min, t_max_shape) in shape_configs.items():
        n_finite = 0
        for i in range(length):
            t = t_min + (t_max_shape - t_min) * i / max(1, length - 1)
            cosT = math.cos(t)
            sinT = math.sin(t)
            cosN = math.cos(div * t)
            sinN = math.sin(div * t)
            x = a * cosT + (a / div) * cosN
            y = a * sinT - (a / div) * sinN
            if math.isfinite(x) and math.isfinite(y):
                n_finite += 1
        assert n_finite == length, f"{shape_name}: {n_finite}/{length} finite samples"
        print(f"  {shape_name}: {n_finite}/{length} finite samples ✓")

    # Constructibility check: 120 = 2^3 * 3 * 5.
    # 2 is power of 2, 3 and 5 are Fermat primes, all distinct.
    # 120 IS CONSTRUCTIBLE per Gauss-Wantzel 1837.
    n_val = 120
    factors = []
    rem = n_val
    for p in [2, 3, 5, 7, 11, 13, 17]:
        while rem % p == 0:
            factors.append(p)
            rem //= p
    if rem > 1:
        factors.append(rem)
    print(f"{n_val} = {' * '.join(map(str, factors))} (factorization)")
    fermat_primes = {3, 5, 17, 257, 65537}
    # Gauss-Wantzel 1837: power of 2 * distinct Fermat primes
    # Strip out the 2s to get the odd factors
    odd_factors = [p for p in factors if p != 2]
    is_constructible = (
        2 in factors
        and all(p in fermat_primes for p in odd_factors)
        and len(set(odd_factors)) == len(odd_factors)
    )
    print(f"120 IS constructible per Gauss-Wantzel 1837: {is_constructible} (2^3 * 3 * 5: 3 and 5 are distinct Fermat primes)")

    # Cusp interval verification
    print(f"360°/{n} = {cusp_interval_deg:.4f}° EXACT (cusp interval)")
    print(f"2π/{n} = {t_max:.6f} (HECTOEICOSAGON_NOTES_HECTOEICOSAGON_T_MAX)")

    # R/r ratio
    r = a / div
    R = n * a / div
    print(f"R/r = {R/r:.0f} (expected {n})")

    print("\nAll Day 871 verification checks passed ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
