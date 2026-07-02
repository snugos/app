#!/usr/bin/env python3
"""
Day 847: Heptacontahexaxagon (96-cusped Hypocycloid) Notes - Reproducibility Script
"""

import math
import sys

def main() -> int:
    a = 4
    x0 = a * math.cos(0) + (a / 95) * math.cos(95 * 0)
    y0 = a * math.sin(0) - (a / 95) * math.sin(95 * 0)
    assert abs(x0 - (96 * a / 95)) < 1e-10, f"x0 mismatch: {x0}"
    assert abs(y0) < 1e-10, f"y0 should be 0, got {y0}"
    print(f"At t=0: x = {x0:.6f} = 96a/95, y = {y0:.6f}")

    cusp_deg = 360 / 96
    print(f"Cusp interval: {cusp_deg:.4f} degrees")
    print("R/r = 96")
    print("96 = 2^5 * 3")
    print("Constructible by compass and straightedge: YES (2 is a power of 2 and 3 is a Fermat prime)")

    shapes = {
        'standard': (0, 2 * math.pi),
        'inverted': (2 * math.pi, 0),
        'heptacontahexaxagon': (0, 2 * math.pi / 96),
        'tight': (-math.pi / 96, math.pi / 96),
    }

    for name, (tmin, tmax) in shapes.items():
        samples = []
        for i in range(32):
            t = tmin + (tmax - tmin) * i / max(1, 32 - 1)
            x = a * math.cos(t) + (a / 95) * math.cos(95 * t)
            y = a * math.sin(t) - (a / 95) * math.sin(95 * t)
            if math.isfinite(x) and math.isfinite(y):
                samples.append((x, y))
        assert len(samples) == 32, f"{name}: expected 32 finite samples, got {len(samples)}"
        xs = [p[0] for p in samples]
        ys = [p[1] for p in samples]
        print(f"{name}: {len(samples)}/32 finite samples, xRange={max(xs)-min(xs):.4f} yRange={max(ys)-min(ys):.4f}")

    print()
    print("=== Day 847 Heptacontahexaxagon feature: all checks pass ===")
    return 0

if __name__ == '__main__':
    sys.exit(main())
