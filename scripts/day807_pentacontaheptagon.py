#!/usr/bin/env python3
"""Day 807: Pentacontaheptagon (56-cusped Hypocycloid) Notes Reproducibility Script."""
import math

# Verify parametric form: x = a*cos(t) + (a/55)*cos(55t), y = a*sin(t) - (a/55)*sin(55t)
def pentacontaheptagon(t, a=4):
    cosT = math.cos(t)
    sinT = math.sin(t)
    cos55T = math.cos(55 * t)
    sin55T = math.sin(55 * t)
    aOver55 = a / 55
    x = a * cosT + aOver55 * cos55T
    y = a * sinT - aOver55 * sin55T
    return x, y

if __name__ == "__main__":
    # At t = 0, x = a + a/55 = 56a/55, y = 0 (rightmost extreme)
    x, y = pentacontaheptagon(0, 4)
    expected_x = 4 * 56 / 55
    print(f"t=0: x={x:.6f}, y={y:.6f} (expected x≈{expected_x:.6f}, y=0)")
    assert abs(x - expected_x) < 1e-9 and abs(y) < 1e-9, "t=0 verification failed"
    
    # 56 = 2^3 * 7; NOT constructible (7 is not Fermat)
    # Number of cusps = 56, R/r = 56
    cusps = 56
    R_over_r = 56
    cusp_interval_deg = 360 / cusps
    print(f"Pentacontaheptagon: {cusps} cusps, R/r={R_over_r}, cusp interval = {cusp_interval_deg:.4f}°")
    print(f"Parametric: x = a*cos(t) + (a/{cusps-1})*cos({cusps-1}t), y = a*sin(t) - (a/{cusps-1})*sin({cusps-1}t)")
    print(f"Constructible by compass-and-straightedge: NO (Gauss-Wantzel 1837, since 7 is not Fermat)")
    print("Day 807 verification PASSED")
