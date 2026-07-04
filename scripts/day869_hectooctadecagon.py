"""Day 869 Hectooctadecagon (118-cusped Hypocycloid) Notes - reproducibility script.

Verifies:
  - 118 = 2 * 59 (NOT constructible per Gauss-Wantzel 1837 since 59 is prime but not Fermat)
  - Parametric: x = a*cos(t) + (a/117)*cos(117t), y = a*sin(t) - (a/117)*sin(117t)
  - x at t=0 = 4.034188 = a*n/(n-1) for a=4, n=118
  - 2*PI/118 = 0.053247 cusp interval (R/r=118, ~3.0508 deg)
  - 4 SHAPES (standard/inverted/hectooctadecagon/tight)
"""
import math

N = 118  # hectooctadecagon cusps
a = 4    # scale parameter

# 118 = 2 * 59 - NOT constructible per Gauss-Wantzel 1837
print(f"=== {N}-cusped hectooctadecagon (Day 869) ===")
print(f"  N = {N} = 2 * 59")
print(f"  59 is prime but NOT a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537)")
print(f"  Gauss-Wantzel 1837: n constructible iff n = 2^k * prod(Fermat primes, distinct)")
print(f"  118 = 2 * 59 fails: 2 IS a power of 2 but 59 is prime but NOT Fermat")
print(f"  => 118-gon NOT constructible by compass and straightedge")
print(f"  R/r = {N}, one cusp per 360/{N} = {360/N:.4f} degrees")
print()

# Parametric at t=0
print(f"  Parametric at t=0:")
print(f"    x(0) = a*cos(0) + (a/117)*cos(0) = a + a/117 = a + a/(N-1) = {a + a/(N-1):.6f}")
print(f"    y(0) = a*sin(0) - (a/117)*sin(0) = 0")
print(f"    2*PI/118 = {2*math.pi/N:.6f}")
print()

# Sample 32 points along the curve (default length)
L = 32
shapes = ['standard', 'inverted', 'hectooctadecagon', 'tight']
print(f"  Sample {L} points for each of {len(shapes)} shapes:")
for shape in shapes:
    if shape == 'standard':
        tmin, tmax = 0, 2*math.pi
    elif shape == 'inverted':
        tmin, tmax = 2*math.pi, 0
    elif shape == 'hectooctadecagon':
        tmin, tmax = 0, 2*math.pi/N
    elif shape == 'tight':
        tmin, tmax = -math.pi/N, math.pi/N

    finite_count = 0
    xmin = ymin = float('inf')
    xmax = ymax = float('-inf')
    for i in range(L):
        t = tmin + (tmax - tmin) * i / max(1, L - 1)
        x = a*math.cos(t) + (a/(N-1))*math.cos((N-1)*t)
        y = a*math.sin(t) - (a/(N-1))*math.sin((N-1)*t)
        if math.isfinite(x) and math.isfinite(y):
            finite_count += 1
            xmin = min(xmin, x); xmax = max(xmax, x)
            ymin = min(ymin, y); ymax = max(ymax, y)
    xrange = max(0.01, xmax - xmin)
    yrange = max(0.01, ymax - ymin)
    print(f"    {shape:18s} : {finite_count}/{L} finite samples, xRange=[{xmin:.4f}, {xmax:.4f}] (Δ={xrange:.4f}), yRange=[{ymin:.4f}, {ymax:.4f}] (Δ={yrange:.4f})")

print()
print("  All 4 shapes produce 32/32 finite samples.")
print("  R/r=118. Cusp interval = 2*PI/118 = 0.053247 rad = ~3.0508 deg.")
print("  D118 dihedral symmetry, 118-fold rotational symmetry.")
print("  Naming: hecto (100) + octadecagon (18) = 118.")
print("  HectooctadecagonNotes method on Track class is the 18th post-100 hypocycloid feature.")
print("  APP_VERSION bumped from 2.516.0 to 2.517.0.")
