"""
Day 893: Hectoduotetracontagon (142-cusped Hypocycloid) Notes - reproducibility script.

142 = 2 * 71 NOT constructible per Gauss-Wantzel 1837 (71 is prime but NOT a Fermat prime,
despite 2 being a power of 2). R/r=142, parametric
x = a*cos(t) + (a/141)*cos(141t), y = a*sin(t) - (a/141)*sin(141t).
"""

import math

PI = math.pi
N = 142
SMALL = N - 1  # 141
A = 4
A_OVER_SMALL = A / SMALL  # a/141

# 142 = 2 * 71
# 2 IS a power of 2
# 71 is prime but NOT a Fermat prime (Fermat primes are 3, 5, 17, 257, 65537)
# So 142 = 2 * 71 is NOT constructible because 71 is prime but not Fermat
gauss_wantzel_constructible = False  # because 71 is prime but not Fermat
print(f"142 = 2 * 71")
print(f"  2 is power of 2: True")
print(f"  71 is Fermat prime: False")
print(f"  142 constructible per Gauss-Wantzel 1837: {gauss_wantzel_constructible}")
print()

# Cusps per revolution
print(f"142 = 100 + 42 = hecto + duotetraconta + gon = hectoduotetracontagon")
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

# Hectoduotetracontagon shape: t in [0, 2*PI/142] (one cusp)
def samples_hecto(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in ((2*PI/N)*i/max(1, num-1) for i in range(num))]

# Tight shape: t in [-PI/142, PI/142] (cusp region)
def samples_tight(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (-PI/N + 2*(PI/N)*i/max(1, num-1) for i in range(num))]

N_SAMPLES = 32
for name, fn in [("standard", samples_standard),
                 ("inverted", samples_inverted),
                 ("hectoduotetracontagon", samples_hecto),
                 ("tight", samples_tight)]:
    pts = fn(N_SAMPLES)
    finite = all(math.isfinite(x) and math.isfinite(y) for x, y in pts)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print(f"{name}: {N_SAMPLES}/{N_SAMPLES} finite samples = {finite}, "
          f"xRange=[{min(xs):.4f}, {max(xs):.4f}], yRange=[{min(ys):.4f}, {max(ys):.4f}]")

# t=0 check: x = a + a/141 = 142a/141, y = 0
x0 = A + A_OVER_SMALL
print(f"\nx at t=0: {x0:.6f} = 142a/141 = {142*A/141:.6f}")
print(f"y at t=0: 0.0")
print(f"R/r = {N}, ~{360/N:.4f} degree cusp intervals = 360/{N}")
print(f"\n2*PI/142 = {2*PI/142:.12f} (hectoduotetracontagon shape t range upper bound)")
print(f"PI/142 = {PI/142:.12f} (tight shape t range +/- bounds)")
