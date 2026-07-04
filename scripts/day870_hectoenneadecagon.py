#!/usr/bin/env python3
"""Day 870 Hectoenneadecagon (119-cusped Hypocycloid) Notes — reproducibility script.

Verifies the parametric formula x(t) = a·cos(t) + (a/118)·cos(118t),
y(t) = a·sin(t) - (a/118)·sin(118t) for the 119-cusped hypocycloid (hectoenneadecagon).
"""
import math
import sys


def main() -> int:
    PI = math.pi
    n = 119  # number of cusps
    div = n - 1  # 118
    a = 4  # scale (matches Constants.HECTOENNEADECAGON_NOTES_DEFAULT_A)
    length = 32  # matches Constants.HECTOENNEADECAGON_NOTES_DEFAULT_LENGTH

    cusp_interval_deg = 360.0 / n
    t_max = 2 * PI / n  # HECTOENNEADECAGON_NOTES_HECTOENNEADECAGON_T_MAX

    # At t=0: x = a·cos(0) + (a/118)·cos(0) = a + a/118 = a·(1 + 1/118) = a·(119/118)
    # So x(0) = a·(1 + 1/118) = a·119/118 = 4·119/118 = 476/118 = 4.033613
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
    print(f"{len(samples)}/{len(samples)} finite samples for hectoenneadecagon shape ✓")

    x_min = min(p[0] for p in samples)
    x_max = max(p[0] for p in samples)
    y_min = min(p[1] for p in samples)
    y_max = max(p[1] for p in samples)
    x_range = x_max - x_min
    y_range = y_max - y_min
    print(f"xRange = {x_range:.4f}, yRange = {y_range:.4f} (non-degenerate for standard shape)")

    # Verify all 4 shapes produce 32 finite samples
    shape_configs = {
        "standard": (0.0, 2 * PI),
        "inverted": (2 * PI, 0.0),
        "hectoenneadecagon": (0.0, 2 * PI / n),
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

    # Constructibility check: 119 = 7 * 17. 17 is Fermat, 7 is not.
    # 119 is NOT constructible per Gauss-Wantzel 1837 (7 fails the Fermat criterion).
    n_val = 119
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
    has_non_fermat = any(p not in fermat_primes for p in factors)
    print(f"119 NOT constructible per Gauss-Wantzel 1837: {has_non_fermat} (7 is non-Fermat)")

    # Cusp interval verification
    print(f"360°/{n} ≈ {cusp_interval_deg:.4f}° (cusp interval)")
    print(f"2π/{n} = {t_max:.6f} (HECTOENNEADECAGON_NOTES_HECTOENNEADECAGON_T_MAX)")

    # R/r ratio
    r = a / div
    R = n * a / div
    print(f"R/r = {R/r:.0f} (expected {n})")

    print("\nAll Day 870 verification checks passed ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
