#!/usr/bin/env python3
"""
Day 861: Hectodecagon (110-cusped Hypocycloid) Notes — Reproducibility Script

Verifies the parametric formulas for the hectodecagon (110-cusped hypocycloid):
  x(t) = a*cos(t) + (a/109)*cos(109t)
  y(t) = a*sin(t) - (a/109)*sin(109t)

R/r=110, 110 cusps per revolution, one cusp per 360°/110 ~= 3.2727 degrees
of revolution. The hectodecagon has 110-fold rotational symmetry (D110
dihedral symmetry) with 110 inward-pointing cusps evenly distributed at
~3.2727 degree intervals around the origin.

110 = 2 × 5 × 11 is a product of a power of 2 (2), the Fermat prime 5
(F_1 = 2^(2^1)+1 = 5, the second Fermat prime after 3), and the prime 11
(which is NOT a Fermat prime; Fermat primes are 3, 5, 17, 257, 65537),
making the regular hectodecagon NOT constructible by compass and
straightedge (Gauss-Wantzel 1837 theorem: n is constructible iff n is a
product of DISTINCT Fermat primes and a power of 2; 11 fails the
criterion since 11 is prime but not Fermat, so 110 = 2*5*11 fails the
distinctness criterion despite 2 being a power of 2 and 5 being a
Fermat prime).
"""
import math

N = 110  # cusp count
N_MINUS_1 = 109  # parametric multiplier
a = 4  # DEFAULT_A (clampedA in the method)


def compute_samples(t_min, t_max, length=32):
    """Compute (x, y) samples for the hectodecagon curve."""
    a_over = a / N_MINUS_1
    samples = []
    for i in range(length):
        t = t_min + (t_max - t_min) * i / max(1, length - 1)
        cosT = math.cos(t)
        sinT = math.sin(t)
        cosN1T = math.cos(N_MINUS_1 * t)
        sinN1T = math.sin(N_MINUS_1 * t)
        x = a * cosT + a_over * cosN1T
        y = a * sinT - a_over * sinN1T
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        samples.append((x, y))
    if not samples:
        return (0, 0, 0, 0, 0)
    xs = [p[0] for p in samples]
    ys = [p[1] for p in samples]
    return (min(xs), max(xs), min(ys), max(ys), len(samples))


# --- Constants ---
hectodecagon_t_max = 2 * math.pi / N
tight_t_min = -math.pi / N
tight_t_max = math.pi / N

print("=" * 60)
print(f"Day 861: Hectodecagon (N={N}, a={a})")
print("=" * 60)

# Verify x at t=0
t = 0
x_at_0 = a * math.cos(t) + (a / N_MINUS_1) * math.cos(N_MINUS_1 * t)
expected_x = N * a / N_MINUS_1
print(f"\nx at t=0 = {x_at_0:.6f} = {N}a/{N_MINUS_1} = {expected_x:.6f}")
assert abs(x_at_0 - expected_x) < 1e-9, "x at t=0 must equal N*a/(N-1)"

# Shape t-ranges
default_t_min = 0
default_t_max = 2 * math.pi

shapes = {
    "standard": (default_t_min, default_t_max),
    "inverted": (default_t_max, default_t_min),
    "hectodecagon": (0, hectodecagon_t_max),  # single cusp arc
    "tight": (tight_t_min, tight_t_max),
}

print(f"\nAll 4 shapes, 32 samples each:")
all_pass = True
for name, (tmin, tmax) in shapes.items():
    xmin, xmax, ymin, ymax, count = compute_samples(tmin, tmax)
    xrange = xmax - xmin
    yrange = ymax - ymin
    is_degenerate = (xrange < 0.01) or (yrange < 0.01)
    status = "FAIL" if is_degenerate or count < 32 else "OK"
    if status == "FAIL":
        all_pass = False
    print(f"  Shape '{name}': {count}/32 finite, "
          f"xRange={xrange:.4f}, yRange={yrange:.4f}  [{status}]")

# Constants
print(f"\nConstants:")
print(f"  HECTODECAGON_NOTES_HECTODECAGON_T_MAX = 2*PI/{N} = {hectodecagon_t_max:.6f}")
print(f"  HECTODECAGON_NOTES_TIGHT_T_MIN = -PI/{N} = {tight_t_min:.6f}")
print(f"  HECTODECAGON_NOTES_TIGHT_T_MAX = PI/{N} = {tight_t_max:.6f}")

# Constructibility
print(f"\n--- Constructibility (Gauss-Wantzel 1837) ---")
print(f"{N} = 2 * 5 * 11")
print(f"  2 is a power of 2")
print(f"  5 IS a Fermat prime (F_1 = 2^(2^1)+1 = 5)")
print(f"  11 is prime but NOT a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537)")
print(f"  -> {N} = 2*5*11 fails the distinctness criterion (11 not Fermat)")
print(f"  -> NOT constructible by compass and straightedge")

# Cusp interval
print(f"\nCusp interval: 360/{N} = {360/N:.4f} degrees = 2*PI/{N}")
print(f"R/r = {N}")

# Final summary
print()
print("=" * 60)
if all_pass:
    print("ALL CHECKS PASS")
else:
    print("SOME CHECKS FAILED")
print("=" * 60)
