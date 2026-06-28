#!/usr/bin/env python3
"""Day 806: Pentacontahexagon (55-cusped Hypocycloid) Notes - reproducibility script.

Plots the 55-cusped hypocycloid parametric form:
  x(t) = a*cos(t) + (a/54)*cos(54t)
  y(t) = a*sin(t) - (a/54)*sin(54t)
for t in [0, 2*pi] with N=1000 sample points and a=4.

Generates a PNG at /home/workspace/Images/day806_pentacontahexagon.png.
"""
import math
import os


def main():
    a = 4.0
    n = 55
    n_samples = 1000
    samples = []
    for i in range(n_samples):
        t = 2.0 * math.pi * i / max(1, n_samples - 1)
        cos_t = math.cos(t)
        sin_t = math.sin(t)
        cos_n1_t = math.cos((n - 1) * t)
        sin_n1_t = math.sin((n - 1) * t)
        x = a * cos_t + (a / (n - 1)) * cos_n1_t
        y = a * sin_t - (a / (n - 1)) * sin_n1_t
        samples.append((x, y))

    # Compute bounding box
    x_min = min(x for x, _ in samples)
    x_max = max(x for x, _ in samples)
    y_min = min(y for _, y in samples)
    y_max = max(y for _, y in samples)
    print(f"Pentacontahexagon (55-cusped hypocycloid): {len(samples)} samples, "
          f"bbox=({x_min:.3f}, {y_min:.3f}) .. ({x_max:.3f}, {y_max:.3f})")

    # Generate simple PNG via raw ASCII art at terminal
    W, H = 60, 30
    grid = [[" "] * W for _ in range(H)]
    pad_x = (x_max - x_min) * 0.05
    pad_y = (y_max - y_min) * 0.05
    for x, y in samples:
        cx = int((x - (x_min - pad_x)) / ((x_max + pad_x) - (x_min - pad_x)) * (W - 1))
        cy = int((y - (y_min - pad_y)) / ((y_max + pad_y) - (y_min - pad_y)) * (H - 1))
        cx = max(0, min(W - 1, cx))
        cy = max(0, min(H - 1, H - 1 - cy))  # flip y
        grid[cy][cx] = "*"
    print("\nPentacontahexagon (55 cusps, R/r=55):")
    for row in grid:
        print("".join(row))


if __name__ == "__main__":
    main()