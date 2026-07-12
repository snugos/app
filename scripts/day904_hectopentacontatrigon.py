"""
Day 904: Hectopentacontatrigon (153-cusped Hypocycloid) Notes - reproducibility script.

153 = 3^2 * 17 is NOT constructible per Gauss-Wantzel 1837 (3 IS a Fermat prime
but appears with multiplicity 2 in 153, AND 17 is prime but NOT a Fermat prime,
so 153 fails the distinctness criterion on both factors: 3 has multiplicity 2
violating the distinctness requirement, AND 17 is prime but not Fermat).

Pattern identical to day903_hectopentacontadigon.py.
"""

import math
import os

PI = math.pi

# Day 904 constants (mirror js/constants.js)
DEFAULT_LENGTH = 32
DEFAULT_A = 4
DEFAULT_VELOCITY_DECAY = 0.95
N_CUSPS = 153
SMALL_CIRCLE_R_DIVISOR = 152  # R = 153a/152 = (N_CUSPS/N_CUSPS-1)*a
HECTOPENTACONTATRIGON_T_MAX = 2 * PI / 153
TIGHT_T_MAX = PI / 153

# 4 shape t-ranges (mirror js/constants.js)
T_RANGES = {
    "standard": (0, 2 * PI),
    "inverted": (2 * PI, 0),
    "hectopentacontatrigon": (0, 2 * PI / 153),
    "tight": (-PI / 153, PI / 153),
}


def xy(t, a):
    """Parametric hypocycloid for 153-cusped (R/r=153, R=153a/152, r=a/152)."""
    a_over_152 = a / 152
    x = a * math.cos(t) + a_over_152 * math.cos(152 * t)
    y = a * math.sin(t) - a_over_152 * math.sin(152 * t)
    return x, y


def check_factorization(n):
    """Return sorted list of (prime, multiplicity) pairs."""
    factors = []
    d = 2
    rem = n
    while d * d <= rem:
        if rem % d == 0:
            mult = 0
            while rem % d == 0:
                rem //= d
                mult += 1
            factors.append((d, mult))
        d += 1
    if rem > 1:
        factors.append((rem, 1))
    return factors


# Known Fermat primes: 3, 5, 17, 257, 65537
FERMAT_PRIMES = {3, 5, 17, 257, 65537}


def is_constructible(n):
    """Return (constructible: bool, reason: str)."""
    factors = check_factorization(n)
    # Pull out power-of-2
    rem_factors = []
    has_power_of_2 = False
    for p, m in factors:
        if p == 2:
            has_power_of_2 = True
        else:
            rem_factors.append((p, m))
    for p, m in rem_factors:
        if m > 1:
            return (False, f"factor {p} has multiplicity {m} (not distinct)")
        if p not in FERMAT_PRIMES:
            return (False, f"factor {p} is not a Fermat prime")
    return (True, "all odd factors are distinct Fermat primes and rest is power of 2")


def main():
    print(f"=== Day 904: Hectopentacontatrigon (153-cusped Hypocycloid) ===")
    print(f"N_CUSPS = {N_CUSPS}")
    print(f"SMALL_CIRCLE_R_DIVISOR = {SMALL_CIRCLE_R_DIVISOR} (R/r = N_CUSPS)")

    factors = check_factorization(N_CUSPS)
    print(f"Factorization of {N_CUSPS}: {factors}")
    constructible, reason = is_constructible(N_CUSPS)
    print(f"Constructible per Gauss-Wantzel 1837: {constructible} ({reason})")

    print()
    print(f"--- T-ranges for 4 shape variants ---")
    for shape, (t_min, t_max) in T_RANGES.items():
        print(f"  {shape}: [{t_min:.6f}, {t_max:.6f}]")

    print()
    print(f"--- Parametric samples (N=32 per shape) ---")
    NUM_SAMPLES = DEFAULT_LENGTH
    a = DEFAULT_A
    all_ok = True
    for shape, (t_min, t_max) in T_RANGES.items():
        samples = []
        for i in range(NUM_SAMPLES):
            t = t_min + (t_max - t_min) * i / max(1, NUM_SAMPLES - 1)
            x, y = xy(t, a)
            samples.append((x, y))
        finite_count = sum(1 for x, y in samples if math.isfinite(x) and math.isfinite(y))
        x_values = [x for x, _ in samples]
        y_values = [y for _, y in samples]
        x_min, x_max = min(x_values), max(x_values)
        y_min, y_max = min(y_values), max(y_values)
        ok = finite_count == NUM_SAMPLES
        all_ok = all_ok and ok
        print(f"  {shape}: {finite_count}/{NUM_SAMPLES} finite, "
              f"xRange=[{x_min:.4f}, {x_max:.4f}] yRange=[{y_min:.4f}, {y_max:.4f}]"
              f"{' OK' if ok else ' FAIL'}")

    # Check t=0 cusp
    x0, y0 = xy(0, a)
    expected_x0 = N_CUSPS * a / (N_CUSPS - 1)  # R = N_CUSPS * a / (N_CUSPS - 1)
    print()
    print(f"--- Cusp check at t=0 ---")
    print(f"x(0) = {x0:.6f}  (expected {expected_x0:.6f} = {N_CUSPS}a/{N_CUSPS - 1})")
    print(f"y(0) = {y0:.6f}  (expected 0)")

    # Cusp interval
    cusp_deg = 360.0 / N_CUSPS
    cusp_rad = 2 * PI / N_CUSPS
    print()
    print(f"--- Cusp interval ---")
    print(f"360/{N_CUSPS} = {cusp_deg:.6f} degrees per cusp")
    print(f"2*PI/{N_CUSPS} = {cusp_rad:.6f} rad per cusp")

    print()
    print(f"=== Summary ===")
    print(f"All 4 shapes produced {NUM_SAMPLES}/{NUM_SAMPLES} finite samples: {all_ok}")
    print(f"N=153 = 3^2 * 17 NOT constructible per Gauss-Wantzel 1837 (3 has multiplicity 2 AND 17 is not a Fermat prime)")
    print(f"Naming: hectopentacontatrigon (hecto=100, pentaconta=50, tri=3, total=153)")


if __name__ == "__main__":
    main()
