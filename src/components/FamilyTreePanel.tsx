// Interactive Family Tree Panel
// Shows the full GEVI family tree with interactive nodes
// FPbase-style vertical SVG tree (root at top, descendants below)

import { useMemo, useState, useRef, useEffect } from 'react';
import { BookOpen, ExternalLink, Move, RotateCcw, Trash2, Check, X } from 'lucide-react';
import { getAllGEVIs } from '../geviData';
import type { GEVI, TreeNode } from '../types';
import { getTreeNodeColor } from '../utils';
import { DistributionRadar } from './DistributionRadar';
import savedLayoutOverrides from '../familyTreeLayout.json';

// Per-node position deltas produced by the dev-only drag editor and committed to
// familyTreeLayout.json. Applied as a final layout layer in BOTH dev and prod, so
// the organized tree is what ships online; only the editing UI is dev-gated.
type LayoutOverride = { dx: number; dy: number };
type LayoutOverrides = Record<string, LayoutOverride>;

// Journal name abbreviations for tooltip display
const JOURNAL_ABBREV: Record<string, string> = {
  'Nature Methods': 'Nat. Methods',
  'Nature Neuroscience': 'Nat. Neurosci.',
  'Nature Communications': 'Nat. Commun.',
  'Nature Chemical Biology': 'Nat. Chem. Biol.',
  'Nature Chemistry': 'Nat. Chem.',
  'Journal of Neuroscience': 'J. Neurosci.',
  'European Journal of Neuroscience': 'Eur. J. Neurosci.',
  'ACS Chemical Neuroscience': 'ACS Chem. Neurosci.',
  'Scientific Reports': 'Sci. Rep.',
  'Science Advances': 'Sci. Adv.',
  'Advanced Biology': 'Adv. Biol.',
  'Advanced Science': 'Adv. Sci.',
};

function abbreviatePaper(paper: string): string {
  for (const [full, abbrev] of Object.entries(JOURNAL_ABBREV)) {
    if (paper.includes(full)) return paper.replace(full, abbrev);
  }
  return paper;
}

// Layout constants (all units are SVG pixels)
//
// Tree width is driven by: each leaf occupies MIN_NODE_WIDTH px horizontally,
// siblings are separated by SIBLING_GAP px between their subtree bounding boxes.
// To make the tree narrower, reduce MIN_NODE_WIDTH (floor ~36) or SIBLING_GAP.
//
// Tree height is driven by LEVEL_HEIGHT (baseline vertical gap per level) plus
// y-stagger applied to branch siblings. Stagger = branchIndex × effectiveStagger,
// where effectiveStagger = max(0, LEVEL_STAGGER_BASE − depth × LEVEL_STAGGER_DECAY).
// This means siblings near the root are pushed further apart vertically (creating
// space for their subtrees to share horizontal room) while deep siblings stay aligned.
// To make the tree taller/shorter, adjust LEVEL_HEIGHT or LEVEL_STAGGER_BASE.
// Pointy-top hexagon path with rounded corners, matching the site logo orientation
function hexPath(r: number, cr = r * 0.32): string {
  const verts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const prev = verts[(i + 5) % 6];
    const curr = verts[i];
    const next = verts[(i + 1) % 6];
    const lenIn  = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const lenOut = Math.hypot(next.x - curr.x, next.y - curr.y);
    const p1 = { x: curr.x - (curr.x - prev.x) / lenIn  * cr, y: curr.y - (curr.y - prev.y) / lenIn  * cr };
    const p2 = { x: curr.x + (next.x - curr.x) / lenOut * cr, y: curr.y + (next.y - curr.y) / lenOut * cr };
    parts.push(i === 0 ? `M${p1.x.toFixed(2)},${p1.y.toFixed(2)}` : `L${p1.x.toFixed(2)},${p1.y.toFixed(2)}`);
    parts.push(`Q${curr.x.toFixed(2)},${curr.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`);
  }
  return parts.join(' ') + ' Z';
}

const MIN_NODE_WIDTH = 50;
const SIBLING_GAP = 7;
const LEVEL_HEIGHT = 66;
const DEPTH_STAGGER_UNIT = 11;    // per-level droop for deep branch children
const MAX_STAGGER = 44;           // cap stagger so the tree doesn't grow unboundedly tall

// Manual post-layout subtree shifts, keyed by the tree-node key (geviId for leaf/dual
// nodes, path segment for pure branches). The shift is applied after algorithmic
// packing completes, so it does NOT push sibling subtrees — the shifted branch
// visually overlaps into neighboring empty space.
const MANUAL_SUBTREE_SHIFTS: Record<string, { dx: number; dy: number }> = {
  vsfp1: { dx: 0, dy: 44 },
  'VSD-FRET': { dx: 30, dy: 0 },
  arclight: { dx: 0, dy: 33 },
  // ASAP3 children kept on shared rows (4b/4e/5/rEstus; 6b/6.1/7y/rEstus-NI),
  // nudged down together for a little more gap below ASAP3.
  _fork_asap4b_asap4e: { dx: 0, dy: -34 },
  asap5: { dx: 0, dy: 18 },
  restus: { dx: 0, dy: 18 },
  _fork_quasar1_quasar2: { dx: -57, dy: 44 },
  _fork_archon1_archon2: { dx: -57, dy: -44 },
  _fork_quasar6_quasar6b: { dx: 0, dy: 44 },
  'Opsin-FRET': { dx: -80, dy: 0 },
  Chemigenetic: { dx: -60, dy: 88 },
  'ace2n-mneon': { dx: 22, dy: 44 },
  caesr: { dx: 25, dy: 33 },
  '_fork_macq-mcitrine_macq-morange2': { dx: 44, dy: 33 },
  // Spread the two MacQ siblings apart so their (long) labels don't overlap.
  'macq-mcitrine': { dx: -14, dy: 0 },
  'macq-morange2': { dx: 12, dy: 0 },
  arch: { dx: 0, dy: -44 },
  varnam: { dx: 0, dy: 22 },
  cepheid1b: { dx: -16, dy: 0 },
  cepheid1s: { dx: 16, dy: 0 },
  varnam2: { dx: 0, dy: 0 },
  'ace2n-mneon2': { dx: 0, dy: 110 },
  voltron2: { dx: 0, dy: 22 },
  hvi: { dx: 0, dy: 44 },
  voltron: { dx: 0, dy: -22 },
  '2photron': { dx: 0, dy: 44 },
  solaris: { dx: 0, dy: 44 },
};

