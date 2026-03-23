# Cross-Branch Parent Links Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `crossBranchParentId` field to GEVIs so that ancestry across branches can be expressed, and render that relationship as a dashed gray curved line in the family tree SVG.

**Architecture:** Three sequential changes — (1) add the field to the TypeScript type and one JSON file, (2) compute cross-links as a separate array inside `buildFullTree` after layout is resolved, (3) update the call-site destructuring and render the dashed paths after the solid links.

**Tech Stack:** TypeScript, React 18, SVG, no test framework (build verification used instead)

---

## File Structure

| File | Change |
|---|---|
| `src/types.ts` | Add `crossBranchParentId?: string` to `GEVI` interface |
| `src/gevis/arclight.json` | Add `"crossBranchParentId": "mermaid"` |
| `src/components/FamilyTreePanel.tsx` | Extend `buildFullTree` return + update destructuring + render dashed links |

---

### Task 1: Add `crossBranchParentId` to the data layer

**Files:**
- Modify: `src/types.ts` (GEVI interface)
- Modify: `src/gevis/arclight.json`

- [ ] **Step 1: Add the field to `GEVI` in `src/types.ts`**

Find the `GEVI` interface. After the existing `parentId?: string` line, add:

```ts
crossBranchParentId?: string;  // geviId of a parent in a different branch
```

- [ ] **Step 2: Add the field to `arclight.json`**

Open `src/gevis/arclight.json`. After the `"familyTreePath"` array, add:

```json
"crossBranchParentId": "mermaid",
```

- [ ] **Step 3: Verify the build passes**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark && pnpm run build 2>&1 | tail -5
```
Expected: `✓ built in ...` with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark
git add src/types.ts src/gevis/arclight.json
git commit -m "feat: add crossBranchParentId field to GEVI type and arclight data"
```

---

### Task 2: Compute cross-links in `buildFullTree`

**Files:**
- Modify: `src/components/FamilyTreePanel.tsx`

All edits are inside `buildFullTree` (the function defined around line 255).

- [ ] **Step 1: Update the early-return guard**

Find the early-return inside `buildFullTree`:
```ts
if (!root) return { nodes: [] as LayoutNode[], links: [] as LayoutLink[] };
```

Replace with:
```ts
if (!root) return { nodes: [] as LayoutNode[], links: [] as LayoutLink[], crossLinks: [] as LayoutLink[] };
```

- [ ] **Step 2: Compute cross-links after `shiftedNodes` is built**

Find the end of `buildFullTree`, just before the `return` statement. The current return looks like:
```ts
return { nodes: shiftedNodes, links: shiftedLinks };
```

Insert the cross-link computation immediately before that return:

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
```

- [ ] **Step 3: Update the return statement**

Change the final return of `buildFullTree` from:
```ts
return { nodes: shiftedNodes, links: shiftedLinks };
```
to:
```ts
return { nodes: shiftedNodes, links: shiftedLinks, crossLinks };
```

- [ ] **Step 4: Verify build passes**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark && pnpm run build 2>&1 | tail -5
```
Expected: `✓ built in ...` (TypeScript will catch any mismatch in return types).

- [ ] **Step 5: Commit**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark
git add src/components/FamilyTreePanel.tsx
git commit -m "feat: compute crossLinks array in buildFullTree for cross-branch parent relationships"
```

---

### Task 3: Update call-site and render dashed cross-links

**Files:**
- Modify: `src/components/FamilyTreePanel.tsx`

- [ ] **Step 1: Update the `useMemo` destructuring in `FamilyTreePanel`**

Find the line (around line 303):
```ts
const { nodes, links } = useMemo(() => buildFullTree(gevis), [gevis]);
```

Replace with:
```ts
const { nodes, links, crossLinks } = useMemo(() => buildFullTree(gevis), [gevis]);
```

- [ ] **Step 2: Render the dashed cross-links in the SVG**

In the JSX, find the solid links block which looks like:
```tsx
{/* Links - curved paths */}
{links.map((link, i) => {
  ...
})}
```

Immediately after the closing `})}` of that block, add:

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

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark && pnpm run build 2>&1 | tail -5
```
Expected: `✓ built in ...` with no errors.

- [ ] **Step 4: Manual smoke test**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark && pnpm run dev
```

Open the app, navigate to the Family Tree view and verify:
1. A dashed gray curved line runs from the Mermaid node to the ArcLight node
2. The dashed line follows the same bezier curve shape as the solid branch lines
3. All existing solid lines are unchanged
4. Dark mode: the dashed line is `#4b5563` (darker gray)
5. Light mode: the dashed line is `#cbd5e1` (lighter gray)

- [ ] **Step 5: Commit**

```bash
cd /Users/dzgong/Documents/GEVIBench/vnet-benchmark
git add src/components/FamilyTreePanel.tsx
git commit -m "feat: render dashed cross-branch parent links in family tree SVG

Dashed gray bezier lines connect GEVIs to parents in different branches.
Uses same curve style as solid links. ArcLight→Mermaid is the first example."
```
