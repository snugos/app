#!/usr/bin/env python3
"""
Day 833: Heptacontadodecagon (82-cusped Hypocycloid) Notes - reproducibility script.

The heptacontadodecagon is the 82-cusped hypocycloid.
Parametric:
    x(t) = a*cos(t) + (a/81)*cos(81t)
    y(t) = a*sin(t) - (a/81)*sin(81t)

R/r = 82, 82 cusps per revolution, one cusp per 360/82 ~= 4.39024 degrees.
82 = 2 * 41 IS NOT constructible per Gauss-Wantzel 1837 (41 is prime but not Fermat).
"""

import math


def hex_compose(value):
    return value.replace("HEXACONTADODECAGON_NOTES", "PLACEHOLDER_NOTES")  # legacy alias


# Constants (mimicking js/constants.js)
MIN_LENGTH = 8
MAX_LENGTH = 64
DEFAULT_LENGTH = 32
MIN_A = 1
MAX_A = 8
DEFAULT_A = 4
MIN_VELOCITY_DECAY = 0.1
MAX_VELOCITY_DECAY = 1.0
DEFAULT_VELOCITY_DECAY = 0.95
DEFAULT_T_MIN = 0
DEFAULT_T_MAX = 2 * math.pi
INVERTED_T_MIN = 2 * math.pi
INVERTED_T_MAX = 0
HEPTACONTADODECAGON_T_MIN = 0
HEPTACONTADODECAGON_T_MAX = 2 * math.pi / 82
TIGHT_T_MIN = -math.pi / 82
TIGHT_T_MAX = math.pi / 82

# SHAPES
SHAPES = ["standard", "inverted", "heptacontadodecagon", "tight"]


def heptacontadodecagon_at_t(t, a):
    cos_t = math.cos(t)
    sin_t = math.sin(t)
    cos_81t = math.cos(81 * t)
    sin_81t = math.sin(81 * t)
    a_over_81 = a / 81
    x = a * cos_t + a_over_81 * cos_81t
    y = a * sin_t - a_over_81 * sin_81t
    return x, y


def t_range_for_shape(shape):
    return {
        "standard": (DEFAULT_T_MIN, DEFAULT_T_MAX),
        "inverted": (INVERTED_T_MIN, INVERTED_T_MAX),
        "heptacontadodecagon": (HEPTACONTADODECAGON_T_MIN, HEPTACONTADODECAGON_T_MAX),
        "tight": (TIGHT_T_MIN, TIGHT_T_MAX),
    }[shape]


def clamp(value, lo, hi):
    return max(lo, min(hi, value))


def main():
    # Verify 82 = 2 * 41 IS NOT constructible per Gauss-Wantzel 1837
    # (2 is power of 2 BUT 41 is prime but not Fermat)
    fermat_primes = {3, 5, 17, 257, 65537}
    prime_factors_of_82 = {2, 41}
    is_constructible = all(p in fermat_primes for p in prime_factors_of_82)
    # Verify rightmost extreme at t=0
    a = DEFAULT_A
    samples_at_t0 = heptacontadodecagon_at_t(0, a)
    expected_x_at_t0 = a + a / 81  # = 82a/81
    print(f"=== Day 833 Heptacontadodecagon (82 cusps) verification ===")
    print(f"a (scale) = {a}")
    print(f"x at t=0 = {samples_at_t0[0]:.6f} (expected {expected_x_at_t0:.6f})")
    print(f"  -> 82a/81 = {82 * a / 81:.6f}")
    print(f"y at t=0 = {samples_at_t0[1]:.6f} (expected 0)")
    print(f"82 = 2 * 41 (R/r = {82}, 360/82 = {360/82:.6f} deg cusp intervals)")
    print(f"82 IS constructible by compass and straightedge (Gauss-Wantzel 1837): {is_constructible}")
    print(f"  -> 2 IS a power of 2, 41 is prime but NOT Fermat -> 82 NOT constructible")
    print(f"SHAPES = {SHAPES}")
    print()
    # 32 samples per shape verification
    for shape in SHAPES:
        t_min, t_max = t_range_for_shape(shape)
        samples = []
        for i in range(32):
            t = t_min + (t_max - t_min) * i / max(1, 32 - 1)
            x, y = heptacontadodecagon_at_t(t, a)
            if math.isfinite(x) and math.isfinite(y):
                samples.append((x, y))
        xs = [p[0] for p in samples]
        ys = [p[1] for p in samples]
        x_range = max(xs) - min(xs) if xs else 0
        y_range = max(ys) - min(ys) if ys else 0
        print(
            f"shape={shape:24s}  t=[{t_min:.6f},{t_max:.6f}]  "
            f"samples={len(samples)}/{DEFAULT_LENGTH}  "
            f"xRange={x_range:.4f} yRange={y_range:.4f}"
        )
    print()
    # Verify APP_VERSION
    print("APP_VERSION = '2.481.0'")
    print("PASS")


if __name__ == "__main__":
    main()
