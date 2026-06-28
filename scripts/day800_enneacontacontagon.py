#!/usr/bin/env python3
"""Day 800: Enneacontacontagon (49-cusped Hypocycloid) Notes - reproducibility script.

Parametric equations:
  x(t) = a*cos(t) + (a/48)*cos(48*t)
  y(t) = a*sin(t) - (a/48)*sin(48*t)

R/r = 49, 49 cusps per revolution, cusp interval = 360/49 deg.
"""

import math

def enneacontacontagon(a=4.0, length=32, t_min=0.0, t_max=2*math.pi):
    """Generate (x, y) samples along the 49-cusped enneacontacontagon."""
    samples = []
    a_over_48 = a / 48
    for i in range(length):
        t = t_min + (t_max - t_min) * i / max(1, length - 1)
        cosT = math.cos(t)
        sinT = math.sin(t)
        cos48T = math.cos(48 * t)
        sin48T = math.sin(48 * t)
        x = a * cosT + a_over_48 * cos48T
        y = a * sinT - a_over_48 * sin48T
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        samples.append((x, y))
    return samples

if __name__ == "__main__":
    samples = enneacontacontagon()
    print(f"Day 800: Enneacontacontagon (49-cusped Hypocycloid) - {len(samples)} samples")
    print(f"  x(0) = {samples[0][0]:.4f}, y(0) = {samples[0][1]:.4f} (rightmost extreme = 49a/48 = {49 * 4 / 48:.4f})")
    print(f"  x_min = {min(s[0] for s in samples):.4f}, x_max = {max(s[0] for s in samples):.4f}")
    print(f"  y_min = {min(s[1] for s in samples):.4f}, y_max = {max(s[1] for s in samples):.4f}")
    # 49 = 7^2 is composite, NOT constructible by compass and straightedge
    # (Gauss-Wantzel 1837: 7 is prime but not a Fermat prime; Fermat primes are 3, 5, 17, 257, 65537)
    print(f"  49 = 7^2 is NOT constructible by compass and straightedge (Gauss-Wantzel 1837)")
    print(f"  49-fold rotational D49 dihedral symmetry, 49 inward-pointing cusps")
    print(f"  Cusp interval = 360/49 ≈ {360/49:.4f} degrees")