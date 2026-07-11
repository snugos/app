"""
Day 898: Hectoheptatetracontagon (147-cusped Hypocycloid) Notes - reproducibility script.

147 = 3 * 7^2 NOT constructible per Gauss-Wantzel 1837 (3 IS a Fermat
prime but 7 is prime but NOT a Fermat prime AND has multiplicity 2, so
147 fails the distinctness criterion since 7^2 violates the distinctness
requirement even though 3 is a Fermat prime).

Parametric hypocycloid equations:
  x(t) = a*cos(t) + (a/146)*cos(146*t)
  y(t) = a*sin(t) - (a/146)*sin(146*t)
  R/r = 147, 147 cusps per revolution, ~2.4490 deg per cusp = 2*PI/147 rad
"""

import math

PI = math.pi
N = 147  # number of cusps
N_MINUS_1 = N - 1  # 146 (small-circle multiplier)
A = 4.0
NUM_SAMPLES = 32

TWO_PI_OVER_147 = 2 * PI / N  # = 0.042742757192
PI_OVER_147 = PI / N  # = 0.021371378596

print(f"=== Day 898: Hectoheptatetracontagon (147-cusped Hypocycloid) ===")
print(f"N = {N} = 3 * 7^2 NOT constructible per Gauss-Wantzel 1837")
print(f"3 IS a Fermat prime but 7 is prime but NOT a Fermat prime AND has multiplicity 2,")
print(f"so 147 fails the distinctness criterion since 7^2 violates the distinctness")
print(f"requirement even though 3 is a Fermat prime.")
print(f"R/r = {N}, ~{360/N:.4f} degrees per cusp")
print(f"2*PI/147 = {TWO_PI_OVER_147:.12f}")
print(f"PI/147 = {PI_OVER_147:.12f}")
print(f"a = {A}, NUM_SAMPLES = {NUM_SAMPLES}")
print()


def samples_standard(num=NUM_SAMPLES):
    """Standard: t in [0, 2*PI]"""
    return [(A*math.cos(t) + (A/N_MINUS_1)*math.cos(N_MINUS_1*t),
             A*math.sin(t) - (A/N_MINUS_1)*math.sin(N_MINUS_1*t))
            for t in (2*PI * i / max(1, num - 1) for i in range(num))]


def samples_inverted(num=NUM_SAMPLES):
    """Inverted: t in [2*PI, 0] (reverse direction)"""
    return [(A*math.cos(t) + (A/N_MINUS_1)*math.cos(N_MINUS_1*t),
             A*math.sin(t) - (A/N_MINUS_1)*math.sin(N_MINUS_1*t))
            for t in (2*PI + (0 - 2*PI) * i / max(1, num - 1) for i in range(num))]


def samples_hectoheptatetracontagon(num=NUM_SAMPLES):
    """Hectoheptatetracontagon: t in [0, 2*PI/147] (single cusp window)"""
    return [(A*math.cos(t) + (A/N_MINUS_1)*math.cos(N_MINUS_1*t),
             A*math.sin(t) - (A/N_MINUS_1)*math.sin(N_MINUS_1*t))
            for t in (TWO_PI_OVER_147 * i / max(1, num - 1) for i in range(num))]


def samples_tight(num=NUM_SAMPLES):
    """Tight: t in [-PI/147, PI/147] (cusp-region window)"""
    return [(A*math.cos(t) + (A/N_MINUS_1)*math.cos(N_MINUS_1*t),
             A*math.sin(t) - (A/N_MINUS_1)*math.sin(N_MINUS_1*t))
            for t in (-PI_OVER_147 + 2*PI_OVER_147 * i / max(1, num - 1) for i in range(num))]


def check_shape(name, samples):
    finite_count = sum(1 for (x, y) in samples if math.isfinite(x) and math.isfinite(y))
    xs = [p[0] for p in samples if math.isfinite(p[0])]
    ys = [p[1] for p in samples if math.isfinite(p[1])]
    x_min, x_max = (min(xs), max(xs)) if xs else (float('nan'), float('nan'))
    y_min, y_max = (min(ys), max(ys)) if ys else (float('nan'), float('nan'))
    ok = finite_count == len(samples)
    print(f"  {name}: {finite_count}/{len(samples)} finite, "
          f"xRange=[{x_min:.4f}, {x_max:.4f}] yRange=[{y_min:.4f}, {y_max:.4f}]"
            + (" OK" if ok else " FAIL"))
    return ok


print(f"=== Sampling 4 shapes (a={A}, N={N}, NUM_SAMPLES={NUM_SAMPLES}) ===")
all_ok = True
all_ok &= check_shape("standard       ", samples_standard())
all_ok &= check_shape("inverted       ", samples_inverted())
all_ok &= check_shape("hectoheptatetra.", samples_hectoheptatetracontagon())
all_ok &= check_shape("tight          ", samples_tight())

# Verify x at t=0 = 147a/146
x_at_0 = A + (A / N_MINUS_1) * math.cos(0)
y_at_0 = 0 - (A / N_MINUS_1) * math.sin(0)
print(f"\n=== Anchor point check ===")
print(f"x at t=0 = {x_at_0:.6f} (expected {N}*a/{N_MINUS_1} = {N*A/N_MINUS_1:.6f})")
print(f"y at t=0 = {y_at_0:.6f} (expected 0)")

print(f"\n=== Verdict ===")
print(f"All 4 shapes produced {NUM_SAMPLES}/{NUM_SAMPLES} finite samples: {all_ok}")
print(f"N=147 = 3 * 7^2, NOT constructible per Gauss-Wantzel 1837")
print(f"Naming: hectoheptatetracontagon (hecto=100, hepta=7, tetraconta=40, gon=sides, total=147)")