// Shifts that move ONLY the root node of a subtree (and its incoming/outgoing
// link endpoints anchored at that node), without displacing any descendants.
// Use this when you want to nudge a single node without breaking the layout of
// the subtree rooted there.
const NODE_ONLY_SHIFTS: Record<string, { dx: number; dy: number }> = {
  'ace2n-mneon': { dx: 57, dy: 0 },
};

const TOP_PADDING = 31;
const NODE_RADIUS_LEAF = 8;
const NODE_RADIUS_BRANCH = 5;
const TOOLTIP_W = 260;
const TOOLTIP_H = 430;

interface LayoutNode {
  id: string;
  key: string;      // stable tree key (geviId for leaves, path segment for branches, _fork_* for forks)
  name: string;
  year?: number;
  x: number;
  y: number;
  geviId?: string;
  color: string;
  isFork?: boolean;
}

interface LayoutLink {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface LayoutResult {
  nodes: LayoutNode[];
  links: LayoutLink[];
  width: number;
  maxY: number;
  leftContour: Map<number, number>;   // y → leftmost x
  rightContour: Map<number, number>;  // y → rightmost x
}

interface HoverInfo {
  gevi: GEVI;
  x: number;
  y: number;
}

// Depth of a subtree measured in edges to the deepest leaf (0 for a leaf).
function subtreeDepth(node: TreeNode): number {
  if (!node.children || Object.keys(node.children).length === 0) return 0;
  let maxChild = 0;
  for (const c of Object.values(node.children)) maxChild = Math.max(maxChild, subtreeDepth(c));
  return 1 + maxChild;
}

// Recursively compute subtree layout using contour-based (profile-based) packing.
// `key` is the stable tree key of `node` (its key in the parent's children map),
// threaded onto the LayoutNode so the drag editor and link rebuild can identify it.
function layoutTree(node: TreeNode, x: number, y: number, depth = 0, key = node.name): LayoutResult {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];
  const isLeaf = !!node.geviId;
  const isRoot = depth === 0;
  const isFork = !!node.isFork;
  const color = isLeaf ? getTreeNodeColor({ name: node.name }) : '#9ca3af';

  // If no children, this is a leaf
  if (!node.children || Object.keys(node.children).length === 0) {
    nodes.push({ id: node.name, key, name: node.name, year: node.year, x, y, geviId: node.geviId, color, isFork });
    const hw = MIN_NODE_WIDTH / 2;
    return {
      nodes, links, width: MIN_NODE_WIDTH, maxY: y,
      leftContour: new Map([[y, x - hw]]),
      rightContour: new Map([[y, x + hw]]),
    };
  }

  const childKeys = Object.keys(node.children);

  // Fork nodes use reduced vertical spacing for the Y-fork effect
  const forkLevelHeight = Math.round(LEVEL_HEIGHT * 0.45);

  // First pass: layout each child subtree at x=0 to get contours and structure.
  // Branch children droop by their subtree depth: a branch whose descendants run
  // N levels deep gets pushed N × DEPTH_STAGGER_UNIT below its parent's child level,
  // while leaves and shallow branches stay at the parent level. This lets deep
  // subtrees clear the packing proximity threshold (LEVEL_HEIGHT) relative to
  // shallow siblings, so shallow siblings can slide horizontally into the space
  // the deep subtree would otherwise block.
  const childLayouts: { key: string; result: LayoutResult }[] = [];
  for (let i = 0; i < childKeys.length; i++) {
    const key = childKeys[i];
    const childNode = node.children[key];
    const childIsBranch = !!(childNode.children && Object.keys(childNode.children).length > 0);
    const stagger = childIsBranch ? Math.min(subtreeDepth(childNode) * DEPTH_STAGGER_UNIT, MAX_STAGGER) : 0;
    const levelH = isFork ? forkLevelHeight : LEVEL_HEIGHT;
    const childY = y + levelH + stagger;
    const result = layoutTree(childNode, 0, childY, depth + 1, key);
    childLayouts.push({ key, result });
  }

  // Second pass: pack siblings using proximity-profile minimum
  // combinedRight accumulates the rightmost x of all placed siblings so far
  const combinedRight = new Map<number, number>();
  const offsets: number[] = [];

