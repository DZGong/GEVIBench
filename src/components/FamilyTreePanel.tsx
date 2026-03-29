// Interactive Family Tree Panel
// Shows the full GEVI family tree with interactive nodes
// FPbase-style vertical SVG tree (root at top, descendants below)

import { useMemo, useState, useRef } from 'react';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { getAllGEVIs } from '../geviData';
import type { GEVI, TreeNode } from '../types';
import { getTreeNodeColor } from '../utils';

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

const MIN_NODE_WIDTH = 42;
const SIBLING_GAP = 6;
const LEVEL_HEIGHT = 55;
const LEVEL_STAGGER_BASE = 35;    // y-stagger (px) applied to first branch sibling at depth 0
const LEVEL_STAGGER_DECAY = 9;    // stagger shrinks by this amount per depth level
const TOP_PADDING = 26;
const NODE_RADIUS_LEAF = 7;
const NODE_RADIUS_BRANCH = 4;
const TOOLTIP_W = 170;
const TOOLTIP_H = 270;

interface LayoutNode {
  id: string;
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

// Recursively compute subtree layout using contour-based (profile-based) packing.
// depth: distance from root (used to scale stagger — more aggressive near root)
function layoutTree(node: TreeNode, x: number, y: number, depth = 0): LayoutResult {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];
  const isLeaf = !!node.geviId;
  const isRoot = depth === 0;
  const isFork = !!node.isFork;
  const color = isLeaf ? getTreeNodeColor({ name: node.name }) : '#9ca3af';

