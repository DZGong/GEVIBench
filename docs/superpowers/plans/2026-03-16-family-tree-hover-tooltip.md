# Family Tree Hover Tooltip Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a read-only preview tooltip (name, tags, paper link, radar chart) when hovering a leaf node in the family tree SVG panel.

**Architecture:** All changes are in a single file (`FamilyTreePanel.tsx`). A `useState` hook tracks the hovered GEVI and mouse position. A `position: fixed` div renders the tooltip outside the SVG overflow container using viewport coordinates from the mouse event.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, recharts (already installed), lucide-react (already installed)

---

## File Structure

| File | Change |
|---|---|
| `src/components/FamilyTreePanel.tsx` | Only file modified — adds state, event handlers, tooltip JSX, new imports |

No new files are created.

---

### Task 1: Add imports

**Files:**
- Modify: `src/components/FamilyTreePanel.tsx` (top of file, lines 1–9)

The current import block is:
```ts
import { useMemo } from 'react';
import { X } from 'lucide-react';
import { getAllGEVIs } from '../geviData';
import type { GEVI, TreeNode } from '../types';
import { getTreeNodeColor } from '../utils';
```

- [ ] **Step 1: Update the import lines**

Replace the first two import lines with:
```ts
import { useMemo, useState } from 'react';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
```

The remaining imports (`getAllGEVIs`, `GEVI`, `TreeNode`, `getTreeNodeColor`) stay unchanged.

- [ ] **Step 2: Verify the app still compiles**