  for (let i = 0; i < childLayouts.length; i++) {
    const { result } = childLayouts[i];
    // Fallback: place SIBLING_GAP to the right of the previous sibling's origin
    let offset = i === 0 ? 0 : offsets[i - 1] + SIBLING_GAP;

    // Tighten using contour proximity: only pairs within LEVEL_HEIGHT of each other constrain spacing
    for (const [yb, leftX] of result.leftContour) {
      for (const [ya, rightX] of combinedRight) {
        if (Math.abs(ya - yb) < LEVEL_HEIGHT) {
          offset = Math.max(offset, rightX - leftX + SIBLING_GAP);
        }
      }
    }

    offsets.push(offset);

    // Merge this sibling's right contour (shifted by offset) into combinedRight
    for (const [yr, rightX] of result.rightContour) {
      combinedRight.set(yr, Math.max(combinedRight.get(yr) ?? -Infinity, rightX + offset));
    }
  }

  // Third pass: center the group under the parent
  let leftmostX = Infinity, rightmostX = -Infinity;
  for (let i = 0; i < childLayouts.length; i++) {
    for (const lx of childLayouts[i].result.leftContour.values())
      leftmostX = Math.min(leftmostX, lx + offsets[i]);
    for (const rx of childLayouts[i].result.rightContour.values())
      rightmostX = Math.max(rightmostX, rx + offsets[i]);
  }
  const centerShift = x - (leftmostX + rightmostX) / 2;
  for (let i = 0; i < offsets.length; i++) offsets[i] += centerShift;

  // Position this node (fork nodes are invisible junction points)
  nodes.push({ id: node.name, key, name: node.name, year: node.year, x, y, geviId: node.geviId, color, isFork });

  let maxY = y;

  // Fourth pass: apply offsets to all child nodes and links
  for (let i = 0; i < childLayouts.length; i++) {
    const { key, result } = childLayouts[i];
    const offsetX = offsets[i];
    const manual = MANUAL_SUBTREE_SHIFTS[key];
    const extraDx = manual?.dx ?? 0;
    const extraDy = manual?.dy ?? 0;
    const nodeOnly = NODE_ONLY_SHIFTS[key];
    const nodeDx = nodeOnly?.dx ?? 0;
    const nodeDy = nodeOnly?.dy ?? 0;

    // Capture the subtree root's pre-shift coordinates so we can identify
    // any links that originate from it (those need the node-only shift too).
    const rootOrigX = result.nodes[0].x;
    const rootOrigY = result.nodes[0].y;

    for (let j = 0; j < result.nodes.length; j++) {
      const cn = result.nodes[j];
      const isSubtreeRoot = j === 0;
      nodes.push({
        ...cn,
        x: cn.x + offsetX + extraDx + (isSubtreeRoot ? nodeDx : 0),
        y: cn.y + extraDy + (isSubtreeRoot ? nodeDy : 0),
      });
    }
    for (const cl of result.links) {
      // A link's "from" endpoint sits at the subtree root iff its x matches
      // the root's x exactly (the root is the only node that emits outgoing
      // links from that x within its own subtree). Apply node-only shift to
      // those endpoints so links stay anchored to the moved node.
      const linkFromRoot = Math.abs(cl.fromX - rootOrigX) < 0.5 && cl.fromY >= rootOrigY - 0.5 && cl.fromY <= rootOrigY + NODE_RADIUS_LEAF + 4;
      links.push({
        fromX: cl.fromX + offsetX + extraDx + (linkFromRoot ? nodeDx : 0),
        fromY: cl.fromY + extraDy + (linkFromRoot ? nodeDy : 0),
        toX: cl.toX + offsetX + extraDx,
        toY: cl.toY + extraDy,
      });
    }

    // Link from parent (unshifted) to this child subtree root (shifted)
    const childRootNode = result.nodes[0];
    const fromOffset = isFork ? 0 : NODE_RADIUS_BRANCH + 2;
    const toOffset = childRootNode.isFork ? 0 : NODE_RADIUS_BRANCH + 2;
    links.push({
      fromX: x,
      fromY: y + fromOffset,
      toX: childRootNode.x + offsetX + extraDx + nodeDx,
      toY: childRootNode.y + extraDy + nodeDy - toOffset,
    });

    maxY = Math.max(maxY, result.maxY + extraDy);
  }

  // Build parent contour = this node + union of all shifted children contours
  const hw = isRoot ? 11 : isFork ? 2 : (node.geviId ? MIN_NODE_WIDTH / 2 : NODE_RADIUS_BRANCH + 2);
  const leftContour = new Map<number, number>([[y, x - hw]]);
  const rightContour = new Map<number, number>([[y, x + hw]]);
  for (let i = 0; i < childLayouts.length; i++) {
    const off = offsets[i];
    for (const [cy, cx] of childLayouts[i].result.leftContour)
      leftContour.set(cy, Math.min(leftContour.get(cy) ?? Infinity, cx + off));
    for (const [cy, cx] of childLayouts[i].result.rightContour)
      rightContour.set(cy, Math.max(rightContour.get(cy) ?? -Infinity, cx + off));
  }

  const treeWidth = Math.max(MIN_NODE_WIDTH, rightmostX - leftmostX);
  return { nodes, links, width: treeWidth, maxY, leftContour, rightContour };
}