  // If no children, this is a leaf
  if (!node.children || Object.keys(node.children).length === 0) {
    nodes.push({ id: node.name, name: node.name, year: node.year, x, y, geviId: node.geviId, color, isFork });
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

  // Stagger amount decays with depth: large near root, zero for deep nodes.
  // Leaf children (no grandchildren) get NO stagger — they stay at the same y
  // so sibling leaves always align horizontally.
  const effectiveStagger = Math.max(0, LEVEL_STAGGER_BASE - depth * LEVEL_STAGGER_DECAY);

  // First pass: layout each child subtree at x=0 to get contours and structure
  const childLayouts: { key: string; result: LayoutResult }[] = [];
  let branchChildIndex = 0;
  for (let i = 0; i < childKeys.length; i++) {
    const key = childKeys[i];
    const childNode = node.children[key];
    const childIsBranch = !!(childNode.children && Object.keys(childNode.children).length > 0);
    const stagger = childIsBranch ? branchChildIndex * effectiveStagger : 0;
    if (childIsBranch) branchChildIndex++;
    const levelH = isFork ? forkLevelHeight : LEVEL_HEIGHT;
    const childY = y + levelH + stagger;
    const result = layoutTree(childNode, 0, childY, depth + 1);
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
  nodes.push({ id: node.name, name: node.name, year: node.year, x, y, geviId: node.geviId, color, isFork });

  let maxY = y;

  // Fourth pass: apply offsets to all child nodes and links
  for (let i = 0; i < childLayouts.length; i++) {
    const { result } = childLayouts[i];
    const offsetX = offsets[i];

    for (const cn of result.nodes) {
      nodes.push({ ...cn, x: cn.x + offsetX });
    }
    for (const cl of result.links) {
      links.push({
        fromX: cl.fromX + offsetX,
        fromY: cl.fromY,
        toX: cl.toX + offsetX,
        toY: cl.toY,
      });
    }

    // Link from parent to this child subtree root
    const childRootNode = result.nodes[0];
    const fromOffset = isFork ? 0 : NODE_RADIUS_BRANCH + 2;
    const toOffset = childRootNode.isFork ? 0 : NODE_RADIUS_BRANCH + 2;
    links.push({
      fromX: x,
      fromY: y + fromOffset,
      toX: childRootNode.x + offsetX,
      toY: childRootNode.y - toOffset,
    });

    maxY = Math.max(maxY, result.maxY);
  }

  // Build parent contour = this node + union of all shifted children contours
  const hw = isRoot ? 9 : isFork ? 2 : (node.geviId ? MIN_NODE_WIDTH / 2 : NODE_RADIUS_BRANCH + 2);
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

  // Prune empty children objects.
  function prune(n: TreeNode) {
    if (!n.children) return;
    if (Object.keys(n.children).length === 0) { delete n.children; return; }
    for (const child of Object.values(n.children)) prune(child);
  }
  prune(root);

  return root;
}

// Build the complete tree from gevi JSON paths
function buildFullTree(gevis: GEVI[]) {
  const geviById = new Map(gevis.map(g => [g.id, g]));
  const root = buildTreeFromPaths(gevis);
  if (!root) return { nodes: [] as LayoutNode[], links: [] as LayoutLink[], crossLinks: [] as LayoutLink[] };

  // Layout starting at center x=0, we'll shift everything to be positive afterwards
  const result = layoutTree(root, 0, TOP_PADDING);

  // Find min X to shift everything into positive coordinates
  const minX = Math.min(...result.nodes.map(n => n.x));
  const padding = 35; // left/right padding

  // Shift all coordinates so minX becomes padding, and override leaf colors with
  // actual GEVI data so colors match the detail panel title.
  const shiftX = -minX + padding;
  const shiftedNodes = result.nodes.map(n => {
    const geviData = n.geviId ? geviById.get(n.geviId) : undefined;
    const color = geviData ? getTreeNodeColor(geviData) : n.color;
    return { ...n, x: n.x + shiftX, color };
  });
  const shiftedLinks = result.links.map(l => ({
    fromX: l.fromX + shiftX,
    toX: l.toX + shiftX,
    fromY: l.fromY,
    toY: l.toY,
  }));

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
}

interface FamilyTreePanelProps {
  onSelectGEVI: (gevi: GEVI) => void;
  selectedGEVI: GEVI | null;
  onCloseDetail: () => void;
  compareGEVIs: GEVI[];
  onAddToCompare: (gevi: GEVI) => void;
}

export function FamilyTreePanel({
  onSelectGEVI,
  onCloseDetail,
}: FamilyTreePanelProps) {
  const gevis = useMemo(() => getAllGEVIs(), []);
  const { nodes, links, crossLinks } = useMemo(() => buildFullTree(gevis), [gevis]);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate SVG dimensions with enough padding for labels below deepest nodes
  const svgWidth = Math.max(700, Math.max(...nodes.map(n => n.x)) + 70);
  const svgHeight = Math.max(350, Math.max(...nodes.map(n => n.y)) + 44);

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
  let tooltipRadarData: { subject: string; value: number; fullMark: number }[] = [];
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
    tooltipRadarData = [
      { subject: 'Brightness',  value: g.brightness    ?? 0, fullMark: 100 },
      { subject: 'Speed',       value: g.speed          ?? 0, fullMark: 100 },
      { subject: 'Dyn. Range',  value: g.dynamicRange   ?? 0, fullMark: 100 },
      { subject: 'Sensitivity', value: g.sensitivity    ?? 0, fullMark: 100 },
      { subject: 'Photostab.',  value: g.photostability ?? 0, fullMark: 100 },
      { subject: 'Popularity',  value: Math.min(100, (g.paperCount ?? 0) * 5), fullMark: 100 },
    ];
  }

  return (
    <div className="rounded-lg border p-4 bg-surface-lowest border-ink/10">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onCloseDetail}
          className="p-1 rounded-md hover:bg-surface-low text-ink/50"
          title="Close and return"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-ink">
          Genetic Lineage
        </h3>
      </div>

      {/* Scrollable container - auto height, horizontal scroll only */}
      <div className="overflow-x-auto overflow-y-hidden border rounded-lg">
        <div className="flex justify-center" style={{ minWidth: svgWidth }}>
        <svg width={svgWidth} height={svgHeight} className="block">

          {/* Links - curved paths */}
          {links.map((link, i) => {
            const midY = (link.fromY + link.toY) / 2;
            return (
              <path
                key={`link_${i}`}
                d={`M${link.fromX},${link.fromY} C${link.fromX},${midY} ${link.toX},${midY} ${link.toX},${link.toY}`}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.5"
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
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const isLeaf = !!node.geviId;
            const isRoot = i === 0 && node.name === 'GEVI';
            const radius = isRoot ? 9 : isLeaf ? NODE_RADIUS_LEAF : NODE_RADIUS_BRANCH;

            // Fork nodes are invisible junction points — don't render
            if (node.isFork) return null;

            return (
              <g
                key={`node_${i}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node.geviId)}
                style={{ cursor: isLeaf ? 'pointer' : 'default' }}
                onMouseEnter={isLeaf ? (e: React.MouseEvent<SVGGElement>) => {
                  if (hideTimeout.current) clearTimeout(hideTimeout.current);
                  const gevi = gevis.find(g => g.id === node.geviId);
                  if (gevi) setHoverInfo({ gevi, x: e.clientX, y: e.clientY });
                } : undefined}
                onMouseLeave={isLeaf ? () => {
                  hideTimeout.current = setTimeout(() => setHoverInfo(null), 120);
                } : undefined}
              >
                {/* Hover target (invisible larger hexagon for easier clicking) */}
                {isLeaf && (
                  <path d={hexPath(14)} fill="transparent" />
                )}
                <path
                  d={hexPath(radius)}
                  fill={isRoot ? '#002FA7' : isLeaf ? node.color : '#d1d5db'}
                  stroke={isRoot ? '#fff' : isLeaf ? '#fff' : '#9ca3af'}
                  strokeWidth={isRoot ? 2 : isLeaf ? 1.5 : 1}
                  opacity={1}
                  style={{
                    filter: isRoot ? 'drop-shadow(0 0 6px rgba(0,47,167,0.5))' : isLeaf ? `drop-shadow(0 0 3px ${node.color})` : 'none',
                  }}
                />
                <text
                  x={0}
                  y={isRoot ? -(radius + 3) : isLeaf ? radius + 12 : radius + 11}
                  textAnchor="middle"
                  fill={isRoot ? '#002FA7' : isLeaf ? '#374151' : '#6b7280'}
                  style={{ fontSize: isRoot ? '11px' : isLeaf ? '8px' : '9px', fontWeight: isRoot ? '700' : isLeaf ? '600' : '500' }}
                >
                  {node.name}
                </text>
                {node.year && (
                  <text
                    x={0}
                    y={radius + 21}
                    textAnchor="middle"
                    fill="#9ca3af"
                    style={{ fontSize: '7px' }}
                  >
                    ({node.year})
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        </div>
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
          className="rounded-lg border shadow-ambient p-2.5 bg-surface border-ink/10"
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
            {hoverInfo.gevi.overall != null && (
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-bold text-klein leading-none">{hoverInfo.gevi.overall}</div>
                <div className="text-[8px] text-ink/40">Overall</div>
              </div>
            )}
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

          {/* Divider */}
          <div className="border-t mb-1 border-ink/5" />

          {/* Radar chart */}
          <RadarChart width={150} height={130} data={tooltipRadarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#002FA7"
              fill="#002FA7"
              fillOpacity={0.2}
            />
          </RadarChart>
        </div>
      )}

    </div>
  );
}

export default FamilyTreePanel;
