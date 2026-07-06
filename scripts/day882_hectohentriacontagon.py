"""
Day 882: Hectohentriacontagon (131-cusped Hypocycloid) Notes Feature
Reproducibility script.

131 is the 32nd prime. 131 IS a prime but NOT a Fermat prime
(Fermat primes are 3, 5, 17, 257, 65537), so 131 IS NOT constructible
by compass and straightedge (Gauss-Wantzel 1837 theorem).
"""
import math

N = 131  # number of cusps
print(f"=== Day 882: Hectohentriacontagon ({N}-cusped Hypocycloid) ===")
print(f"131 IS a prime (the 32nd prime) but NOT a Fermat prime, so NOT constructible per Gauss-Wantzel 1837")
print(f"R/r = {N}, {N} cusps per revolution")
print(f"cusp interval = 360°/{N} = {360/N:.6f}° = 2π/{N} = {2*math.pi/N:.6f} rad")

# Parametric verification
a = 4
for t in [0, math.pi / (2*N), math.pi / N, 2 * math.pi / N, math.pi, 2*math.pi]:
    cosT = math.cos(t)
    sinT = math.sin(t)
    cosNT = math.cos(N * t)
    sinNT = math.sin(N * t)
    x = a * cosT + (a / (N-1)) * cosNT
    y = a * sinT - (a / (N-1)) * sinNT
    finite = math.isfinite(x) and math.isfinite(y)
    print(f"  t={t:.4f}: x={x:.4f}, y={y:.4f}, finite={finite}")

# All 4 shapes parametric
print()
print("=== All 4 shapes (32 samples each) ===")
for shape, (tMin, tMax) in [
    ('standard', (0, 2*math.pi)),
    ('inverted', (2*math.pi, 0)),
    ('hectohentriacontagon', (0, 2*math.pi/N)),
    ('tight', (-math.pi/N, math.pi/N))
]:
    samples = []
    for i in range(32):
        t = tMin + (tMax - tMin) * i / max(1, 31)
        cosT = math.cos(t); sinT = math.sin(t)
        cosNT = math.cos((N-1) * t); sinNT = math.sin((N-1) * t)
        x = a * cosT + (a / (N-1)) * cosNT
        y = a * sinT - (a / (N-1)) * sinNT
        if math.isfinite(x) and math.isfinite(y):
            samples.append((x, y))
    if samples:
        xs = [s[0] for s in samples]
        ys = [s[1] for s in samples]
        print(f"  {shape}: {len(samples)}/32 finite, xRange=[{min(xs):.4f}, {max(xs):.4f}], yRange=[{min(ys):.4f}, {max(ys):.4f}]")

print()
print(f"131 = prime, NOT Fermat. NOT constructible per Gauss-Wantzel 1837.")
print(f"x at t=0 = a + a/130 = a*(1 + 1/130) = a*131/130 = {a * 131/130:.6f}")