Run:
```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark && npm run build 2>&1 | tail -20
```
Expected: No TypeScript errors. (There may be an unused-variable warning for `useState` until the next task — that's fine.)

---

### Task 2: Add tooltip constants and state

**Files:**
- Modify: `src/components/FamilyTreePanel.tsx`

- [ ] **Step 1: Add module-level constants**

After the existing layout constants block (after `const NODE_RADIUS_BRANCH = 5;`, around line 30), add:
```ts
const TOOLTIP_W = 170;
const TOOLTIP_H = 270;
```

- [ ] **Step 2: Add HoverInfo interface**

After the existing `LayoutResult` interface (around line 49), add:
```ts
interface HoverInfo {
  gevi: GEVI;
  x: number;
  y: number;
}
```

- [ ] **Step 3: Add useState inside the component**

Inside the `FamilyTreePanel` component body, after the existing `useMemo` calls (around line 294), add:
```ts
const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
```

- [ ] **Step 4: Verify the app still compiles**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark && npm run build 2>&1 | tail -20
```
Expected: No errors.

---

### Task 3: Add mouse event handlers to leaf nodes

**Files:**
- Modify: `src/components/FamilyTreePanel.tsx` — the `<g>` element for leaf nodes (around line 361–403)

The existing leaf `<g>` element looks like:
```tsx
<g
  key={`node_${i}`}
  transform={`translate(${node.x}, ${node.y})`}
  onClick={() => handleNodeClick(node.geviId)}
  style={{ cursor: isLeaf ? 'pointer' : 'default' }}
>
```

- [ ] **Step 1: Add onMouseEnter and onMouseLeave to the leaf `<g>` element**

Replace the opening `<g>` tag with:
```tsx
<g
  key={`node_${i}`}
  transform={`translate(${node.x}, ${node.y})`}
  onClick={() => handleNodeClick(node.geviId)}
  style={{ cursor: isLeaf ? 'pointer' : 'default' }}
  onMouseEnter={isLeaf ? (e: React.MouseEvent<SVGGElement>) => {
    const gevi = gevis.find(g => g.id === node.geviId);
    if (gevi) setHoverInfo({ gevi, x: e.clientX, y: e.clientY });
  } : undefined}
  onMouseLeave={isLeaf ? () => setHoverInfo(null) : undefined}
>
```

The existing `<circle r={16} fill="transparent" />` hit target inside the `<g>` is already there for leaf nodes — do not remove it.

- [ ] **Step 2: Verify the app compiles**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark && npm run build 2>&1 | tail -20
```
Expected: No TypeScript errors. (Tooltip not yet rendered — hovering nodes has no visual effect yet.)

---

### Task 4: Compute tooltip position and render tooltip

**Files:**
- Modify: `src/components/FamilyTreePanel.tsx` — inside the `FamilyTreePanel` component, in the render body and JSX return

- [ ] **Step 1: Add position computation above the return statement**

Inside `FamilyTreePanel`, directly above the `return (` statement, add:
```ts
let tooltipLeft = 0;
let tooltipTop = 0;
if (hoverInfo) {
  tooltipLeft = hoverInfo.x + 16;
  if (tooltipLeft + TOOLTIP_W > window.innerWidth) {
    tooltipLeft = hoverInfo.x - 16 - TOOLTIP_W;
  }
  tooltipLeft = Math.max(8, tooltipLeft);

  tooltipTop = hoverInfo.y - 20;
  if (tooltipTop + TOOLTIP_H > window.innerHeight) {
    tooltipTop = window.innerHeight - TOOLTIP_H - 8;
  }
  tooltipTop = Math.max(8, tooltipTop);
}
```

- [ ] **Step 2: Add the tooltip div after the scrollable SVG container**

The JSX return currently ends like:
```tsx
      </div>  {/* end scrollable container */}

      <div className={`mt-4 pt-3 border-t text-xs text-center ...`}>
        Click on nodes to view sensor details
      </div>
    </div>
  );
```

Add the tooltip div between the scrollable container's closing `</div>` and the footer `<div>`:

```tsx
      </div>  {/* end scrollable container */}

      {hoverInfo && (() => {
        const g = hoverInfo.gevi;
        const tags = g.tags ?? [];
        const visibleTags = tags.slice(0, 4);
        const extraCount = tags.length - visibleTags.length;
        const nameColor = getTreeNodeColor(g.name, '');
        const radarData = [
          { subject: 'Bright', value: g.brightness    ?? 0, fullMark: 100 },
          { subject: 'Speed',  value: g.speed          ?? 0, fullMark: 100 },
          { subject: 'SNR',    value: g.snr            ?? 0, fullMark: 100 },
          { subject: 'Range',  value: g.dynamicRange   ?? 0, fullMark: 100 },
          { subject: 'Stable', value: g.photostability ?? 0, fullMark: 100 },
          { subject: 'Papers', value: Math.min(100, (g.paperCount ?? 0) * 5), fullMark: 100 },
        ];
        return (
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
            {/* Name */}
            <div className="font-bold text-sm mb-0.5" style={{ color: nameColor }}>
              {g.name}
            </div>

            {/* Year · Category */}
            <div className={`text-[10px] mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {g.year} · {g.category}
            </div>

            {/* Tag chips */}
            <div className="flex flex-wrap gap-1 mb-1.5">
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

            {/* Paper link (decorative) */}
            {g.paperUrl && g.paper && (
              <div className={`text-xs flex items-center gap-1 mb-1.5 ${
                darkMode ? 'text-blue-400' : 'text-blue-900'
              }`}>
                <BookOpen className="w-3 h-3 flex-shrink-0" />
                <span className="truncate flex-1">{g.paper}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </div>
            )}

            {/* Divider */}
            <div className={`border-t mb-1 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />

            {/* Radar chart */}
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
          </div>
        );
      })()}

      <div className={`mt-4 pt-3 border-t text-xs text-center ...`}>
```

> **Note on IIFE pattern:** The tooltip uses an immediately-invoked function expression `{hoverInfo && (() => { ... })()}` to keep local variable declarations (`g`, `tags`, `radarData`, etc.) scoped inside the JSX block. This avoids polluting the component scope. It's an acceptable pattern in React when a helper component would be overkill.

- [ ] **Step 3: Verify the app compiles**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark && npm run build 2>&1 | tail -20
```
Expected: No errors.

- [ ] **Step 4: Start dev server and manually test**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark && npm run dev
```

Open the app in the browser, navigate to the Family Tree view, and verify:
1. Hovering a leaf node (colored circle) shows the tooltip with name, year·category, tags, paper link row, divider, and radar chart
2. Moving the mouse off the node hides the tooltip
3. Hovering a branch node (gray dot) shows no tooltip
4. Tooltip correctly flips left when near the right edge of the viewport
5. Tooltip does not go off the bottom of the viewport
6. Clicking a node still opens the GEVIDetail panel as before
7. Test in both light and dark mode

- [ ] **Step 5: Commit**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark
git add src/components/FamilyTreePanel.tsx
git commit -m "feat: add hover tooltip preview to family tree leaf nodes

Shows name, year/category, tags, paper link (BookOpen + ExternalLink icons),
and radar chart on hover. Tooltip uses position:fixed with smart viewport
flip logic to avoid overflow. Read-only preview; node click still opens detail."
```
