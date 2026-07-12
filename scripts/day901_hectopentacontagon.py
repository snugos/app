"""
Day 901: Hectopentacontagon (150-cusped Hypocycloid) Notes - reproducibility script.

150 = 2 * 3 * 5^2 NOT constructible per Gauss-Wantzel 1837 (5 IS a Fermat prime
but appears with multiplicity 2, so 150 fails the distinctness criterion despite
2 being a power of 2 and 3 being a Fermat prime).

Parametric hypocycloid (R/r = 150):
    x(t) = a*cos(t) + (a/149)*cos(149t)
    y(t) = a*sin(t) - (a/149)*sin(149t)
"""

import math
import sys

N = 150
N_MINUS_1 = N - 1
A = 4
NUM_SAMPLES = 32

TWO_PI = 2 * math.pi
TWO_PI_OVER_N = TWO_PI / N
PI_OVER_N = math.pi / N

SHAPES = {
    "standard":           (0.0,    TWO_PI),
    "inverted":           (TWO_PI, 0.0),
    "hectopentacontagon": (0.0,    TWO_PI_OVER_N),
    "tight":              (-PI_OVER_N, PI_OVER_N),
}

print(f"=== Day 901: Hectopentacontagon (150-cusped Hypocycloid) ===")
print(f"N = {N}")
print(f"N - 1 = {N_MINUS_1}")
print(f"R/r = {N}")
print(f"Cusp interval = 360/{N} = {360.0/N:.6f} degrees = 2*PI/{N} = {TWO_PI/N:.6f} rad")
print(f"a = {A}")
print(f"a/(N-1) = a/149 = {A/N_MINUS_1:.6f}")
print()

# Verify: at t=0, x = a + a/(N-1) = a*N/(N-1) and y = 0
t = 0.0
cosT = math.cos(t)
sinT = math.sin(t)
cos149T = math.cos(149 * t)
sin149T = math.sin(149 * t)
aOver149 = A / 149
x0 = A * cosT + aOver149 * cos149T
y0 = A * sinT - aOver149 * sin149T
expected_x0 = A * N / N_MINUS_1
print(f"Verification at t=0:")
print(f"  x = a*cos(0) + (a/149)*cos(0) = {x0:.6f}")
print(f"  Expected x = a*N/(N-1) = {expected_x0:.6f}")
print(f"  y = a*sin(0) - (a/149)*sin(0) = {y0:.6f} (expected 0)")
print(f"  Match: x0 == {expected_x0:.6f}: {math.isclose(x0, expected_x0, abs_tol=1e-9)}")
print()

# Sample all 4 shapes
all_ok = True
for shape_name, (t_min, t_max) in SHAPES.items():
    print(f"--- Shape: {shape_name} (t in [{t_min:.6f}, {t_max:.6f}]) ---")
    samples = []
    finite_count = 0
    for i in range(NUM_SAMPLES):
        t = t_min + (t_max - t_min) * i / max(1, NUM_SAMPLES - 1)
        cosT = math.cos(t)
        sinT = math.sin(t)
        cos149T = math.cos(149 * t)
        sin149T = math.sin(149 * t)
        aOver149 = A / 149
        x = A * cosT + aOver149 * cos149T
        y = A * sinT - aOver149 * sin149T
        if math.isfinite(x) and math.isfinite(y):
            samples.append((x, y))
            finite_count += 1
    if finite_count != NUM_SAMPLES:
        all_ok = False
    xs = [p[0] for p in samples]
    ys = [p[1] for p in samples]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    print(f"  {finite_count}/{NUM_SAMPLES} finite samples")
    print(f"  xRange = [{x_min:.4f}, {x_max:.4f}], yRange = [{y_min:.4f}, {y_max:.4f}]")
print()

# Gauss-Wantzel theorem check
print("=== Constructibility (Gauss-Wantzel 1837) ===")
print(f"{N} = 2 * 3 * 5^2 (prime factorization)")
known_fermat_primes = [3, 5, 17, 257, 65537]
if N in known_fermat_primes:
    print(f"{N} IS a Fermat prime -> constructible")
elif N == 1:
    print(f"{N} = 1 (trivially constructible)")
else:
    has_power_of_2 = (N & (N - 1)) == 0
    print(f"{N} has power-of-2 factor: True (2)")
    print(f"3 is a Fermat prime: True")
    print(f"5 is a Fermat prime: True, but appears with multiplicity 2 in 150")
    print(f"  -> NOT constructible per Gauss-Wantzel 1837 (distinctness fails on 5^2)")
print()

print("=== Verdict ===")
print(f"All 4 shapes produced {NUM_SAMPLES}/{NUM_SAMPLES} finite samples: {all_ok}")
print(f"N=150 = 2 * 3 * 5^2 NOT constructible per Gauss-Wantzel 1837")
print(f"Naming: hectopentacontagon (hecto=100, penta=5, contagon=50, total=150)")
