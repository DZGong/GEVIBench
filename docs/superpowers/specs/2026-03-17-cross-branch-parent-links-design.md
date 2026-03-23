# Cross-Branch Parent Links — Design Spec

**Date:** 2026-03-17
**Status:** Approved

## Overview

Some GEVIs are derived from a parent in a different family tree branch. A new optional field `crossBranchParentId` expresses this relationship. The tree renders it as a dashed gray curved line connecting the cross-branch parent to the child, using the same bezier style as regular solid links. The original solid link (from the in-branch parent) remains unchanged.

## Scope

- `src/types.ts` — add `crossBranchParentId?: string` to `GEVI`
- `src/gevis/arclight.json` — add `"crossBranchParentId": "mermaid"` as the first example
- `src/components/FamilyTreePanel.tsx` — extend layout output, update destructuring, render dashed links

## Data Layer

### `src/types.ts`

Add one optional field to `GEVI`:

```ts
crossBranchParentId?: string;  // geviId of a cross-branch parent GEVI (leaf nodes only)
```

### GEVI JSON files

Example (`arclight.json`):
```json
"crossBranchParentId": "mermaid"
```

The value is the `id` of the cross-branch parent GEVI. Only set on leaf nodes (actual GEVIs, not branch labels). The cross-branch parent must also be a leaf node.

## Layout Layer

### `buildFullTree` return type

Change return type from `{ nodes, links }` to `{ nodes, links, crossLinks }`:

```ts
function buildFullTree(gevis: GEVI[]): {
  nodes: LayoutNode[];
  links: LayoutLink[];
  crossLinks: LayoutLink[];
}
```

### Early-return guard (update required)

The existing early-return branch must also include `crossLinks`:

```ts
// Before:
if (!root) return { nodes: [] as LayoutNode[], links: [] as LayoutLink[] };

// After:
if (!root) return { nodes: [] as LayoutNode[], links: [] as LayoutLink[], crossLinks: [] as LayoutLink[] };
```

### Cross-link computation (inside `buildFullTree`)

Both endpoints of a cross-link are always leaf nodes (geviId set, rendered with `NODE_RADIUS_LEAF = 8`). After `shiftedNodes` is computed:

```ts
const crossLinks: LayoutLink[] = [];
for (const gevi of gevis) {
  if (!gevi.crossBranchParentId) continue;
  const parentNode = shiftedNodes.find(n => n.geviId === gevi.crossBranchParentId);
  const childNode  = shiftedNodes.find(n => n.geviId === gevi.id);
  if (!parentNode || !childNode) continue;
  const fromY = parentNode.y + NODE_RADIUS_LEAF + 2;
  const toY   = childNode.y  - NODE_RADIUS_LEAF - 2;
  crossLinks.push({ fromX: parentNode.x, fromY, toX: childNode.x, toY });
}
return { nodes: shiftedNodes, links: shiftedLinks, crossLinks };
```

`midY = (fromY + toY) / 2` is computed at render time, identical to the regular link formula.

### Call-site destructuring (update required)

In `FamilyTreePanel`, update the existing `useMemo` destructuring:

```ts
// Before:
const { nodes, links } = useMemo(() => buildFullTree(gevis), [gevis]);

// After:
const { nodes, links, crossLinks } = useMemo(() => buildFullTree(gevis), [gevis]);
```

## Render Layer

In `FamilyTreePanel` JSX, after the existing solid links block (`{/* Links - curved paths */}`), add:

```tsx
{/* Cross-branch links — dashed, same bezier style as solid links */}
{crossLinks.map((link, i) => {
  const midY = (link.fromY + link.toY) / 2;
  return (
    <path
      key={`xlink_${i}`}
      d={`M${link.fromX},${link.fromY} C${link.fromX},${midY} ${link.toX},${midY} ${link.toX},${link.toY}`}
      fill="none"
      stroke={darkMode ? '#4b5563' : '#cbd5e1'}
      strokeWidth="1.5"
      strokeDasharray="6 4"
    />
  );
})}
```

Stroke color matches solid links: `#4b5563` (dark) / `#cbd5e1` (light).

## Out of Scope

- Multiple cross-branch parents per GEVI (single ID only for now)
- Visual distinction on hover
- Cross-links affecting the layout algorithm (positions are determined solely by `familyTreePath`)
