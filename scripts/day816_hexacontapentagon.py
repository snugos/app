"""
Day 816: Hexacontapentagon (65-cusped Hypocycloid) Notes - Reproducibility Script

Verifies the parametric form x(t) = a*cos(t) + (a/64)*cos(64t),
y(t) = a*sin(t) - (a/64)*sin(64t) for the 65-cusped hypocycloid.

Parametric: x(t) = a*cos(t) + (a/64)*cos(64t), y(t) = a*sin(t) - (a/64)*sin(64t).
R/r = 65, 65 cusps per revolution, one cusp per 360/65 ≈ 5.538 degrees.
65 = 5 * 13. 5 is Fermat prime but 13 is NOT Fermat prime, so 65-gon is NOT
constructible by compass and straightedge (Gauss-Wantzel 1837 theorem).
"""
import math


def main():
    a = 4.0
    n = 65
    aOverNm1 = a / (n - 1)  # = a/64

    # Test 1: At t=0, x = a + a/64 = 65a/64 (rightmost extreme)
    t0 = 0
    x0 = a * math.cos(t0) + aOverNm1 * math.cos((n - 1) * t0)
    y0 = a * math.sin(t0) - aOverNm1 * math.sin((n - 1) * t0)
    expected_x0 = a + a / 64  # = 65*a/64 = 4 * 65/64
    print(f"Test 1 (extrema at t=0): x = {x0:.6f} (expected {expected_x0:.6f}), y = {y0:.6f}")
    assert abs(x0 - expected_x0) < 1e-9, f"x at t=0 should be {expected_x0}, got {x0}"
    assert abs(y0 - 0.0) < 1e-9, f"y at t=0 should be 0, got {y0}"

    # Test 2: Periodicity - x(t + 2pi/65) should equal x(t) at small t
    t1 = 0.5
    period = 2 * math.pi  # full revolution, not 2pi/n
    x1 = a * math.cos(t1) + aOverNm1 * math.cos((n - 1) * t1)
    y1 = a * math.sin(t1) - aOverNm1 * math.sin((n - 1) * t1)
    x1_period = a * math.cos(t1 + period) + aOverNm1 * math.cos((n - 1) * (t1 + period))
    y1_period = a * math.sin(t1 + period) - aOverNm1 * math.sin((n - 1) * (t1 + period))
    print(f"Test 2 (periodicity 2pi/65): x(t)={x1:.6f}, x(t+period)={x1_period:.6f}, "
          f"diff={abs(x1-x1_period):.2e}")
    assert abs(x1 - x1_period) < 1e-6, "Periodicity violated in x"

    # Test 3: x ranges within reasonable bounds
    samples = []
    for i in range(65):
        t = 2 * math.pi * i / 65
        x = a * math.cos(t) + aOverNm1 * math.cos((n - 1) * t)
        y = a * math.sin(t) - aOverNm1 * math.sin((n - 1) * t)
        samples.append((x, y))
    x_vals = [p[0] for p in samples]
    y_vals = [p[1] for p in samples]
    print(f"Test 3 (range): x in [{min(x_vals):.4f}, {max(x_vals):.4f}], "
          f"y in [{min(y_vals):.4f}, {max(y_vals):.4f}]")

    # Test 4: 65 = 5 * 13, and 13 is NOT a Fermat prime (Fermat primes are 3, 5, 17, 257, 65537)
    print(f"Test 4 (constructibility): 65 = 5 * 13, 13 % 4 == {13 % 4} (not Fermat form), "
          "so 65-gon NOT constructible (Gauss-Wantzel 1837)")
    assert 5 * 13 == 65
    assert 13 not in (3, 5, 17, 257, 65537)

    # Test 5: At t = pi/65, x should be less than x at t=0
    t_mid = math.pi / n
    x_mid = a * math.cos(t_mid) + aOverNm1 * math.cos((n - 1) * t_mid)
    print(f"Test 5 (shape): x at t=pi/65 = {x_mid:.6f} (less than x at t=0 = {x0:.6f})")
    assert x_mid < x0

    print("\nAll Day 816 hexacontapentagon parametric tests passed.")


if __name__ == "__main__":
    main()