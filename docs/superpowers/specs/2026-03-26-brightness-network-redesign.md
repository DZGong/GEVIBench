# Brightness Network Visual Redesign

**Date:** 2026-03-26
**File:** `src/components/BrightnessNetworkPanel.tsx`
**Goal:** Redesign the brightness network visualization to match MiroFish-style aesthetics — clean, airy, scholarly — with rounded hexagon nodes consistent with the family tree panel.

## Reference

- MiroFish graph relationship visualization (https://github.com/666ghj/MiroFish)
- Existing `FamilyTreePanel.tsx` hexPath() function for node shape

## Node Design

- **Shape:** Rounded pointy-top hexagon using the same `hexPath(r, cr)` algorithm from `FamilyTreePanel.tsx`. Duplicate the function into `BrightnessNetworkPanel.tsx` (no shared utility needed — same pattern as family tree).
- **Size:** Uniform small radius (~10-12px) for all regular nodes. EGFP slightly larger (~14px) as the anchor node.
- **Color by category:** Same mapping as current — amber `#f59e0b` for EGFP, green for GFP-based, magenta for chemigenetic, dark red for opsin, gray `#6b7280` for external refs.
- **Stroke:** White stroke (`#fff`, 1.2px) on all nodes. External refs use dashed stroke.
- **Fill opacity:** 1.0 for DB nodes, 0.35 for external refs (same concept as current).
- **Labels below node:**
  - Name: 8.5-9px, `#374151` (light) / `#d1d5db` (dark), font-weight 500. EGFP gets font-weight 700.
  - Brightness score: Small secondary text below name, lighter color (`#94a3b8`), 7-8px. Format: score value only (e.g. "60").
  - Both labels get a white text halo (stroke on text with `paintOrder: stroke`) for readability.
- **No text or score inside the node** — nodes stay small and clean.

## Edge Design

- **Straight lines**, stroke-width 1.2px, color `#cbd5e1` (light) / `#4b5563` (dark).
- **Ratio labels always visible** at edge midpoints:
  - Font: 8-9px, `#64748b`, font-weight 500.
  - White text halo (stroke-width 2.5, `paintOrder: stroke`) for readability over edges.
  - Same `formatRatio()` helper as current.
- **Hover state:**
  - Hovered edge: stroke thickens to 2.5px, color `#60a5fa` (blue). Label turns blue.
  - Related edges (connected to hovered node): stroke `#60a5fa`, label highlighted.
- **Invisible hit area:** Transparent stroke-width 14 behind each edge for easy hovering (same as current).

## Layout Algorithm

### Enhanced Fruchterman-Reingold

Modify the existing `forceLayout()` function:

- **Canvas size:** Increase from `W=1100, H=820` to `W=1400, H=1000`.
- **Ideal spacing (K):** Change multiplier from `0.75` to `1.5` — `K = Math.sqrt((W * H) / N) * 1.5`.
- **Repulsion:** Same formula (`K * K / d`) but with the larger K, repulsion is ~4x stronger.
- **Attraction:** Weaken by scaling down: `f = (d * d) / K * 0.4` (add 0.4 factor).
- **Gravity:** Reduce from `0.008` to `0.003` to let nodes spread more freely.
- **Iterations:** Increase from 350 to 500 for better convergence with the weaker forces.
- **Temperature:** Keep initial temp at `Math.min(W, H) * 0.12`, cooling at `0.93`.
- **Padding:** Increase from 60 to 80.

### Post-Simulation Collision Resolution

After the FR simulation completes, run a separate pass to guarantee minimum spacing:

```
MIN_DIST = 70  // minimum center-to-center distance between any two nodes
for 50 iterations:
  for each pair (A, B):
    d = distance(A, B)
    if d < MIN_DIST:
      overlap = MIN_DIST - d
      if A is EGFP:
        push only B away by `overlap`
      else if B is EGFP:
        push only A away by `overlap`
      else:
        push A and B apart by `overlap / 2` each
      clamp moved nodes to canvas bounds (pad=80)
```

This guarantees no node overlap regardless of graph topology. EGFP stays pinned at center but still repels nearby nodes.

### Decorative Ring Guides

- Draw faint dashed concentric circles centered on EGFP at BFS distances.
- For each BFS distance level `d` (1, 2, 3, ...), draw a circle at radius `d * ringSpacing` where `ringSpacing = Math.min(W, H) * 0.18`.
- Style: `stroke: #e2e8f0` (light) / `#1e293b` (dark), stroke-width 1, `stroke-dasharray: 4 3`, opacity ~0.5.
- These are purely decorative — they do NOT constrain node positions.
- Rendered as the bottommost layer in the SVG (behind edges and nodes).

## Interaction

All interactions remain functionally the same as current:

- **Pan:** Drag to pan (same mousedown/move/up handlers).
- **Zoom:** Scroll to zoom with non-passive wheel listener (same logic, 0.25x-4x range).
- **Hover node:** Glow ring (hexagon outline at r+4, node color, 0.4 opacity). Connected edges highlight blue. Unrelated nodes/edges fade to opacity 0.15.
- **Hover edge:** Edge + label turn blue. Connected nodes highlight. Others fade.
- **Click node:** `onSelectGEVI(node.gevi)` — navigate to GEVI detail panel (same).
- **Tooltip:** Fixed at top-right corner on node hover (same content and styling as current).

## Legend

Update the legend strip to use small inline SVG hexagons instead of circles:

- Replace `<span class="inline-block w-2.5 h-2.5 rounded-full">` with a small inline `<svg>` containing a hexagon `<polygon>` (10x10 viewBox) filled with the category color.
- Same categories: EGFP (anchor), GFP-based, Chemigenetic, Opsin-based, External ref.
- Keep the "Node size ∝ brightness score" note — update to remove since nodes are now uniform size. Replace with nothing (remove the note).

## Dark Mode

All colors have dark mode variants (already listed inline above). The existing `darkMode` conditional pattern continues unchanged.

## What Does NOT Change

- `buildGraph()` function — graph construction and BFS B_rel resolution stays identical.
- `formatRatio()` helper — same formatting.
- Tooltip content and layout.
- Header bar content and styling.
- Pan/zoom mechanics.
- Component props interface.
- No new dependencies.