// Build a TreeNode tree from each gevi's familyTreePath (or parentId chain).
// Branch node display names are the path key strings.
// Leaf/dual node display names come from the gevi JSON (name, year, geviId).
function buildTreeFromPaths(gevis: GEVI[]): TreeNode {
  const geviById = new Map(gevis.map(g => [g.id, g]));

  // Resolve parentId chains into full paths
  const resolvedPaths = new Map<string, string[]>();
  for (const g of gevis) {
    if (g.familyTreePath) resolvedPaths.set(g.id, g.familyTreePath as string[]);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of gevis) {
      if (resolvedPaths.has(g.id) || !g.parentId) continue;
      const parentPath = resolvedPaths.get(g.parentId);
      if (parentPath) { resolvedPaths.set(g.id, [...parentPath, g.id]); changed = true; }
    }
  }

  // Sort so top-level groups appear in a consistent order, then by year within each group.
  const GROUP_ORDER: Record<string, number> = { VSD: 0, Opsin: 1, Others: 2 };
  const sorted = [...gevis].sort((a, b) => {
    const aG = GROUP_ORDER[resolvedPaths.get(a.id)?.[1] ?? ''] ?? 3;
    const bG = GROUP_ORDER[resolvedPaths.get(b.id)?.[1] ?? ''] ?? 3;
    if (aG !== bG) return aG - bG;
    return (a.year ?? 9999) - (b.year ?? 9999);
  });

  const root: TreeNode = { name: 'GEVI', children: {} };

  for (const gevi of sorted) {
    const path = resolvedPaths.get(gevi.id);
    if (!path || path.length < 2) continue;

    let node = root;
    for (let i = 1; i < path.length; i++) {
      const key = path[i];
      const isLast = i === path.length - 1;
      if (!node.children) node.children = {};
      if (!node.children[key]) {
        // If this key is a known geviId, use its name; otherwise use the key itself.
        const match = geviById.get(key);
        node.children[key] = { name: match ? match.name : key, year: match?.year, children: {} };
      }
      if (isLast) {
        // Override with this gevi's authoritative data.
        node.children[key].name = gevi.name;
        node.children[key].year = gevi.year;
        node.children[key].geviId = gevi.id;
      }
      node = node.children[key];
    }
  }

  // Group siblings under Y-fork nodes.
  // When two children of the same parent both have siblingId pointing at each other,
  // replace them with a single fork node that has them as its two children.
  function groupSiblings(n: TreeNode) {
    if (!n.children) return;
    for (const child of Object.values(n.children)) groupSiblings(child);

    const childKeys = Object.keys(n.children);
    const grouped = new Set<string>();
    const newChildren: Record<string, TreeNode> = {};

    for (const key of childKeys) {
      if (grouped.has(key)) continue;
      const child = n.children[key];
      const childGevi = child.geviId ? geviById.get(child.geviId) : null;
      const sibId = childGevi?.siblingId;

      // Check if sibling is also a direct child of this same parent
      if (sibId && n.children[sibId] && !grouped.has(sibId)) {
        const sibChild = n.children[sibId];
        grouped.add(key);
        grouped.add(sibId);

        // Create a fork node with both siblings as children
        const forkNode: TreeNode = {
          name: '',
          isFork: true,
          children: { [key]: child, [sibId]: sibChild },
        };
        newChildren[`_fork_${key}_${sibId}`] = forkNode;
      } else {
        newChildren[key] = child;
      }
    }

    n.children = newChildren;
  }
  groupSiblings(root);

  // Manual sibling-order overrides: [parentKey, orderedChildKeys[]]. Keys not listed
  // keep their existing relative order and come after the listed ones.
  const SIBLING_ORDER_OVERRIDES: [string, string[]][] = [
    ['VSD-FRET', ['lotusv', 'vsfp1', 'mermaid']],
    ['arclight', ['marina', 'bongwoori', 'harclight1']],
    ['varnam', ['varnam2', '_fork_cepheid1b_cepheid1s']],
    ['Opsin-FRET', ['caesr', '_fork_macq-mcitrine_macq-morange2', 'ace2n-mneon', 'Chemigenetic']],
    ['archon1', ['_fork_quasar6_quasar6b', 'somarchon']],
    ['Opsin-Fluorescent', ['arch', 'props']],
    ['pace', ['jarvis', 'electraon', 'positron2']],
  ];
  function findNode(n: TreeNode, key: string): TreeNode | null {
    if (!n.children) return null;
    if (n.children[key]) return n.children[key];
    for (const c of Object.values(n.children)) {
      const hit = findNode(c, key);
      if (hit) return hit;
    }
    return null;
  }
  for (const [parentKey, order] of SIBLING_ORDER_OVERRIDES) {
    const parent = parentKey === 'GEVI' ? root : findNode(root, parentKey);
    if (!parent?.children) continue;
    const reordered: Record<string, TreeNode> = {};
    for (const k of order) if (parent.children[k]) reordered[k] = parent.children[k];
    for (const [k, v] of Object.entries(parent.children)) if (!(k in reordered)) reordered[k] = v;
    parent.children = reordered;
  }

  // Prune empty children objects.
  function prune(n: TreeNode) {
    if (!n.children) return;
    if (Object.keys(n.children).length === 0) { delete n.children; return; }
    for (const child of Object.values(n.children)) prune(child);
  }
  prune(root);

  return root;
}

