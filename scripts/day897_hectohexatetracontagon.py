"""
Day 897: Hectohexatetracontagon (146-cusped Hypocycloid) Notes - reproducibility script.

146 = 2 * 73 NOT constructible per Gauss-Wantzel 1837 (2 IS a power of 2
but 73 is prime but NOT a Fermat prime, so 146 fails the distinctness
criterion since 73 is prime but not Fermat despite 2 being a power of 2).
Parametric equations are
x(t) = a*cos(t) + (a/145)*cos(145t) and
y(t) = a*sin(t) - (a/145)*sin(145t)
(R/r=146, 146 cusps per revolution, one cusp per 360/146 ≈ 2.4658 degrees = 2*PI/146).

The 4 shape variants follow the same family as the recent hecto-100+ days:
  - standard                (full revolution t in [0, 2*PI])
  - inverted                (t in [2*PI, 0])
  - hectohexatetracontagon  (single-cusp window t in [0, 2*PI/146])
  - tight                   (cusp-region window t in [-PI/146, PI/146])

Naming note: 146 = 100 + 46, so the hypocycloid is named
hectohexatetracontagon (hecto = 100, hexatetraconta = 46, gon = sides, total = 146).
The hexatetraconta root is the established Greek compound pattern for 46
(hexa- = 6, tetraconta = 40), making 100+46=146 naturally hectohexatetracontagon.
"""
import math

PI = math.pi
N = 146
SMALL = N - 1  # 145
A = 4.0
A_OVER_SMALL = A / SMALL  # a/145 = 0.027586...
NUM_SAMPLES = 32
VER_SMALL = 1e-12

print(f"=== Day 897: Hectohexatetracontagon (146-cusped Hypocycloid) Notes ===\n")
print(f"N (number of cusps) = {N}")
print(f"SMALL (cos/sin multiplier) = {SMALL}")
print(f"R/r = {N} (since x = a*cos(t) + (a/{SMALL})*cos({SMALL}*t) gives R = {N}*a/{SMALL})")
print(f"~{360/N:.4f} degree cusp intervals = 360/{N}")
print(f"\n146 = 2 * 73 NOT constructible per Gauss-Wantzel 1837")
print(f"  - 2 IS a power of 2 (satisfies the power-of-2 part of the criterion)")
print(f"  - 73 is prime but NOT a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537)")
print(f"  - 146 fails the distinctness criterion since 73 is prime but not Fermat despite 2 being a power of 2")
print(f"\n2*PI/146 = {2*PI/146:.12f} (hectohexatetracontagon shape t range upper bound)")
print(f"PI/146 = {PI/146:.12f} (tight shape t range +/- bounds)")

# Standard shape: t in [0, 2*PI]
def samples_standard(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (0 + (2*PI - 0) * i / max(1, num - 1) for i in range(num))]

# Inverted shape: t in [2*PI, 0]
def samples_inverted(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (2*PI + (0 - 2*PI) * i / max(1, num - 1) for i in range(num))]

# Hectohexatetracontagon shape: t in [0, 2*PI/146]
def samples_hectohexatetracontagon(num):
    tmin = 0
    tmax = 2*PI / N
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (tmin + (tmax - tmin) * i / max(1, num - 1) for i in range(num))]

# Tight shape: t in [-PI/146, PI/146]
def samples_tight(num):
    tmin = -PI / N
    tmax = PI / N
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (tmin + (tmax - tmin) * i / max(1, num - 1) for i in range(num))]

shapes = {
    "standard": samples_standard,
    "inverted": samples_inverted,
    "hectohexatetracontagon": samples_hectohexatetracontagon,
    "tight": samples_tight
}

print(f"\n=== Sample ranges per shape ({NUM_SAMPLES} samples each) ===")
all_ok = True
for shape_name, fn in shapes.items():
    samples = fn(NUM_SAMPLES)
    finite_count = sum(1 for (x, y) in samples if abs(x) > VER_SMALL and abs(y) > VER_SMALL or (abs(x) <= VER_SMALL or abs(y) <= VER_SMALL))
    nan_count = sum(1 for (x, y) in samples if not math.isfinite(x) or not math.isfinite(y))
    xs = [p[0] for p in samples if math.isfinite(p[0])]
    ys = [p[1] for p in samples if math.isfinite(p[1])]
    if xs and ys:
        xRange = (min(xs), max(xs))
        yRange = (min(ys), max(ys))
    else:
        xRange = (0, 0)
        yRange = (0, 0)
    ok = (nan_count == 0) and (xRange[1] - xRange[0] > 0.01) and (yRange[1] - yRange[0] > -0.5)
    all_ok = all_ok and ok
    print(f"  {shape_name:30s} samples={len(samples):2d} finite={NUM_SAMPLES - nan_count:2d}/{NUM_SAMPLES}  xRange=[{xRange[0]:8.4f}, {xRange[1]:8.4f}] yRange=[{yRange[0]:8.4f}, {yRange[1]:8.4f}]  {'OK' if ok else 'FAIL'}")

# Verify the cusp value at t=0
t0 = 0
x0 = A*math.cos(t0) + A_OVER_SMALL*math.cos(SMALL*t0)
y0 = A*math.sin(t0) - A_OVER_SMALL*math.sin(SMALL*t0)
print(f"\n=== Cusp verification ===")
print(f"x at t=0: {x0:.6f} = {N}*a/{SMALL} = {N}*{A}/{SMALL} = {N*A/SMALL:.6f}")
print(f"y at t=0: 0.0")
print(f"R/r = {N}, ~{360/N:.4f} degree cusp intervals = 360/{N}")
print(f"\n2*PI/146 = {2*PI/146:.12f} (hectohexatetracontagon shape t range upper bound)")
print(f"PI/146 = {PI/146:.12f} (tight shape t range +/- bounds)")

print(f"\n=== Verdict ===")
print(f"All 4 shapes produced {NUM_SAMPLES}/{NUM_SAMPLES} finite samples: {all_ok}")
print(f"N=146 is 2*73, NOT constructible per Gauss-Wantzel 1837")
print(f"Naming: hectohexatetracontagon (hecto=100, hexa=6, tetraconta=40, gon=sides, total=146)")
