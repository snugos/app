import math

a = 4
samples = 32
shapes = {
    'standard': (0, 2 * math.pi),
    'inverted': (2 * math.pi, 0),
    'heptacontakaiheptadecagon': (0, 2 * math.pi / 87),
    'tight': (-math.pi / 87, math.pi / 87),
}

print('Day 838 Heptacontakaiheptadecagon reproducibility check')
print(f'x at t=0 = {a * math.cos(0) + (a/86) * math.cos(86 * 0):.6f} = 87a/86')
print('87 = 3 * 29; 29 is prime but not a Fermat prime, so NOT constructible per Gauss-Wantzel 1837')
print(f'R/r = 87, cusp interval = {360/87:.4f} degrees')
for name, (t_min, t_max) in shapes.items():
    pts = []
    for i in range(samples):
        t = t_min + (t_max - t_min) * i / max(1, samples - 1)
        x = a * math.cos(t) + (a / 86) * math.cos(86 * t)
        y = a * math.sin(t) - (a / 86) * math.sin(86 * t)
        pts.append((x, y))
    finite = sum(1 for x, y in pts if math.isfinite(x) and math.isfinite(y))
    xs = [x for x, _ in pts]
    ys = [y for _, y in pts]
    print(f'{name}: {finite}/{samples} finite samples, xRange={max(xs)-min(xs):.6f} yRange={max(ys)-min(ys):.6f}')
