#!/usr/bin/env python3
"""Day 809: Pentacontaenneagon (58-cusped hypocycloid) reproducibility script.

Verifies the parametric form: x = a*cos(t) + (a/57)*cos(57t), y = a*sin(t) - (a/57)*sin(57t).
"""
import math

def pentacontaenneagon(t, a):
    cos_t = math.cos(t)
    sin_t = math.sin(t)
    cos_57t = math.cos(57 * t)
    sin_57t = math.sin(57 * t)
    a_over_57 = a / 57
    x = a * cos_t + a_over_57 * cos_57t
    y = a * sin_t - a_over_57 * sin_57t
    return x, y

# Sample 32 points along the standard 58-cusped hypocycloid
a = 4.0
N = 32
print(f"Pentacontaenneagon (58-cusped hypocycloid), a={a}, N={N}:")
print(f"{'i':>4} {'t':>10} {'x':>12} {'y':>12}")
for i in range(N):
    t = 2 * math.pi * i / max(1, N - 1)
    x, y = pentacontaenneagon(t, a)
    print(f"{i:4d} {t:10.4f} {x:12.4f} {y:12.4f}")

# Verify at t=0
x0, y0 = pentacontaenneagon(0.0, a)
print(f"\nAt t=0: x={x0:.6f} (expected {a + a/57:.6f}), y={y0:.6f} (expected 0)")

# Verify T_MAX constant
t_max = 2 * math.pi / 58
print(f"\nT_MAX = 2π/58 = {t_max:.6f}")
t_tight = math.pi / 58
print(f"TIGHT_T_MAX = π/58 = {t_tight:.6f}")

# Verify constructibility: 58 = 2 × 29, 29 is prime but NOT a Fermat prime
# (Fermat primes are 3, 5, 17, 257, 65537)
print(f"\n58 = 2 × 29")
print(f"29 is prime: {all(29 % i != 0 for i in range(2, 6))}")
print(f"29 in Fermat primes {{3, 5, 17, 257, 65537}}: {29 in {3, 5, 17, 257, 65537}}")
print(f"58-gon NOT constructible by compass and straightedge (Gauss-Wantzel 1837)")
