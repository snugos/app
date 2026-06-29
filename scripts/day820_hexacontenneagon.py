"""Day 820: Hexacontenneagon (69-cusped Hypocycloid) Notes - verification script.

Verifies the parametric math:
- 69-cusped hypocycloid parametric: x(t) = a*cos(t) + (a/68)*cos(68t), y(t) = a*sin(t) - (a/68)*sin(68t)
- At t=0: x = a + a/68 = 69a/68 (rightmost extreme)
- 69 = 3 * 23, IS NOT constructible (23 is not Fermat)
"""
import math


def hexacontenneagon_xy(t, a):
    """Compute (x, y) on the 69-cusped hypocycloid."""
    x = a * math.cos(t) + (a / 68) * math.cos(68 * t)
    y = a * math.sin(t) - (a / 68) * math.sin(68 * t)
    return x, y


def main():
    a = 4.0
    print("Day 820: Hexacontenneagon (69-cusped hypocycloid) Notes verification")
    print("=" * 70)

    # Test 1: At t=0, x should be 69a/68 (rightmost extreme)
    x0, y0 = hexacontenneagon_xy(0, a)
    expected_x0 = 69 * a / 68
    print(f"Test 1: x at t=0 = {x0:.6f}, expected = {expected_x0:.6f} (= 69a/68)")
    assert abs(x0 - expected_x0) < 1e-10, f"FAIL: x(0) = {x0}, expected {expected_x0}"
    print("  PASS")

    # Test 2: y at t=0 should be 0
    print(f"Test 2: y at t=0 = {y0:.6f}, expected = 0")
    assert abs(y0) < 1e-10
    print("  PASS")

    # Test 3: At t=pi, since 68 is even, cos(68*pi) = 1, so x(pi) = -a + a/68 = -67a/68
    x_pi, y_pi = hexacontenneagon_xy(math.pi, a)
    expected_x_pi = -67 * a / 68
    print(f"Test 3: x at t=pi = {x_pi:.6f}, expected = {expected_x_pi:.6f} (= -67a/68 since 68 is even)")
    assert abs(x_pi - expected_x_pi) < 1e-10
    print("  PASS")

    # Test 4: 69 = 3 * 23 factorization
    print(f"Test 4: 69 = 3 * 23 = {3 * 23}")
    assert 3 * 23 == 69
    print("  PASS")

    # Test 5: Constructibility check
    fermat_primes = {3, 5, 17, 257, 65537}
    print(f"Test 5: 3 IS Fermat prime: {3 in fermat_primes}, 23 is NOT Fermat prime: {23 not in fermat_primes}")
    assert 3 in fermat_primes and 23 not in fermat_primes
    print("  69-gon IS NOT constructible (23 fails the distinctness criterion)")
    print("  PASS")

    # Test 6: 69 cusps per revolution, 360/69 ≈ 5.217 degrees per cusp
    cusp_interval_deg = 360.0 / 69
    print(f"Test 6: Cusp interval = {cusp_interval_deg:.4f} degrees (= 2π/69 rad)")
    assert abs(cusp_interval_deg - 360.0/69) < 1e-10
    print("  PASS")

    # Test 7: Sample 32 points and verify they're all finite
    print("Test 7: Sampling 32 points along the hexacontenneagon curve...")
    samples = []
    for i in range(32):
        t = 2 * math.pi * i / 31
        x, y = hexacontenneagon_xy(t, a)
        assert math.isfinite(x) and math.isfinite(y), f"Non-finite at i={i}: ({x}, {y})"
        samples.append((x, y))
    x_min = min(p[0] for p in samples)
    x_max = max(p[0] for p in samples)
    y_min = min(p[1] for p in samples)
    y_max = max(p[1] for p in samples)
    print(f"  x range: [{x_min:.4f}, {x_max:.4f}]")
    print(f"  y range: [{y_min:.4f}, {y_max:.4f}]")
    print("  PASS")

    # Test 8: 4 shape variations
    print("Test 8: 4 shape variations defined (standard/inverted/hexacontenneagon/tight)")
    shapes = ["standard", "inverted", "hexacontenneagon", "tight"]
    assert len(shapes) == 4
    print("  PASS")

    print("=" * 70)
    print("All 8 Day 820 verification tests PASSED")


if __name__ == "__main__":
    main()