// Compute the base algorithmic layout: node positions (with all the hand-tuned
// MANUAL_SUBTREE_SHIFTS / NODE_ONLY_SHIFTS / centering baked into node coords) plus
// the structural tree, which drives link rebuilding. Links are NOT computed here —
// they are re-derived from final node positions in composeLayout so that moving any
// node (algorithmically or via the drag editor) automatically drags its links along.
function buildBaseLayout(gevis: GEVI[]): { baseNodes: LayoutNode[]; treeRoot: TreeNode | null } {
  const geviById = new Map(gevis.map(g => [g.id, g]));
  const root = buildTreeFromPaths(gevis);
  if (!root) return { baseNodes: [], treeRoot: null };

  // Layout starting at center x=0, we'll shift everything to be positive afterwards
  const result = layoutTree(root, 0, TOP_PADDING);

  // Find min X to shift everything into positive coordinates
  const minX = Math.min(...result.nodes.map(n => n.x));
  const padding = 42; // left/right padding

  // Shift all coordinates so minX becomes padding, and override leaf colors with
  // actual GEVI data so colors match the detail panel title.
  const shiftX = -minX + padding;
  const shiftedNodes = result.nodes.map(n => {
    const geviData = n.geviId ? geviById.get(n.geviId) : undefined;
    const color = geviData ? getTreeNodeColor(geviData) : n.color;
    return { ...n, x: n.x + shiftX, color };
  });

  // Node-only shift: move the node itself without shifting its subtree. Links are
  // rebuilt from positions afterward, so only the node coordinate needs updating.
  const NODE_ONLY_SHIFTS: Record<string, { dx: number; dy: number }> = {
    Chemigenetic: { dx: 60, dy: -44 },
  };
  for (const [name, { dx, dy }] of Object.entries(NODE_ONLY_SHIFTS)) {
    const node = shiftedNodes.find(n => n.name === name);
    if (!node) continue;
    node.x += dx;
    node.y += dy;
  }

  // Center branch nodes between pairs of their children (node-only).
  const CENTER_BETWEEN: [string, string, string][] = [
    ['VSD', 'VSD-FRET', 'VSD-single'],
    ['Opsin', 'Opsin-Fluorescent', 'Opsin-FRET'],
  ];
  for (const [name, leftName, rightName] of CENTER_BETWEEN) {
    const node = shiftedNodes.find(n => n.name === name);
    const left = shiftedNodes.find(n => n.name === leftName);
    const right = shiftedNodes.find(n => n.name === rightName);
    if (!node || !left || !right) continue;
    node.x = (left.x + right.x) / 2;
  }

  // Center GEVI root at the horizontal midpoint of the entire tree.
  const geviRoot = shiftedNodes.find(n => n.name === 'GEVI');
  if (geviRoot) {
    const allMinX = Math.min(...shiftedNodes.map(n => n.x));
    const allMaxX = Math.max(...shiftedNodes.map(n => n.x));
    geviRoot.x = (allMinX + allMaxX) / 2;
  }

  return { baseNodes: shiftedNodes, treeRoot: root };
}

// Collect a node's key plus every descendant key, for whole-subtree drags.
function collectSubtreeKeys(root: TreeNode | null, targetKey: string): string[] {
  if (!root) return [targetKey];
  let found: TreeNode | null = null;
  const find = (n: TreeNode, key: string) => {
    if (found) return;
    if (key === targetKey) { found = n; return; }
    if (n.children) for (const [k, c] of Object.entries(n.children)) find(c, k);
  };
  find(root, 'GEVI');
  if (!found) return [targetKey];
  const keys: string[] = [];
  const gather = (n: TreeNode, key: string) => {
    keys.push(key);
    if (n.children) for (const [k, c] of Object.entries(n.children)) gather(c, k);
  };
  gather(found, targetKey);
  return keys;
}

// Apply the committed + in-session position overrides to the base node positions,
// then rebuild all links (and cross-branch links) from the resulting coordinates by
// walking the structural tree. This is the single place link geometry is produced.
function composeLayout(
  baseNodes: LayoutNode[],
  treeRoot: TreeNode | null,
  gevis: GEVI[],
  overrides: LayoutOverrides,
): { nodes: LayoutNode[]; links: LayoutLink[]; crossLinks: LayoutLink[] } {
  const nodes = baseNodes.map(n => {
    const ov = overrides[n.key];
    return ov ? { ...n, x: n.x + ov.dx, y: n.y + ov.dy } : { ...n };
  });
  const nodeByKey = new Map(nodes.map(n => [n.key, n]));

  const links: LayoutLink[] = [];
  const walk = (node: TreeNode, key: string) => {
    if (!node.children) return;
    const parent = nodeByKey.get(key);
    for (const [childKey, child] of Object.entries(node.children)) {
      const childNode = nodeByKey.get(childKey);
      if (parent && childNode) {
        const fromOffset = node.isFork ? 0 : NODE_RADIUS_BRANCH + 2;
        const toOffset = child.isFork ? 0 : NODE_RADIUS_BRANCH + 2;
        links.push({
          fromX: parent.x, fromY: parent.y + fromOffset,
          toX: childNode.x, toY: childNode.y - toOffset,
        });
      }
      walk(child, childKey);
    }
  };
  if (treeRoot) walk(treeRoot, 'GEVI');

  const crossLinks: LayoutLink[] = [];
  for (const gevi of gevis) {
    if (!gevi.crossBranchParentId) continue;
    const parentNode = nodeByKey.get(gevi.crossBranchParentId);
    const childNode = nodeByKey.get(gevi.id);
    if (!parentNode || !childNode) continue;
    crossLinks.push({
      fromX: parentNode.x, fromY: parentNode.y + NODE_RADIUS_LEAF + 2,
      toX: childNode.x, toY: childNode.y - NODE_RADIUS_LEAF - 2,
    });
  }

  return { nodes, links, crossLinks };
}

interface FamilyTreePanelProps {
  onSelectGEVI: (gevi: GEVI) => void;
  selectedGEVI: GEVI | null;
  compareGEVIs: GEVI[];
  onAddToCompare: (gevi: GEVI) => void;
}

