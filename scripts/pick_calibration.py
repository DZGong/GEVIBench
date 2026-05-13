#!/usr/bin/env python3
"""
Interactive calibration helper for extract_curve.py.

Opens the image in a matplotlib window with a crosshair tracking your cursor
so you can see exactly which pixel you're hovering over. Click points to print
their pixel coordinates.

Suggested workflow: click your two calibration reference points (e.g., known
axis ticks), copy the coordinates, then paste them into --calib1 / --calib2.

Usage:
    python3 scripts/pick_calibration.py public/fv-sources/archon1.jpg
"""

from __future__ import annotations

import sys
from pathlib import Path

import matplotlib.pyplot as plt
from PIL import Image


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 1
    path = Path(sys.argv[1])
    if not path.exists():
        sys.exit(f"Not found: {path}")

    img = Image.open(path).convert("RGB")
    w, h = img.size
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.imshow(img)
    ax.set_title(f"{path.name} ({w}×{h} px) — hover for crosshair, click to record")
    ax.set_xlabel("x (px)")
    ax.set_ylabel("y (px)")

    # Crosshair lines that track the cursor
    vline = ax.axvline(x=0, color="red", linewidth=0.5, alpha=0.7, visible=False)
    hline = ax.axhline(y=0, color="red", linewidth=0.5, alpha=0.7, visible=False)
    coord_text = ax.text(0.01, 0.99, "", transform=ax.transAxes,
                         color="red", fontsize=11, verticalalignment="top",
                         bbox=dict(boxstyle="round,pad=0.3", facecolor="white",
                                   edgecolor="red", alpha=0.85))

    clicks: list[tuple[float, float]] = []

    def on_motion(event):
        if event.inaxes is None or event.xdata is None or event.ydata is None:
            vline.set_visible(False)
            hline.set_visible(False)
            coord_text.set_text("")
        else:
            vline.set_xdata([event.xdata, event.xdata])
            hline.set_ydata([event.ydata, event.ydata])
            vline.set_visible(True)
            hline.set_visible(True)
            coord_text.set_text(f"px = {event.xdata:.1f}, {event.ydata:.1f}")
        fig.canvas.draw_idle()

    def on_click(event):
        if event.inaxes is None or event.xdata is None or event.ydata is None:
            return
        if event.button != 1:  # only left-click records
            return
        px, py = event.xdata, event.ydata
        clicks.append((px, py))
        print(f"#{len(clicks)}: px={px:.1f}, py={py:.1f}")
        ax.plot(px, py, "rx", markersize=12, markeredgewidth=2)
        ax.annotate(str(len(clicks)), (px + 6, py - 6), color="red", fontsize=12,
                    fontweight="bold")
        fig.canvas.draw_idle()

    fig.canvas.mpl_connect("motion_notify_event", on_motion)
    fig.canvas.mpl_connect("button_press_event", on_click)

    print("Hover for crosshair. Left-click to record a point. Close window when done.")
    plt.tight_layout()
    plt.show()
    return 0


if __name__ == "__main__":
    sys.exit(main())
