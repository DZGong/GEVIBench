# Family Tree Hover Tooltip — Design Spec

**Date:** 2026-03-16
**Status:** Approved

## Overview

Make the family tree panel interactive by showing a preview tooltip when hovering over a GEVI leaf node. The tooltip disappears when the mouse leaves the node. The tooltip is a read-only preview — it is not interactive.

## Scope

Changes are confined to `src/components/FamilyTreePanel.tsx`. No new files. No changes to other components.

## Tooltip Layout (Option B — Stacked)

Elements in order, top to bottom:

1. **Name** — `gevi.name`, colored using `getTreeNodeColor(gevi.name, '')` (same helper already used in the tree nodes)
2. **Year · Category** — `{gevi.year} · {gevi.category}`, small gray text
3. **Tag chips** — `gevi.tags ?? []`, at most 4; append `+N` chip if more
4. **Paper link row** — `BookOpen` icon + `gevi.paper` text + `ExternalLink` icon (decorative `<div>`, not a real `<a>`)
5. **Divider** — thin horizontal rule
6. **Radar chart** — recharts `RadarChart` at fixed 150×130 (no `ResponsiveContainer`)

Width: `TOOLTIP_W = 170` px (fixed). Estimated height: `TOOLTIP_H = 270` px (used only for flip math).

## GEVI Type Fields Used

Relevant fields from `src/types.ts` (`GEVI` interface):

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | required |
| `year` | `number` | required |
| `category` | `string` | required |
| `tags` | `string[]` | required (guard with `?? []` defensively) |
| `paper` | `string` | required |
| `paperUrl` | `string` | required |
| `brightness` | `number` | guard with `?? 0` |
| `speed` | `number` | guard with `?? 0` |
| `snr` | `number` | guard with `?? 0` |
| `dynamicRange` | `number` | guard with `?? 0` |
| `photostability` | `number` | guard with `?? 0` |
| `paperCount` | `number \| undefined` | optional, guard with `?? 0` |

## Data Model

`LayoutNode` (already defined in `FamilyTreePanel.tsx`) has `geviId?: string`. Leaf nodes are those with `geviId` set. The full GEVI array is available as `gevis` (from `useMemo(() => getAllGEVIs(), [])`). On hover, look up:

```ts
const gevi = gevis.find(g => g.id === node.geviId);
if (!gevi) return;
```

## State

```ts
interface HoverInfo {
  gevi: GEVI;
  x: number;  // viewport clientX (correct for position: fixed)
  y: number;  // viewport clientY (correct for position: fixed)
}
const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
```

`e.clientX` / `e.clientY` from React synthetic events are viewport-relative coordinates. This is correct for `position: fixed` regardless of whether the SVG container is scrollable. Do **not** use `e.pageX`/`e.pageY` or SVG-local coordinates.

## Interaction

Event handlers are attached to leaf `<g>` SVG elements. Use `React.MouseEvent<SVGGElement>` as the event type:

```ts
onMouseEnter={(e: React.MouseEvent<SVGGElement>) => {
  const gevi = gevis.find(g => g.id === node.geviId);
  if (gevi) setHoverInfo({ gevi, x: e.clientX, y: e.clientY });
}}
onMouseLeave={() => setHoverInfo(null)}
```

**Hit area:** The existing leaf `<g>` already renders `<circle r={16} fill="transparent" />` as an invisible hit-target — do not remove it. This ensures reliable `mouseenter`/`mouseleave` events across the entire 32px diameter.

**Rapid movement between nodes:** When the cursor moves from one leaf to an adjacent leaf, `onMouseLeave` on the first and `onMouseEnter` on the second fire in the same React event batch, so there is no intermediate `null` frame. This is a known React batching behavior and requires no special handling.

**Page scroll while hovering:** Tooltip may drift from its node. Declared out of scope.

## Tooltip Positioning

Define constants at module top level:

```ts
const TOOLTIP_W = 170;
const TOOLTIP_H = 270;
```

Compute `left` and `top` **in the component render body, above the `return` statement**:

