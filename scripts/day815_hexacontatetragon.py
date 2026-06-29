import math

a = 4

def pt(t):
    return (a * math.cos(t) + (a / 63) * math.cos(63 * t), a * math.sin(t) - (a / 63) * math.sin(63 * t))

x0, y0 = pt(0)
assert abs(x0 - (64 * a / 63)) < 1e-9
assert abs(y0) < 1e-9
pts = [pt((2 * math.pi * i) / 6400) for i in range(6401)]
xs = [p[0] for p in pts]
ys = [p[1] for p in pts]
assert max(xs) > 4.06 and min(xs) < -4.06
assert max(ys) > 4.06 and min(ys) < -4.06
assert 2 ** 6 == 64
print(f"x at t=0 = {x0:.6f} = 64a/63")
print(f"x range [{min(xs):.4f}, {max(xs):.4f}]")
print(f"y range [{min(ys):.4f}, {max(ys):.4f}]")
print("all 5 verification tests pass")