export function FamilyTreePanel({
  onSelectGEVI,
}: FamilyTreePanelProps) {
  const gevis = useMemo(() => getAllGEVIs(), []);
  const { baseNodes, treeRoot } = useMemo(() => buildBaseLayout(gevis), [gevis]);

  // Editor is dev-only: import.meta.env.DEV is true under `vite`, false in the
  // production build, so all editing UI and its save calls are stripped from prod.
  const isDev = import.meta.env.DEV;
  const [editMode, setEditMode] = useState(() => {
    if (!isDev) return false;
    try { return sessionStorage.getItem('familyTreeEditMode') === '1'; } catch { return false; }
  });
  const [dragMode, setDragMode] = useState<'node' | 'subtree'>('node');
  const [overrides, setOverrides] = useState<LayoutOverrides>(() => ({ ...(savedLayoutOverrides as LayoutOverrides) }));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const { nodes, links, crossLinks } = useMemo(
    () => composeLayout(baseNodes, treeRoot, gevis, overrides),
    [baseNodes, treeRoot, gevis, overrides],
  );

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const overridesRef = useRef(overrides);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror selection/mode into refs so the once-subscribed keydown handler reads them.
  const selectedKeyRef = useRef(selectedKey);
  const dragModeRef = useRef(dragMode);
  useEffect(() => { overridesRef.current = overrides; }, [overrides]);
  useEffect(() => { selectedKeyRef.current = selectedKey; }, [selectedKey]);
  useEffect(() => { dragModeRef.current = dragMode; }, [dragMode]);

  // Persist the edit-mode toggle across dev reloads.
  useEffect(() => {
    if (!isDev) return;
    try { sessionStorage.setItem('familyTreeEditMode', editMode ? '1' : '0'); } catch { /* ignore */ }
  }, [isDev, editMode]);

  // In dev, load the live on-disk overrides on mount. The static JSON import is the
  // production source, but Vite may serve a stale cached copy after in-editor writes,
  // so we re-read the authoritative file from the dev server here.
  useEffect(() => {
    if (!isDev) return;
    let cancelled = false;
    fetch('/__family-layout')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && !cancelled) setOverrides(d as LayoutOverrides); })
      .catch(() => { /* keep static import */ });
    return () => { cancelled = true; };
  }, [isDev]);

  // Keyboard control: with a node selected in edit mode, arrow keys nudge it (or its
  // whole subtree, per drag mode). Shift = coarser step; Delete/Backspace resets the
  // selection's override; Escape deselects. Ignored while typing in a field.
  useEffect(() => {
    if (!isDev || !editMode) return;
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (e.key === 'Escape') { setSelectedKey(null); return; }
      const key = selectedKeyRef.current;
      if (!key) return;
      const keys = dragModeRef.current === 'subtree' ? collectSubtreeKeys(treeRoot, key) : [key];

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setOverrides(prev => { const next = { ...prev }; for (const k of keys) delete next[k]; return next; });
        scheduleSave();
        return;
      }

      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -1;
      else if (e.key === 'ArrowRight') dx = 1;
      else if (e.key === 'ArrowUp') dy = -1;
      else if (e.key === 'ArrowDown') dy = 1;
      else return;
      e.preventDefault();
      const step = e.shiftKey ? 12 : 3;
      setOverrides(prev => {
        const next = { ...prev };
        for (const k of keys) {
          const b = next[k] ?? { dx: 0, dy: 0 };
          next[k] = { dx: b.dx + dx * step, dy: b.dy + dy * step };
        }
        return next;
      });
      scheduleSave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDev, editMode, treeRoot]);

  // Calculate SVG dimensions with enough padding for labels below deepest nodes
  const svgWidth = Math.max(700, Math.max(...nodes.map(n => n.x)) + 70);
  const svgHeight = Math.max(350, Math.max(...nodes.map(n => n.y)) + 44);

  // Convert a pointer event's client coords into SVG viewBox coords.
  const clientToSvg = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  // Debounced persist of the current overrides to familyTreeLayout.json (dev only).
  const scheduleSave = () => {
    if (!isDev) return; // lets the bundler dead-code-eliminate this whole path in prod
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving');
      // Round to whole pixels so the committed JSON stays clean and readable.
      const rounded: LayoutOverrides = {};
      for (const [k, v] of Object.entries(overridesRef.current)) {
        rounded[k] = { dx: Math.round(v.dx), dy: Math.round(v.dy) };
      }
      try {
        const res = await fetch('/__family-layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rounded, null, 2),
        });
        setSaveState(res.ok ? 'saved' : 'error');
      } catch { setSaveState('error'); }
    }, 350);
  };

  // Begin dragging a node (or its whole subtree). Deltas accumulate onto whatever
  // override the node already had, so repeated drags compose.
  const startDrag = (e: React.PointerEvent<SVGGElement>, node: LayoutNode) => {
    if (!isDev || !editMode) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedKey(node.key);
    const keys = dragMode === 'subtree' ? collectSubtreeKeys(treeRoot, node.key) : [node.key];
    const start = clientToSvg(e);
    const base = overridesRef.current;
    const move = (ev: PointerEvent) => {
      const p = clientToSvg(ev);
      const ddx = p.x - start.x;
      const ddy = p.y - start.y;
      const next: LayoutOverrides = { ...base };
      for (const k of keys) {
        const b = base[k] ?? { dx: 0, dy: 0 };
        next[k] = { dx: b.dx + ddx, dy: b.dy + ddy };
      }
      setOverrides(next);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      scheduleSave();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const resetSelected = () => {
    if (!selectedKey) return;
    const keys = dragMode === 'subtree' ? collectSubtreeKeys(treeRoot, selectedKey) : [selectedKey];
    setOverrides(prev => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
    scheduleSave();
  };

  const clearAll = () => {
    setOverrides({});
    setSelectedKey(null);
    scheduleSave();
  };

  const overrideCount = Object.keys(overrides).length;

  const handleNodeClick = (geviId?: string) => {
    if (geviId) {
      const gevi = gevis.find(g => g.id === geviId);
      if (gevi) {
        onSelectGEVI(gevi);
      }
    }
  };


  let tooltipLeft = 0;
  let tooltipTop = 0;
  let tooltipNameColor = '';
  let tooltipTags: string[] = [];
  let tooltipExtraCount = 0;
  if (hoverInfo) {
    const g = hoverInfo.gevi;

    const GAP = 14;
    // Horizontal: show right if cursor is in the left half, else show left
    if (hoverInfo.x < window.innerWidth / 2) {
      tooltipLeft = hoverInfo.x + GAP;
    } else {
      tooltipLeft = hoverInfo.x - GAP - TOOLTIP_W;
    }
    tooltipLeft = Math.max(8, Math.min(tooltipLeft, window.innerWidth - TOOLTIP_W - 8));

    // Vertical: show below unless cursor is in the bottom 1/4
    if (hoverInfo.y < window.innerHeight * 3 / 5) {
      tooltipTop = hoverInfo.y + GAP;
    } else {
      tooltipTop = hoverInfo.y - GAP - TOOLTIP_H;
    }
    tooltipTop = Math.max(8, Math.min(tooltipTop, window.innerHeight - TOOLTIP_H - 8));

    tooltipNameColor = getTreeNodeColor(g);
    const tags = Array.isArray(g.tags) ? g.tags : [];
    tooltipTags = tags.slice(0, 4);
    tooltipExtraCount = tags.length - tooltipTags.length;
  }

  return (
    <div className="rounded-lg border-2 p-4 bg-surface-lowest border-gold/40 shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold text-klein">Family Tree</h3>
          <p className="text-xs text-ink mt-0.5">
            Evolutionary lineage of genetically encoded voltage indicators, from founding scaffolds to latest variants.
          </p>
        </div>
      </div>

      {/* Dev-only layout editor toolbar (stripped from the production build) */}
      {isDev && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <button
            onClick={() => setEditMode(v => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border font-medium ${editMode ? 'bg-klein text-white border-klein' : 'bg-surface-low text-ink border-ink/20'}`}
          >
            <Move className="w-3 h-3" /> {editMode ? 'Editing layout' : 'Edit layout'}
          </button>
          {editMode && (
            <>
              <div className="inline-flex rounded border border-ink/20 overflow-hidden">
                <button
                  onClick={() => setDragMode('node')}
                  className={`px-2 py-1 ${dragMode === 'node' ? 'bg-klein text-white' : 'bg-surface-low text-ink'}`}
                >
                  Node
                </button>
                <button
                  onClick={() => setDragMode('subtree')}
                  className={`px-2 py-1 border-l border-ink/20 ${dragMode === 'subtree' ? 'bg-klein text-white' : 'bg-surface-low text-ink'}`}
                >
                  Subtree
                </button>
              </div>
              <button
                onClick={resetSelected}
                disabled={!selectedKey}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-ink/20 bg-surface-low text-ink disabled:opacity-40"
              >
                <RotateCcw className="w-3 h-3" /> Reset {dragMode === 'subtree' ? 'subtree' : 'node'}
              </button>
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 text-red-600 bg-surface-low"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
              <span className="text-ink/50">{overrideCount} override{overrideCount === 1 ? '' : 's'}</span>
              {saveState === 'saving' && <span className="text-ink/50">Saving…</span>}
              {saveState === 'saved' && <span className="inline-flex items-center gap-0.5 text-green-600"><Check className="w-3 h-3" /> Saved</span>}
              {saveState === 'error' && <span className="inline-flex items-center gap-0.5 text-red-600"><X className="w-3 h-3" /> Save failed</span>}
              {selectedKey && <span className="text-ink/60">Selected: <span className="font-mono">{selectedKey}</span></span>}
              <span className="text-ink/40">· drag or select + arrow keys (⇧ = larger step, Del = reset){dragMode === 'subtree' ? '; moves descendants too' : ''}; dev-only</span>
            </>
          )}
        </div>
      )}

      {/* Responsive container - scales SVG to fit available width */}
      <div className="overflow-hidden border rounded-lg bg-surface-low">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="block w-full h-auto"
          style={editMode ? { touchAction: 'none', userSelect: 'none' } : undefined}
        >

          {/* Links - curved paths */}
          {links.map((link, i) => {
            const midY = (link.fromY + link.toY) / 2;
            return (
              <path
                key={`link_${i}`}
                d={`M${link.fromX},${link.fromY} C${link.fromX},${midY} ${link.toX},${midY} ${link.toX},${link.toY}`}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.8"
              />
            );
          })}
          {/* Cross-branch links — dashed, same bezier style as solid links */}
          {crossLinks.map((link, i) => {
            const midY = (link.fromY + link.toY) / 2;
            return (
              <path
                key={`xlink_${i}`}
                d={`M${link.fromX},${link.fromY} C${link.fromX},${midY} ${link.toX},${midY} ${link.toX},${link.toY}`}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.8"
                strokeDasharray="6 4"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const isLeaf = !!node.geviId;
            const isRoot = node.key === 'GEVI';
            const radius = isRoot ? 11 : isLeaf ? NODE_RADIUS_LEAF : NODE_RADIUS_BRANCH;
            const isSelected = editMode && selectedKey === node.key;

            // Fork nodes are invisible junction points. Rendered only in edit mode
            // as small draggable handles so their junction position can be tuned.
            if (node.isFork) {
              if (!editMode) return null;
              return (
                <g
                  key={`node_${i}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onPointerDown={(e) => startDrag(e, node)}
                  style={{ cursor: 'move' }}
                >
                  {isSelected && (
                    <rect x={-8} y={-8} width={16} height={16} rx={2} fill="none" stroke="#002FA7" strokeWidth={1.5} strokeDasharray="3 2" />
                  )}
                  <rect x={-4} y={-4} width={8} height={8} rx={1.5} fill={isSelected ? '#002FA7' : '#94a3b8'} stroke="#fff" strokeWidth={1} opacity={0.85} />
                </g>
              );
            }

            return (
              <g
                key={`node_${i}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={editMode ? undefined : () => handleNodeClick(node.geviId)}
                onPointerDown={editMode ? (e) => startDrag(e, node) : undefined}
                style={{ cursor: editMode ? 'move' : isLeaf ? 'pointer' : 'default' }}
                onMouseEnter={!editMode && isLeaf ? (e: React.MouseEvent<SVGGElement>) => {
                  if (hideTimeout.current) clearTimeout(hideTimeout.current);
                  const gevi = gevis.find(g => g.id === node.geviId);
                  if (gevi) setHoverInfo({ gevi, x: e.clientX, y: e.clientY });
                } : undefined}
                onMouseLeave={!editMode && isLeaf ? () => {
                  hideTimeout.current = setTimeout(() => setHoverInfo(null), 120);
                } : undefined}
              >
                {/* Selection ring (edit mode) */}
                {isSelected && (
                  <path d={hexPath(radius + 6)} fill="none" stroke="#002FA7" strokeWidth={1.5} strokeDasharray="3 2" />
                )}
                {/* Hover / drag target (invisible larger hexagon for easier grabbing) */}
                {(isLeaf || editMode) && (
                  <path d={hexPath(17)} fill="transparent" />
                )}
                <path
                  d={hexPath(radius)}
                  fill={isRoot ? '#002FA7' : isLeaf ? node.color : '#d1d5db'}
                  stroke={isRoot ? '#fff' : isLeaf ? '#fff' : '#9ca3af'}
                  strokeWidth={isRoot ? 2.4 : isLeaf ? 1.8 : 1.2}
                  opacity={1}
                  style={{
                    filter: isRoot ? 'drop-shadow(0 0 6px rgba(0,47,167,0.5))' : isLeaf ? `drop-shadow(0 0 3px ${node.color})` : 'none',
                  }}
                />
                <text
                  x={0}
                  y={isRoot ? -(radius + 4) : isLeaf ? radius + 14 : radius + 13}
                  textAnchor="middle"
                  fill={isRoot ? '#002FA7' : isLeaf ? '#374151' : '#6b7280'}
                  style={{ fontSize: isRoot ? '13px' : isLeaf ? '10px' : '11px', fontWeight: isRoot ? '700' : isLeaf ? '600' : '500' }}
                >
                  {node.name}
                </text>
                {node.year && (
                  <text
                    x={0}
                    y={radius + 25}
                    textAnchor="middle"
                    fill="#9ca3af"
                    style={{ fontSize: '8px' }}
                  >
                    ({node.year})
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {hoverInfo && (
        <div
          style={{
            position: 'fixed',
            left: tooltipLeft,
            top: tooltipTop,
            zIndex: 9999,
            width: TOOLTIP_W,
          }}
          className="rounded-lg border shadow-ambient p-2.5 bg-surface-low border-ink/10"
          onMouseEnter={() => {
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
          }}
          onMouseLeave={() => setHoverInfo(null)}
        >
          {/* Header: name left, score right */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <button
                className="font-bold text-sm text-left w-full hover:underline cursor-pointer leading-tight"
                style={{ color: tooltipNameColor }}
                onClick={() => { onSelectGEVI(hoverInfo.gevi); setHoverInfo(null); }}
              >
                {hoverInfo.gevi.name}
              </button>
            </div>
            <div className="text-right flex-shrink-0 text-[10px] text-ink/50">{hoverInfo.gevi.year}</div>
          </div>

          {/* Tag chips */}
          <div className="flex flex-wrap gap-1 mb-1.5">
            {tooltipTags.map((tag, idx) => (
              <span key={`${tag}-${idx}`} className="text-[9px] px-1.5 py-0.5 rounded bg-klein/5 text-klein">
                {tag}
              </span>
            ))}
            {tooltipExtraCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-low text-ink/50">
                +{tooltipExtraCount}
              </span>
            )}
          </div>

          {/* Paper link */}
          {hoverInfo.gevi.paperUrl && hoverInfo.gevi.paper && (
            <a
              href={hoverInfo.gevi.paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 mb-1.5 hover:underline text-klein"
            >
              <BookOpen className="w-3 h-3 flex-shrink-0" />
              <span className="truncate flex-1">{abbreviatePaper(hoverInfo.gevi.paper)}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          )}

          {hoverInfo.gevi.description && (
            <p className="text-[11px] leading-snug text-ink/70 mb-1.5">
              {hoverInfo.gevi.description}
            </p>
          )}

          <div className="w-full h-64">
            <DistributionRadar gevi={hoverInfo.gevi} expandHex />
          </div>

        </div>
      )}

    </div>
  );
}

export default FamilyTreePanel;
