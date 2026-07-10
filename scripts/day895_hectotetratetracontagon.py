"""
Day 895: Hectotetratetracontagon (144-cusped Hypocycloid) Notes - reproducibility script.

144 = 2^4 * 3^2 NOT constructible per Gauss-Wantzel 1837 (3 IS a Fermat prime but
appears with multiplicity 2 in the factorization, so 144 fails the distinctness
criterion: a regular n-gon is constructible iff n is a product of DISTINCT Fermat
primes and a power of 2; 2^4 is a power of 2 and 3 is Fermat, but 3 appears twice
in 144, violating distinctness). R/r=144, parametric
x = a*cos(t) + (a/143)*cos(143t), y = a*sin(t) - (a/143)*sin(143t).
"""

import math

PI = math.pi
N = 144
SMALL = N - 1  # 143
A = 4
A_OVER_SMALL = A / SMALL  # a/143

# 144 = 2^4 * 3^2
# 3 is a Fermat prime (2^(2^0)+1 = 3)
# 3 appears with multiplicity 2 in 144
# So 144 = 2^4 * 3^2 is NOT constructible because 3 fails the distinctness criterion
# (a Fermat prime can appear at most once in the prime factorization of a constructible n)
gauss_wantzel_constructible = False  # because 3 has multiplicity 2
print(f"144 = 2^4 * 3^2 = 16 * 9")
print(f"  3 is Fermat prime: True (3 = 2^(2^0)+1)")
print(f"  3 has multiplicity: 2 (fails distinctness criterion)")
print(f"  144 constructible per Gauss-Wantzel 1837: {gauss_wantzel_constructible}")
print()

# Cusps per revolution
print(f"144 = 100 + 44 = hecto + tetratetraconta + gon = hectotetratetracontagon")
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

# Hectotetratetracontagon shape: t in [0, 2*PI/144] (one cusp)
def samples_hecto(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in ((2*PI/N)*i/max(1, num-1) for i in range(num))]

# Tight shape: t in [-PI/144, PI/144] (cusp region)
def samples_tight(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (-PI/N + 2*(PI/N)*i/max(1, num-1) for i in range(num))]

N_SAMPLES = 32
for name, fn in [("standard", samples_standard),
                 ("inverted", samples_inverted),
                 ("hectotetratetracontagon", samples_hecto),
                 ("tight", samples_tight)]:
    pts = fn(N_SAMPLES)
    finite = all(math.isfinite(x) and math.isfinite(y) for x, y in pts)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print(f"{name}: {N_SAMPLES}/{N_SAMPLES} finite samples = {finite}, "
          f"xRange=[{min(xs):.4f}, {max(xs):.4f}], yRange=[{min(ys):.4f}, {max(ys):.4f}]")

# t=0 check: x = a + a/143 = 144a/143, y = 0
x0 = A + A_OVER_SMALL
print(f"\nx at t=0: {x0:.6f} = 144a/143 = {144*A/143:.6f}")
print(f"y at t=0: 0.0")
print(f"R/r = {N}, ~{360/N:.4f} degree cusp intervals = 360/{N}")
print(f"\n2*PI/144 = {2*PI/144:.12f} (hectotetratetracontagon shape t range upper bound)")
print(f"PI/144 = {PI/144:.12f} (tight shape t range +/- bounds)")
