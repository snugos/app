"""
Day 891: Hectotetracontagon (140-cusped Hypocycloid) Notes - reproducibility script.

140 = 2^2 * 5 * 7 NOT constructible per Gauss-Wantzel 1837 (7 is prime but NOT a Fermat prime,
despite 2^2 being a power of 2 and 5 being a Fermat prime). R/r=140, parametric
x = a*cos(t) + (a/139)*cos(139t), y = a*sin(t) - (a/139)*sin(139t).
"""

import math

PI = math.pi
N = 140
SMALL = N - 1  # 139
A = 4
A_OVER_SMALL = A / SMALL  # a/139

# 140 = 2^2 * 5 * 7
# 2^2 IS a power of 2
# 5 IS a Fermat prime (2^(2^2) + 1 = 17? No: 2^2^0+1=3, 2^2^1+1=5, 2^2^2+1=17, 2^2^3+1=257, 2^2^4+1=65537; so 5 is the 2nd Fermat prime)
# 7 is prime but NOT a Fermat prime (Fermat primes are 3, 5, 17, 257, 65537)
# So 140 = 2^2 * 5 * 7 is NOT constructible because 7 fails the distinctness criterion
# (7 is prime but not Fermat, even though 2^2 is a power of 2 and 5 is a Fermat prime)
gauss_wantzel_constructible = False  # because 7 is prime but not Fermat
print(f"140 = 2^2 * 5 * 7")
print(f"  2^2 is power of 2: True")
print(f"  5 is Fermat prime: True")
print(f"  7 is Fermat prime: False")
print(f"  140 constructible per Gauss-Wantzel 1837: {gauss_wantzel_constructible}")
print()

# Cusps per revolution
print(f"140 = 100 + 40 = hecto + tetraconta + gon = hectotetracontagon")
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

# Hectotetracontagon shape: t in [0, 2*PI/140] (one cusp)
def samples_hecto(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in ((2*PI/N)*i/max(1, num-1) for i in range(num))]

# Tight shape: t in [-PI/140, PI/140] (cusp region)
def samples_tight(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (-PI/N + 2*(PI/N)*i/max(1, num-1) for i in range(num))]

N_SAMPLES = 32
for name, fn in [("standard", samples_standard),
                 ("inverted", samples_inverted),
                 ("hectotetracontagon", samples_hecto),
                 ("tight", samples_tight)]:
    pts = fn(N_SAMPLES)
    finite = all(math.isfinite(x) and math.isfinite(y) for x, y in pts)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print(f"{name}: {N_SAMPLES}/{N_SAMPLES} finite samples = {finite}, "
          f"xRange=[{min(xs):.4f}, {max(xs):.4f}], yRange=[{min(ys):.4f}, {max(ys):.4f}]")

# t=0 check: x = a + a/139 = 140a/139, y = 0
x0 = A + A_OVER_SMALL
print(f"\nx at t=0: {x0:.6f} = 140a/139 = {140*A/139:.6f}")
print(f"y at t=0: 0.0")
print(f"R/r = {N}, ~{360/N:.4f} degree cusp intervals = 360/{N}")
print(f"\n2*PI/140 = {2*PI/140:.12f} (hectotetracontagon shape t range upper bound)")
print(f"PI/140 = {PI/140:.12f} (tight shape t range +/- bounds)")
