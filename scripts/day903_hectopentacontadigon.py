"""
Day 903: Hectopentacontadigon (152-cusped Hypocycloid) Notes - reproducibility script.

152 = 2^3 * 19 is NOT constructible per Gauss-Wantzel 1837 (8 IS a power of 2 AND
19 is prime but NOT a Fermat prime, so 152 fails the distinctness criterion on
the 19 factor even though 8 is a power of 2). The 152-cusped hypocycloid is the
52nd value in the 100+ post-100 hypocycloid series, continuing the pattern
established by Day 901 (hectopentacontagon, 150) and Day 902
(hectopentacontahenagon, 151).

Naming: hectopentacontadigon (hecto=100, pentaconta=50, di=2, total=152)
Parametric: x(t) = a*cos(t) + (a/151)*cos(151t), y(t) = a*sin(t) - (a/151)*sin(151t)
R/r = 152, 152 cusps per revolution, one cusp per 360/152 = 2.368421 degrees
= 2*pi/152 = 0.041337 rad.

This script verifies the math and prints finite-sample checks for all 4 shape
variants, mirroring scripts/day902_hectopentacontahenagon.py.
"""

import math
import os

PI = math.pi

# Day 903 constants (mirror js/constants.js)
DEFAULT_LENGTH = 32
DEFAULT_A = 4
DEFAULT_VELOCITY_DECAY = 0.95

N_CUSPS = 152
SMALL_CIRCLE_R_DIVISOR = N_CUSPS - 1  # 151, so R = a * 152/151

DEFAULT_T_MIN = 0.0
DEFAULT_T_MAX = 2 * PI
INVERTED_T_MIN = 2 * PI
INVERTED_T_MAX = 0.0
HECTOPENTACONTADIGON_T_MIN = 0.0
HECTOPENTACONTADIGON_T_MAX = 2 * PI / 152
TIGHT_T_MIN = -PI / 152
TIGHT_T_MAX = PI / 152

SHAPES = {
    "standard": (DEFAULT_T_MIN, DEFAULT_T_MAX),
    "inverted": (INVERTED_T_MIN, INVERTED_T_MAX),
    "hectopentacontadigon": (HECTOPENTACONTADIGON_T_MIN, HECTOPENTACONTADIGON_T_MAX),
    "tight": (TIGHT_T_MIN, TIGHT_T_MAX),
}

NUM_SAMPLES = 32


def hypocycloid_xy(t, a):
    """Parametric hypocycloid for 152-cusped (R/r=152, R=152a/151, r=a/151)."""
    a_over_151 = a / 151
    x = a * math.cos(t) + a_over_151 * math.cos(151 * t)
    y = a * math.sin(t) - a_over_151 * math.sin(151 * t)
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


def is_fermat_prime(p):
    """Fermat primes: 3, 5, 17, 257, 65537 (F0=3, F1=5, F2=17, F3=257, F4=65537)."""
    return p in (3, 5, 17, 257, 65537)


def gauss_wantzel_constructible(n):
    """n is constructible iff n is a product of distinct Fermat primes and a power of 2."""
    if n <= 0:
        return False
    factors = check_factorization(n)
    # Strip 2s into a power-of-2 factor
    power_of_2 = 1
    odd_factors = []
    for p, mult in factors:
        if p == 2:
            power_of_2 = 2 ** mult
        else:
            odd_factors.append((p, mult))
    # Distinctness: every odd prime must be a Fermat prime, and each with multiplicity 1
    for p, mult in odd_factors:
        if not is_fermat_prime(p):
            return False, f"{p} is NOT a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537)"
        if mult != 1:
            return False, f"{p} has multiplicity {mult} (distinctness requires 1)"
    return True, "OK"


print("=" * 64)
print(f"Day 903: Hectopentacontadigon ({N_CUSPS}-cusped Hypocycloid) Notes")
print("=" * 64)
print()

print(f"N_CUSPS = {N_CUSPS}")
print(f"SMALL_CIRCLE_R_DIVISOR = {SMALL_CIRCLE_R_DIVISOR} (R/r = N_CUSPS)")
print(f"2*PI/{N_CUSPS} = {2 * PI / N_CUSPS:.6f} rad")
print(f"360/{N_CUSPS} = {360 / N_CUSPS:.6f} deg cusp interval")
print(f"x at t=0 with a=4: {hypocycloid_xy(0.0, 4.0)[0]:.6f} = {N_CUSPS}*a/{SMALL_CIRCLE_R_DIVISOR}")
print()

print(f"Factorization of {N_CUSPS}: {check_factorization(N_CUSPS)}")
constructible, reason = gauss_wantzel_constructible(N_CUSPS)
print(f"{N_CUSPS} constructible per Gauss-Wantzel 1837: {constructible}")
print(f"Reason: {reason}")
print()

print("=== Finite-sample check (NUM_SAMPLES = {}) ===".format(NUM_SAMPLES))
all_ok = True
for shape_name, (t_min, t_max) in SHAPES.items():
    print(f"--- Shape: {shape_name} (t in [{t_min:.6f}, {t_max:.6f}]) ---")
    samples = []
    for i in range(NUM_SAMPLES):
        t = t_min + (t_max - t_min) * i / max(1, NUM_SAMPLES - 1)
        x, y = hypocycloid_xy(t, 4.0)
        samples.append((x, y))
    finite_count = sum(1 for x, y in samples if math.isfinite(x) and math.isfinite(y))
    print(f"  finite samples: {finite_count}/{NUM_SAMPLES}")
    print(f"  x range: [{min(x for x, _ in samples):.4f}, {max(x for x, _ in samples):.4f}]")
    print(f"  y range: [{min(y for _, y in samples):.4f}, {max(y for _, y in samples):.4f}]")
    if finite_count != NUM_SAMPLES:
        all_ok = False

print()
print("=== Verdict ===")
print(f"All 4 shapes produced {NUM_SAMPLES}/{NUM_SAMPLES} finite samples: {all_ok}")
print(f"N=152 = 2^3 * 19 NOT constructible per Gauss-Wantzel 1837 (fails distinctness criterion)")
print(f"Naming: hectopentacontadigon (hecto=100, pentaconta=50, di=2, total=152)")
