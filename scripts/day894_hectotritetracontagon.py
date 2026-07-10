"""
Day 894: Hectotritetracontagon (143-cusped Hypocycloid) Notes - reproducibility script.

143 = 11 * 13 NOT constructible per Gauss-Wantzel 1837 (11 and 13 are primes but NEITHER
is a Fermat prime; Fermat primes are 3, 5, 17, 257, 65537). R/r=143, parametric
x = a*cos(t) + (a/142)*cos(142t), y = a*sin(t) - (a/142)*sin(142t).
"""

import math

PI = math.pi
N = 143
SMALL = N - 1  # 142
A = 4
A_OVER_SMALL = A / SMALL  # a/142

# 143 = 11 * 13
# 11 is the 5th prime, NOT a Fermat prime
# 13 is the 6th prime, NOT a Fermat prime
# So 143 = 11 * 13 is NOT constructible because BOTH 11 and 13 are prime but not Fermat
gauss_wantzel_constructible = False  # because 11 and 13 are both prime but not Fermat
print(f"143 = 11 * 13")
print(f"  11 is Fermat prime: False (11 is the 5th prime)")
print(f"  13 is Fermat prime: False (13 is the 6th prime)")
print(f"  143 constructible per Gauss-Wantzel 1837: {gauss_wantzel_constructible}")
print()

# Cusps per revolution
print(f"143 = 100 + 43 = hecto + tritetraconta + gon = hectotritetracontagon")
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

# Hectotritetracontagon shape: t in [0, 2*PI/143] (one cusp)
def samples_hecto(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in ((2*PI/N)*i/max(1, num-1) for i in range(num))]

# Tight shape: t in [-PI/143, PI/143] (cusp region)
def samples_tight(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (-PI/N + 2*(PI/N)*i/max(1, num-1) for i in range(num))]

N_SAMPLES = 32
for name, fn in [("standard", samples_standard),
                 ("inverted", samples_inverted),
                 ("hectotritetracontagon", samples_hecto),
                 ("tight", samples_tight)]:
    pts = fn(N_SAMPLES)
    finite = all(math.isfinite(x) and math.isfinite(y) for x, y in pts)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print(f"{name}: {N_SAMPLES}/{N_SAMPLES} finite samples = {finite}, "
          f"xRange=[{min(xs):.4f}, {max(xs):.4f}], yRange=[{min(ys):.4f}, {max(ys):.4f}]")

# t=0 check: x = a + a/142 = 143a/142, y = 0
x0 = A + A_OVER_SMALL
print(f"\nx at t=0: {x0:.6f} = 143a/142 = {143*A/142:.6f}")
print(f"y at t=0: 0.0")
print(f"R/r = {N}, ~{360/N:.4f} degree cusp intervals = 360/{N}")
print(f"\n2*PI/143 = {2*PI/143:.12f} (hectotritetracontagon shape t range upper bound)")
print(f"PI/143 = {PI/143:.12f} (tight shape t range +/- bounds)")
