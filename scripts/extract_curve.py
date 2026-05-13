#!/usr/bin/env python3
"""
Extract data points from a 2-D plot image — F-V curves, photobleach curves,
brightness vs voltage, dose-response, etc.

The output keys default to "voltage" and "deltaF" because the original use
case is F-V curves, but the script is curve-agnostic — override with
--x-key and --y-key (e.g. --x-key time_min --y-key fluorescence_pct for a
photobleach trace).

Workflow
========

1. Use scripts/pick_calibration.py to find pixel positions of two reference
   points whose axis values you know (e.g., where the -100 tick meets the
   0 line, and where the 0 tick meets the +40 line).
2. Run this script with --color, --calib1, --calib2, and --debug. Inspect
   the generated `<image>_debug.png` to verify the detected clusters match
   the figure.
3. Tune --sat-min, --peak-min-distance, --cluster-window etc. as needed.

F-V curve example
-----------------
    python3 scripts/extract_curve.py figure.jpg \\
        --color magenta \\
        --calib1 95,310,-80,0 \\
        --calib2 510,40,40,50 \\
        --debug

Photobleach curve example
-------------------------
    python3 scripts/extract_curve.py bleach.jpg \\
        --color blue \\
        --x-key time_min --y-key fluorescence_pct \\
        --calib1 60,400,0,0 \\
        --calib2 460,40,30,100 \\
        --debug

Multi-curve plot
----------------
For figures with multiple overlapping curves of the same color, add
--multi-curve to detect every y-peak at each x-cluster (one per curve).
Then use --select-curve {top,bottom,by-y-range} to keep only the curve
you want. If your target curve crosses other curves (e.g. starts as the
top curve and ends as the bottom curve), run twice with split ROIs and
concatenate:

    # Left half — target is the top curve
    python3 scripts/extract_curve.py figure.jpg ... \\
        --roi 5,150,65,168 \\
        --multi-curve --select-curve top

    # Right half — target is the bottom curve
    python3 scripts/extract_curve.py figure.jpg ... \\
        --roi 5,150,168,380 \\
        --multi-curve --select-curve bottom

Outputs JSON of {"<x-key>": [...], "<y-key>": [...]} on stdout, plus a
`<image>_debug.png` next to the input image when --debug is set.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFont


# Hue ranges in [0, 1]. Hue wraps for red.
COLOR_PRESETS = {
    "magenta": (0.83, 0.97),
    "pink":    (0.85, 0.99),
    "red":     (0.95, 0.05),
    "orange":  (0.04, 0.10),
    "yellow":  (0.13, 0.18),
    "olive":   (0.18, 0.25),  # yellow-green / chartreuse
    "green":   (0.25, 0.45),
    "cyan":    (0.45, 0.55),
    "blue":    (0.55, 0.70),
    "purple":  (0.70, 0.83),
    "black":   None,  # special: low value
}


def hsv_mask(rgb: np.ndarray, hue_range, sat_min: float, val_min: float, val_max: float) -> np.ndarray:
    """Boolean mask of pixels matching the hue range with sufficient saturation."""
    f = rgb.astype(np.float32) / 255.0
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    maxc = np.max(f, axis=-1)
    minc = np.min(f, axis=-1)
    v = maxc
    s = np.where(maxc > 0, (maxc - minc) / (maxc + 1e-10), 0)

    delta = maxc - minc + 1e-10
    rc = (maxc - r) / delta
    gc = (maxc - g) / delta
    bc = (maxc - b) / delta
    h = np.zeros_like(maxc)
    h = np.where(maxc == r, bc - gc, h)
    h = np.where(maxc == g, 2.0 + rc - bc, h)
    h = np.where(maxc == b, 4.0 + gc - rc, h)
    h = (h / 6.0) % 1.0

    if hue_range is None:
        # "black": just dark pixels
        return v < val_min
    h_lo, h_hi = hue_range
    if h_lo < h_hi:
        hue_match = (h >= h_lo) & (h <= h_hi)
    else:
        hue_match = (h >= h_lo) | (h <= h_hi)
    return hue_match & (s >= sat_min) & (v >= val_min) & (v <= val_max)


def find_x_clusters(mask: np.ndarray, min_height: int, min_distance: int, smoothing: int) -> List[int]:
    """Detect cluster centers by finding peaks in the x-density of the mask."""
    from scipy.ndimage import uniform_filter1d
    from scipy.signal import find_peaks

    x_density = mask.sum(axis=0).astype(float)
    if smoothing > 1:
        x_density = uniform_filter1d(x_density, size=smoothing)
    peaks, _ = find_peaks(x_density, height=min_height, distance=min_distance)
    return peaks.tolist()


def cluster_centroid(mask: np.ndarray, x_center: int, x_window: int,
                     y_method: str = "median") -> Optional[Tuple[float, float, int]]:
    """
    Compute (cy, cx, size) of masked pixels in a window around x_center.
    `y_method`: 'median' (robust to asymmetric violins),
                'mean'   (centroid),
                'mode'   (densest y — finds the violin's tightest band, most robust to
                         connecting lines that pass through the cluster region).
    """
    h, w = mask.shape
    x_lo = max(0, x_center - x_window)
    x_hi = min(w, x_center + x_window + 1)
    region = mask[:, x_lo:x_hi]
    ys, xs = np.where(region)
    if len(ys) == 0:
        return None
    if y_method == "mode":
        # Find the y-row with the most masked pixels in this window (densest part of the cluster).
        from scipy.ndimage import uniform_filter1d
        y_density = region.sum(axis=1).astype(float)
        # Smooth slightly so we pick a local mode rather than a noisy 1-pixel spike.
        y_density = uniform_filter1d(y_density, size=3)
        cy = float(np.argmax(y_density))
    elif y_method == "mean":
        cy = float(np.mean(ys))
    else:
        cy = float(np.median(ys))
    cx = float(np.mean(xs) + x_lo)
    return cy, cx, int(len(ys))


def find_all_y_peaks(mask: np.ndarray, x_center: int, x_window: int,
                     min_height: int, min_distance: int) -> List[Tuple[float, float, int]]:
    """
    Find all local y-peaks in the column window around x_center. Useful for
    multi-curve plots where multiple curves pass through the same x position
    at different y values.

    Returns a list of (cy, cx, size) tuples — one per detected y-peak.
    """
    from scipy.ndimage import uniform_filter1d
    from scipy.signal import find_peaks

    h, w = mask.shape
    x_lo = max(0, x_center - x_window)
    x_hi = min(w, x_center + x_window + 1)
    region = mask[:, x_lo:x_hi]
    if region.sum() == 0:
        return []
    y_density = region.sum(axis=1).astype(float)
    y_density = uniform_filter1d(y_density, size=3)
    peaks, _ = find_peaks(y_density, height=min_height, distance=min_distance)
    cx = float((x_lo + x_hi - 1) / 2.0)  # center of x-window
    return [(float(py), cx, int(y_density[py])) for py in peaks]


def calibrate(c1: tuple, c2: tuple):
    """Return (px -> data_x, py -> data_y) linear functions from two reference points."""
    px1, py1, vx1, vy1 = c1
    px2, py2, vx2, vy2 = c2
    if px1 == px2 or py1 == py2:
        sys.exit("Calibration points must differ on both axes.")
    mx = (vx2 - vx1) / (px2 - px1)
    bx = vx1 - mx * px1
    my = (vy2 - vy1) / (py2 - py1)
    by = vy1 - my * py1
    return (lambda px: mx * px + bx), (lambda py: my * py + by)


def parse_calib(s: str) -> Tuple[float, float, float, float]:
    parts = s.split(",")
    if len(parts) != 4:
        sys.exit(f"Calibration must be 'px,py,vx,vy' — got {s!r}")
    return tuple(float(p) for p in parts)  # type: ignore


def write_debug_image(img: Image.Image, mask: np.ndarray, clusters: List[Tuple[float, float, int]],
                      data_points: List[Tuple[float, float]], out_path: Path) -> None:
    """Overlay detected clusters and their derived data values on the original image."""
    overlay = img.convert("RGB").copy()
    # Tint the matched-mask pixels green so we can see what the color filter caught.
    arr = np.array(overlay)
    arr[mask] = (arr[mask] * 0.4 + np.array([0, 200, 0]) * 0.6).astype(np.uint8)
    overlay = Image.fromarray(arr)

    draw = ImageDraw.Draw(overlay)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 11)
    except OSError:
        font = ImageFont.load_default()
    for (cy, cx, _size), (v, df) in zip(clusters, data_points):
        r = 5
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 0, 0), width=2)
        draw.text((cx + 6, cy - 6), f"({v:.0f}, {df:.0f})", fill=(255, 0, 0), font=font)
    overlay.save(out_path)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image", type=Path)
    ap.add_argument("--color", default="magenta", choices=list(COLOR_PRESETS),
                    help="Data point color preset (overridden by --hue if given)")
    ap.add_argument("--hue", default=None,
                    help="Custom hue range, e.g. '0.15,0.22' (in [0,1]). Wraps if lo>hi.")
    ap.add_argument("--calib1", required=True, help="px,py,vx,vy of first calibration point")
    ap.add_argument("--calib2", required=True, help="px,py,vx,vy of second calibration point")
    ap.add_argument("--sat-min", type=float, default=0.35, help="Min HSV saturation [0-1]")
    ap.add_argument("--val-min", type=float, default=0.30, help="Min HSV value [0-1]")
    ap.add_argument("--val-max", type=float, default=1.00, help="Max HSV value [0-1]")
    ap.add_argument("--cluster-window", type=int, default=10, help="±px window for centroid")
    ap.add_argument("--peak-min-height", type=int, default=10, help="Min mask pixels per column to count as a peak")
    ap.add_argument("--peak-min-distance", type=int, default=15, help="Min px between adjacent peaks")
    ap.add_argument("--smoothing", type=int, default=5, help="Box-filter smoothing for x-density (px)")
    ap.add_argument("--normalize-at-x", type=float, default=None,
                    help="Subtract the y-value at the cluster nearest this x value from all y values. "
                         "Useful for F-V curves where ΔF/F = 0 at -70 mV (use --normalize-at-x -70).")
    ap.add_argument("--x-key", default="voltage", help="Output key for x values (default: 'voltage')")
    ap.add_argument("--y-key", default="deltaF",  help="Output key for y values (default: 'deltaF')")
    ap.add_argument("--round", type=int, default=0, help="Round output to N decimals")
    ap.add_argument("--debug", action="store_true", help="Write <image>_debug.png with overlays")
    ap.add_argument("--y-method", choices=["median", "mean", "mode"], default="mode",
                    help="How to compute the y-coord of each cluster centroid. "
                         "'mode' (default) picks the densest y-band — best when a connecting line passes through.")
    ap.add_argument("--multi-curve", action="store_true",
                    help="At each x-cluster, find ALL y-peaks (each curve in a multi-curve plot). "
                         "Output one (V, ΔF) pair per detected y-peak.")
    ap.add_argument("--y-peak-min-height", type=int, default=2,
                    help="Min pixels per y-row to count as a y-peak (used with --multi-curve)")
    ap.add_argument("--y-peak-min-distance", type=int, default=8,
                    help="Min y-pixel separation between y-peaks (used with --multi-curve)")
    ap.add_argument("--select-curve", choices=["top", "bottom", "all", "by-y-range"], default="all",
                    help="When --multi-curve: 'top' keeps the smallest-y peak per x-cluster (highest ΔF), "
                         "'bottom' keeps the largest-y (lowest ΔF), 'all' keeps every peak, "
                         "'by-y-range' filters by --y-range")
    ap.add_argument("--y-range", default=None,
                    help="With --select-curve by-y-range: 'lo,hi' in data ΔF units, keep peaks within range")
    ap.add_argument("--roi", default=None,
                    help="Crop region of interest before processing: 'top,bottom,left,right' in pixels. "
                         "Calibration coords must reference the *original* image — they're auto-translated.")
    args = ap.parse_args()

    if not args.image.exists():
        sys.exit(f"Image not found: {args.image}")

    img_full = Image.open(args.image).convert("RGB")
    if args.roi is not None:
        roi_parts = [int(p) for p in args.roi.split(",")]
        if len(roi_parts) != 4:
            sys.exit("--roi must be 'top,bottom,left,right'")
        roi_top, roi_bottom, roi_left, roi_right = roi_parts
        img = img_full.crop((roi_left, roi_top, roi_right, roi_bottom))
    else:
        roi_top, roi_left = 0, 0
        img = img_full
    rgb = np.array(img)

    if args.hue is not None:
        hue_parts = args.hue.split(",")
        if len(hue_parts) != 2:
            sys.exit("--hue must be 'lo,hi'")
        hue_range = (float(hue_parts[0]), float(hue_parts[1]))
    else:
        hue_range = COLOR_PRESETS[args.color]
    mask = hsv_mask(rgb, hue_range, args.sat_min, args.val_min, args.val_max)

    n_pixels = int(mask.sum())
    print(f"# masked pixels: {n_pixels}", file=sys.stderr)
    if n_pixels == 0:
        sys.exit("No pixels matched. Try a different --color or relax --sat-min/--val-min.")

    peaks = find_x_clusters(mask, args.peak_min_height, args.peak_min_distance, args.smoothing)
    print(f"# x-peaks found: {len(peaks)} at columns {peaks}", file=sys.stderr)
    if not peaks:
        sys.exit("No clusters found. Lower --peak-min-height or --peak-min-distance.")

    clusters = []
    if args.multi_curve:
        for px in peaks:
            ys = find_all_y_peaks(mask, px, args.cluster_window,
                                  args.y_peak_min_height, args.y_peak_min_distance)
            clusters.extend(ys)
    else:
        for px in peaks:
            c = cluster_centroid(mask, px, args.cluster_window, args.y_method)
            if c is not None:
                clusters.append(c)
    print(f"# raw cluster detections: {len(clusters)}", file=sys.stderr)

    # Calibration is provided in original-image coordinates; translate to ROI coordinates.
    c1 = parse_calib(args.calib1)
    c2 = parse_calib(args.calib2)
    c1 = (c1[0] - roi_left, c1[1] - roi_top, c1[2], c1[3])
    c2 = (c2[0] - roi_left, c2[1] - roi_top, c2[2], c2[3])
    voltage_fn, deltaF_fn = calibrate(c1, c2)

    raw_points = [(voltage_fn(cx), deltaF_fn(cy)) for (cy, cx, _) in clusters]

    # If multi-curve mode and a selection rule is given, group by x and pick one peak per group.
    if args.multi_curve and args.select_curve != "all":
        # Group points by their cluster (we use the original peak columns to group).
        groups = {}
        for (cy, cx, _size), (v, df) in zip(clusters, raw_points):
            key = round(cx)
            groups.setdefault(key, []).append((v, df, cy))
        selected = []
        kept_clusters = []
        for key in sorted(groups):
            members = groups[key]
            if args.select_curve == "top":
                # smallest cy = highest in image = highest ΔF
                pick = min(members, key=lambda m: m[2])
            elif args.select_curve == "bottom":
                pick = max(members, key=lambda m: m[2])
            elif args.select_curve == "by-y-range":
                if not args.y_range:
                    sys.exit("--select-curve by-y-range requires --y-range lo,hi")
                lo, hi = (float(p) for p in args.y_range.split(","))
                in_range = [m for m in members if lo <= m[1] <= hi]
                if not in_range:
                    continue
                # If multiple, take the one closest to the center of the range
                target = (lo + hi) / 2
                pick = min(in_range, key=lambda m: abs(m[1] - target))
            selected.append((pick[0], pick[1]))
            kept_clusters.append(next(c for c in clusters if abs(c[1] - key) < 0.6 and c[0] == pick[2]))
        raw_points = selected
        clusters = kept_clusters
        print(f"# after --select-curve {args.select_curve}: {len(raw_points)} points", file=sys.stderr)

    if args.normalize_at_x is not None:
        # Find cluster whose x is closest to the requested anchor; subtract its y from all y values
        anchor = float(args.normalize_at_x)
        nearest = min(range(len(raw_points)), key=lambda i: abs(raw_points[i][0] - anchor))
        offset = raw_points[nearest][1]
        raw_points = [(v, df - offset) for (v, df) in raw_points]
        print(f"# normalized to nearest x={anchor:g} cluster (was at x={raw_points[nearest][0] + offset:.1f}, "
              f"shifted y by {-offset:+.2f})", file=sys.stderr)

    fmt = lambda x: round(x, args.round) if args.round > 0 else int(round(x))
    xs = [fmt(v) for v, _ in raw_points]
    ys = [fmt(df) for _, df in raw_points]

    if args.debug:
        debug_path = args.image.parent / f"{args.image.stem}_debug.png"
        write_debug_image(img, mask, clusters, raw_points, debug_path)
        print(f"# debug overlay: {debug_path}", file=sys.stderr)

    print(json.dumps({args.x_key: xs, args.y_key: ys}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