```ts
let tooltipLeft = 0;
let tooltipTop = 0;
if (hoverInfo) {
  // Default: 16px right of cursor
  tooltipLeft = hoverInfo.x + 16;
  // Flip left if right edge overflows
  if (tooltipLeft + TOOLTIP_W > window.innerWidth) {
    tooltipLeft = hoverInfo.x - 16 - TOOLTIP_W;
  }
  // Clamp: never go off left edge
  tooltipLeft = Math.max(8, tooltipLeft);

  // Default: 20px above cursor
  tooltipTop = hoverInfo.y - 20;
  // Shift up if bottom edge overflows
  if (tooltipTop + TOOLTIP_H > window.innerHeight) {
    tooltipTop = window.innerHeight - TOOLTIP_H - 8;
  }
  // Clamp: never go off top edge
  tooltipTop = Math.max(8, tooltipTop);
}
```

## Tooltip DOM

Rendered as a sibling `<div>` **after** the scrollable SVG container in `FamilyTreePanel`'s JSX return:

```tsx
{hoverInfo && (
  <div
    style={{
      position: 'fixed',
      left: tooltipLeft,
      top: tooltipTop,
      zIndex: 9999,
      pointerEvents: 'none',
      width: TOOLTIP_W,
    }}
    className={`rounded-lg border shadow-lg p-2.5 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}
  >
    {/* content — see sections below */}
  </div>
)}
```

`pointer-events: none` ensures mouse events pass through to the SVG below, keeping `onMouseLeave` reliable. All content inside is display-only.

> **Note:** `position: fixed` breaks if any ancestor has `transform`, `filter`, or `will-change`. The current GEVIBench DOM has none. If this regresses, use `ReactDOM.createPortal(…, document.body)`.

## Radar Chart

**Do not use `ResponsiveContainer`** — it measures the parent via `ResizeObserver` and gets zero size inside a fixed-width div. Use explicit dimensions only:

```tsx
const radarData = [
  { subject: 'Bright', value: hoverInfo.gevi.brightness    ?? 0, fullMark: 100 },
  { subject: 'Speed',  value: hoverInfo.gevi.speed          ?? 0, fullMark: 100 },
  { subject: 'SNR',    value: hoverInfo.gevi.snr            ?? 0, fullMark: 100 },
  { subject: 'Range',  value: hoverInfo.gevi.dynamicRange   ?? 0, fullMark: 100 },
  { subject: 'Stable', value: hoverInfo.gevi.photostability ?? 0, fullMark: 100 },
  { subject: 'Papers', value: Math.min(100, (hoverInfo.gevi.paperCount ?? 0) * 5), fullMark: 100 },
];

<RadarChart width={150} height={130} data={radarData}>
  <PolarGrid />
  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8 }} />
  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
  <Radar
    dataKey="value"
    stroke={darkMode ? '#60a5fa' : '#1e40af'}
    fill={darkMode ? '#60a5fa' : '#1e40af'}
    fillOpacity={0.2}
  />
</RadarChart>
```

## Paper Link Row (decorative)

```tsx
{hoverInfo.gevi.paperUrl && hoverInfo.gevi.paper && (
  <div className={`text-xs flex items-center gap-1 ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>
    <BookOpen className="w-3 h-3 flex-shrink-0" />
    <span className="truncate flex-1">{hoverInfo.gevi.paper}</span>
    <ExternalLink className="w-3 h-3 flex-shrink-0" />
  </div>
)}
```

Use `<div>` not `<a>` — `pointer-events: none` on the container makes anchors non-functional.

## Tag Chips

```tsx
const tags = hoverInfo.gevi.tags ?? [];
const visibleTags = tags.slice(0, 4);
const extraCount = tags.length - visibleTags.length;

<div className="flex flex-wrap gap-1">
  {visibleTags.map(tag => (
    <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded ${
      darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'
    }`}>
      {tag}
    </span>
  ))}
  {extraCount > 0 && (
    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
      darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
    }`}>
      +{extraCount}
    </span>
  )}
</div>
```

## Imports to Update in `FamilyTreePanel.tsx`

```ts
// Before:
import { useMemo } from 'react';
import { X } from 'lucide-react';

// After:
import { useMemo, useState } from 'react';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
```

## Out of Scope

- Tooltip links being clickable (tooltip is read-only; click the node to open full GEVIDetail)
- Touch / mobile hover support
- Tooltip appear/disappear animation
- Page scroll while hovering
