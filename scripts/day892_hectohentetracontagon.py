"""
Day 892: Hectohentetracontagon (141-cusped Hypocycloid) Notes - reproducibility script.

141 = 3 * 47 NOT constructible per Gauss-Wantzel 1837 (47 is prime but NOT a Fermat prime,
despite 3 being a Fermat prime). R/r=141, parametric
x = a*cos(t) + (a/140)*cos(140t), y = a*sin(t) - (a/140)*sin(140t).
"""

import math

PI = math.pi
N = 141
SMALL = N - 1  # 140
A = 4
A_OVER_SMALL = A / SMALL  # a/140

# 141 = 3 * 47
# 3 IS a Fermat prime (2^(2^0) + 1 = 3, 1st Fermat prime)
# 47 is prime but NOT a Fermat prime (Fermat primes are 3, 5, 17, 257, 65537)
# So 141 = 3 * 47 is NOT constructible because 47 fails the distinctness criterion
# (47 is prime but not Fermat, even though 3 is a Fermat prime)
gauss_wantzel_constructible = False  # because 47 is prime but not Fermat
print(f"141 = 3 * 47")
print(f"  3 is Fermat prime: True")
print(f"  47 is Fermat prime: False")
print(f"  141 constructible per Gauss-Wantzel 1837: {gauss_wantzel_constructible}")
print()

# Cusps per revolution
print(f"141 = 100 + 41 = hecto + hentetraconta + gon = hectohentetracontagon")
print(f"Cusp interval: 360/{N} = {360/N:.6f} degrees = 2*PI/{N} = {2*PI/N:.12f} radians")
print()

# Standard shape: t in [0, 2*PI], full revolution
def samples_standard(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (2*PI*i/max(1, num-1) for i in range(num))]

# Inverted shape: t in [2*PI, 0], reverse
def samples_inverted(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (2*PI - 2*PI*i/max(1, num-1) for i in range(num))]

# Hectohentetracontagon shape: t in [0, 2*PI/141] (one cusp)
def samples_hecto(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in ((2*PI/N)*i/max(1, num-1) for i in range(num))]

# Tight shape: t in [-PI/141, PI/141] (cusp region)
def samples_tight(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (-PI/N + 2*(PI/N)*i/max(1, num-1) for i in range(num))]

N_SAMPLES = 32
for name, fn in [("standard", samples_standard),
                 ("inverted", samples_inverted),
                 ("hectohentetracontagon", samples_hecto),
                 ("tight", samples_tight)]:
    pts = fn(N_SAMPLES)
    finite = all(math.isfinite(x) and math.isfinite(y) for x, y in pts)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print(f"{name}: {N_SAMPLES}/{N_SAMPLES} finite samples = {finite}, "
          f"xRange=[{min(xs):.4f}, {max(xs):.4f}], yRange=[{min(ys):.4f}, {max(ys):.4f}]")

# t=0 check: x = a + a/140 = 141a/140, y = 0
x0 = A + A_OVER_SMALL
print(f"\nx at t=0: {x0:.6f} = 141a/140 = {141*A/140:.6f}")
print(f"y at t=0: 0.0")
print(f"R/r = {N}, ~{360/N:.4f} degree cusp intervals = 360/{N}")
print(f"\n2*PI/141 = {2*PI/141:.12f} (hectohentetracontagon shape t range upper bound)")
print(f"PI/141 = {PI/141:.12f} (tight shape t range +/- bounds)")
