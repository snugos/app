import math

CUSPS = 129
SCALE = 4
PI = math.pi
SHAPES = ['standard', 'inverted', 'hectoicosikaienneagon', 'tight']

print(f"=== Day 880 Hectoicosikaienneagon ({CUSPS}-cusped Hypocycloid) ===")
print(f"Parametric: x(t) = a*cos(t) + (a/128)*cos(128t), y(t) = a*sin(t) - (a/128)*sin(128t)")
print(f"R/r = {CUSPS}, ~{360/CUSPS:.4f} degree cusp intervals")
print()

a = SCALE
aOver = a / (CUSPS - 1)
print(f"a = {a}, a/{CUSPS-1} = {aOver}")
print(f"x at t=0 = {a * math.cos(0) + aOver * math.cos(0)} = {CUSPS}*a/{CUSPS-1} = {CUSPS * a / (CUSPS-1)}")
print()

for shape in SHAPES:
    if shape == 'standard':
        tmin, tmax = 0, 2*PI
    elif shape == 'inverted':
        tmin, tmax = 2*PI, 0
    elif shape == 'hectoicosikaienneagon':
        tmin, tmax = 0, 2*PI / CUSPS
    elif shape == 'tight':
        tmin, tmax = -PI / CUSPS, PI / CUSPS
    finite = 0
    xmin = float('inf'); xmax = -float('inf')
    ymin = float('inf'); ymax = -float('inf')
    for i in range(32):
        t = tmin + (tmax - tmin) * i / max(1, 31)
        x = a * math.cos(t) + aOver * math.cos((CUSPS-1) * t)
        y = a * math.sin(t) - aOver * math.sin((CUSPS-1) * t)
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        finite += 1
        if x < xmin: xmin = x
        if x > xmax: xmax = x
        if y < ymin: ymin = y
        if y > ymax: ymax = y
    print(f"shape={shape:18s} finite={finite}/32 xRange={xmax-xmin:.4f} yRange={ymax-ymin:.4f}")

print()
print(f"HECTOICOSIKAIENNEAGON_NOTES_HECTOICOSIKAIENNEAGON_T_MAX = 2*PI/129 = {2*PI/CUSPS:.6f}")
print(f"HECTOICOSIKAIENNEAGON_NOTES_TIGHT_T_MIN = -PI/129 = {-PI/CUSPS:.6f}")
print(f"HECTOICOSIKAIENNEAGON_NOTES_TIGHT_T_MAX = PI/129 = {PI/CUSPS:.6f}")
print()
print(f"129 = 3 * 43")
print(f"3 IS a Fermat prime (2^(2^0)+1 = 3)")
print(f"43 is NOT a Fermat prime (Fermat primes: 3, 5, 17, 257, 65537)")
print(f"Gauss-Wantzel 1837: n constructible iff product of DISTINCT Fermat primes and power of 2")
print(f"129 = 3*43: 3 is Fermat but 43 is NOT Fermat, so 129 is NOT constructible")
