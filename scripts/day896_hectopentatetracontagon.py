"""
Day 896: Hectopentatetracontagon (145-cusped Hypocycloid) Notes - reproducibility script.

145 = 5 * 29 NOT constructible per Gauss-Wantzel 1837 (5 IS a Fermat prime
(Fermat primes: 3, 5, 17, 257, 65537) but 29 is prime but NOT a Fermat prime,
so 145 fails the distinctness criterion since 29 is prime but not Fermat despite
5 being a Fermat prime). Parametric equations are
x(t) = a*cos(t) + (a/144)*cos(144t) and
y(t) = a*sin(t) - (a/144)*sin(144t)
(R/r=145, 145 cusps per revolution, one cusp per 360/145 ≈ 2.4828 degrees = 2*PI/145).

The 4 shape variants follow the same family as the recent hecto-100+ days:
  - standard       (full revolution t in [0, 2*PI])
  - inverted       (t in [2*PI, 0])
  - hectopentatetracontagon (single-cusp window t in [0, 2*PI/145])
  - tight          (cusp-region window t in [-PI/145, PI/145])

Naming note: 145 = 100 + 45, so the hypocycloid is named
hectopentatetracontagon (hecto = 100, pentatetraconta = 45, gon = sides, total = 145).
The pentatetraconta root is the established Greek compound pattern for 45
(penta- = 5, tetraconta = 40), making 100+45=145 naturally hectopentatetracontagon.
"""
import math

PI = math.pi
N = 145
SMALL = N - 1  # 144
A = 4.0
A_OVER_SMALL = A / SMALL  # a/144 = 0.027777...
NUM_SAMPLES = 32
VER_SMALL = 1e-12

print(f"=== Day 896: Hectopentatetracontagon (145-cusped Hypocycloid) Notes ===\n")
print(f"N (number of cusps) = {N}")
print(f"SMALL (cos/sin multiplier) = {SMALL}")
print(f"R/r = {N} (since x = a*cos(t) + (a/{SMALL})*cos({SMALL}*t) gives R = {N}*a/{SMALL})")
print(f"~{360/N:.4f} degree cusp intervals = 360/{N}")
print(f"\n145 = 5 * 29 NOT constructible per Gauss-Wantzel 1837")
print(f"  - 5 IS a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537)")
print(f"  - 29 is prime but NOT a Fermat prime")
print(f"  - 145 fails the distinctness criterion since 29 is prime but not Fermat despite 5 being a Fermat prime")
print(f"\n2*PI/145 = {2*PI/145:.12f} (hectopentatetracontagon shape t range upper bound)")
print(f"PI/145 = {PI/145:.12f} (tight shape t range +/- bounds)")

# Standard shape: t in [0, 2*PI]
def samples_standard(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (2*PI*i/max(1, num-1) for i in range(num))]

# Inverted shape: t in [2*PI, 0], reverse
def samples_inverted(num):
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (2*PI - 2*PI*i/max(1, num-1) for i in range(num))]

# Hectopentatetracontagon shape: t in [0, 2*PI/145]
def samples_hectopentatetracontagon(num):
    t_max = 2*PI/145
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (t_max*i/max(1, num-1) for i in range(num))]

# Tight shape: t in [-PI/145, PI/145]
def samples_tight(num):
    half = PI/145
    return [(A*math.cos(t) + A_OVER_SMALL*math.cos(SMALL*t),
             A*math.sin(t) - A_OVER_SMALL*math.sin(SMALL*t))
            for t in (-half + 2*half*i/max(1, num-1) for i in range(num))]

def xyr(samples):
    xs = [p[0] for p in samples]
    ys = [p[1] for p in samples]
    return (min(xs), max(xs), min(ys), max(ys))

for name, fn in [("standard", samples_standard),
                 ("inverted", samples_inverted),
                 ("hectopentatetracontagon", samples_hectopentatetracontagon),
                 ("tight", samples_tight)]:
    s = fn(NUM_SAMPLES)
    xMin, xMax, yMin, yMax = xyr(s)
    print(f"\n{name} ({NUM_SAMPLES} samples):")
    print(f"  xRange=[{xMin:.4f}, {xMax:.4f}]  yRange=[{yMin:.4f}, {yMax:.4f}]")
    finite = sum(1 for p in s if math.isfinite(p[0]) and math.isfinite(p[1]))
    print(f"  finite samples: {finite}/{NUM_SAMPLES}")

# Sanity: x at t=0 should be a + a/144 = 4 + 4/144 = 4.027777... = 145a/144
x_at_0 = A*math.cos(0) + A_OVER_SMALL*math.cos(0)
y_at_0 = A*math.sin(0) - A_OVER_SMALL*math.sin(0)
print(f"\nx at t=0: {x_at_0:.6f} = 145a/144 = {N}*{A}/{SMALL} = {N*A/SMALL:.6f}")
print(f"y at t=0: 0.0")
print(f"R/r = {N}, ~{360/N:.4f} degree cusp intervals = 360/{N}")
print(f"\n2*PI/145 = {2*PI/145:.12f} (hectopentatetracontagon shape t range upper bound)")
print(f"PI/145 = {PI/145:.12f} (tight shape t range +/- bounds)")
