import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { getAllGEVIs } from '../geviData';
import { getTreeNodeColor } from '../utils';
import type { GEVI } from '../types';

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

const TOOLTIP_W = 170;
const TOOLTIP_H = 130;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GNode {
  id: string;
  name: string;
  bRel: number | null;
  color: string;
  isEGFP: boolean;
  isExternal: boolean; // referenced but not in the DB (e.g. "arch")
  gevi: GEVI | null;
}

interface GEdge {
  a: string;     // GEVI that made the measurement
  b: string;     // reference it compared against
  ratio: number; // B_rel(a) / B_rel(b)
}

// ── Rounded hexagon path (same as FamilyTreePanel) ──────────────────────────

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

// ── Graph builder ─────────────────────────────────────────────────────────────

function buildGraph(gevis: GEVI[]): { nodes: GNode[]; edges: GEdge[] } {
  const geviMap = new Map(gevis.map(g => [g.id, g]));
  const nodeSet = new Set<string>(['EGFP']);
  const edges: GEdge[] = [];

  for (const gevi of gevis) {
    if (!gevi.brightnessData?.length) continue;
    nodeSet.add(gevi.id);
    for (const { ratio, reference } of gevi.brightnessData) {
      if (ratio <= 0) continue;
      nodeSet.add(reference);
      const dup = edges.some(e =>
        (e.a === gevi.id && e.b === reference) || (e.a === reference && e.b === gevi.id)
      );
      if (!dup) edges.push({ a: gevi.id, b: reference, ratio });
    }
  }

  // BFS from EGFP to resolve B_rel for every node
  const adjMap = new Map<string, { to: string; factor: number }[]>();
  const addAdjEdge = (from: string, to: string, factor: number) => {
    if (!adjMap.has(from)) adjMap.set(from, []);
    adjMap.get(from)!.push({ to, factor });
  };
  for (const gevi of gevis) {
    if (!gevi.brightnessData) continue;
    for (const { ratio, reference } of gevi.brightnessData) {
      if (ratio <= 0) continue;
      addAdjEdge(reference, gevi.id, ratio);
      addAdjEdge(gevi.id, reference, 1 / ratio);
    }
  }
  const logEst = new Map<string, number[]>([['EGFP', [0]]]);
  const bfsQ = ['EGFP'];
  while (bfsQ.length > 0) {
    const node = bfsQ.shift()!;
    const avg = logEst.get(node)!.reduce((a, b) => a + b, 0) / logEst.get(node)!.length;
    for (const { to, factor } of adjMap.get(node) ?? []) {
      const logTo = avg + Math.log(factor);
      if (!logEst.has(to)) { logEst.set(to, [logTo]); bfsQ.push(to); }
      else logEst.get(to)!.push(logTo);
    }
  }
  const bRelMap = new Map([...logEst].map(([id, logs]) => [
    id, Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length),
  ]));

  const nodes: GNode[] = [...nodeSet].map(id => {
    const gevi = geviMap.get(id) ?? null;
    const bRel = bRelMap.get(id) ?? null;
    return {
      id,
      name: gevi?.name ?? id,
      bRel,
      color: id === 'EGFP' ? '#22c55e' : gevi ? getTreeNodeColor(gevi) : '#6b7280',
      isEGFP: id === 'EGFP',
      isExternal: !gevi && id !== 'EGFP',
      gevi,
    };
  });

  return { nodes, edges };
}

// ── Force-directed layout (organic branching) ───────────────────────────────
// Produces a tree-like, branching structure radiating from EGFP at center.
// Short edges, local-only repulsion, no boundary clamping — auto-fit handles viewport.

function forceLayout(
  nodes: GNode[],
  edges: GEdge[],
  W: number,
  H: number,
): Map<string, { x: number; y: number; bfsDist: number }> {
  if (nodes.length === 0) return new Map();
  const N = nodes.length;

  // Short ideal edge length for tight clustering
  const K = 65;
  // Repulsion cutoff — only repel nodes within this radius (keeps clusters tight)
  const REP_CUTOFF = K * 3;

  // BFS distances from EGFP
  const adjIds = new Map<string, string[]>();
  for (const e of edges) {
    if (!adjIds.has(e.a)) adjIds.set(e.a, []);
    if (!adjIds.has(e.b)) adjIds.set(e.b, []);
    adjIds.get(e.a)!.push(e.b);
    adjIds.get(e.b)!.push(e.a);
  }
  const dist = new Map<string, number>([['EGFP', 0]]);
  const bfsQ = ['EGFP'];
  while (bfsQ.length > 0) {
    const n = bfsQ.shift()!;
    for (const nb of adjIds.get(n) ?? []) {
      if (!dist.has(nb)) { dist.set(nb, dist.get(n)! + 1); bfsQ.push(nb); }
    }
  }

  // Initial placement: BFS-tree layout with angular spread per parent
  // This gives the simulation a good organic starting shape to refine
  const pos = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  const placed = new Set<string>();
  const childAngle = new Map<string, number>(); // track angle allocation per parent

  pos.set('EGFP', { x: W / 2, y: H / 2, vx: 0, vy: 0 });
  placed.add('EGFP');

  // BFS placement: each child is placed at an angle offset from its parent
  const placeQ = ['EGFP'];
  const parentOf = new Map<string, string>();
  // Assign BFS parent
  {
    const visited = new Set(['EGFP']);
    const q = ['EGFP'];
    while (q.length > 0) {
      const n = q.shift()!;
      for (const nb of adjIds.get(n) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          parentOf.set(nb, n);
          q.push(nb);
        }
      }
    }
  }

  // Count children per node for angular spread
  const childCount = new Map<string, number>();
  for (const [child, parent] of parentOf) {
    childCount.set(parent, (childCount.get(parent) ?? 0) + 1);
  }

  // Place nodes in BFS order, spreading children around their parent
  const angleOf = new Map<string, number>(); // angle from center for each node
  angleOf.set('EGFP', 0);
  const childIdx = new Map<string, number>();

  const bfsPlace = ['EGFP'];
  const visitedPlace = new Set(['EGFP']);
  while (bfsPlace.length > 0) {
    const n = bfsPlace.shift()!;
    const nPos = pos.get(n)!;
    const children = [...(adjIds.get(n) ?? [])].filter(c => parentOf.get(c) === n && !visitedPlace.has(c));
    const nChildren = children.length;

    // Determine angular sector for children
    const parentAngle = angleOf.get(n) ?? 0;
    const isRoot = n === 'EGFP';
    const spread = isRoot ? 2 * Math.PI : Math.min(Math.PI * 0.8, Math.PI * 0.3 * nChildren);
    const startAngle = isRoot ? 0 : parentAngle - spread / 2;
    const edgeLen = K * 1.3;

    children.forEach((child, i) => {
      const angle = nChildren === 1
        ? parentAngle + (Math.random() - 0.5) * 0.3
        : startAngle + (spread * (i + 0.5)) / nChildren;
      const jitter = (Math.random() - 0.5) * 0.15;
      const a = angle + jitter;
      pos.set(child, {
        x: nPos.x + edgeLen * Math.cos(a),
        y: nPos.y + edgeLen * Math.sin(a),
        vx: 0, vy: 0,
      });
      angleOf.set(child, a);
      visitedPlace.add(child);
      bfsPlace.push(child);
    });
  }

  // Place any disconnected nodes (no BFS path from EGFP)
  for (const node of nodes) {
    if (!pos.has(node.id)) {
      pos.set(node.id, {
        x: W / 2 + (Math.random() - 0.5) * 200,
        y: H / 2 + (Math.random() - 0.5) * 200,
        vx: 0, vy: 0,
      });
    }
  }

  // Force simulation: local repulsion + edge attraction, no boundary
  let temp = K * 1.5;
  const cooling = 0.95;

  for (let iter = 0; iter < 400; iter++) {
    for (const p of pos.values()) { p.vx = 0; p.vy = 0; }

    // Short-range repulsion only (within REP_CUTOFF)
    const entries = [...pos.entries()];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [idA, a] = entries[i];
        const [idB, b] = entries[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        if (d > REP_CUTOFF) continue;
        const f = (K * K) / d;
        if (idA !== 'EGFP') { a.vx += (dx / d) * f; a.vy += (dy / d) * f; }
        if (idB !== 'EGFP') { b.vx -= (dx / d) * f; b.vy -= (dy / d) * f; }
      }
    }

    // Edge attraction — pull connected nodes toward ideal distance K
    for (const edge of edges) {
      const a = pos.get(edge.a), b = pos.get(edge.b);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const f = (d - K) * 0.4;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      if (edge.a !== 'EGFP') { a.vx += fx; a.vy += fy; }
      if (edge.b !== 'EGFP') { b.vx -= fx; b.vy -= fy; }
    }

    // No gravity, no boundary — let the graph spread organically

    // Integrate
    for (const [id, p] of pos) {
      if (id === 'EGFP') continue;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0) {
        const move = Math.min(temp, speed);
        p.x += (p.vx / speed) * move;
        p.y += (p.vy / speed) * move;
      }
    }
    temp *= cooling;
  }

  // Gentle collision resolution (smaller min dist for tighter packing)
  const MIN_DIST = 45;
  const posEntries = [...pos.entries()];
  for (let iter = 0; iter < 30; iter++) {
    let anyOverlap = false;
    for (let i = 0; i < posEntries.length; i++) {
      for (let j = i + 1; j < posEntries.length; j++) {
        const [idA, a] = posEntries[i];
        const [idB, b] = posEntries[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
        if (d < MIN_DIST) {
          anyOverlap = true;
          const overlap = MIN_DIST - d;
          const nx = dx / d, ny = dy / d;
          if (idA === 'EGFP') {
            b.x -= nx * overlap;
            b.y -= ny * overlap;
          } else if (idB === 'EGFP') {
            a.x += nx * overlap;
            a.y += ny * overlap;
          } else {
            a.x += nx * overlap * 0.5;
            a.y += ny * overlap * 0.5;
            b.x -= nx * overlap * 0.5;
            b.y -= ny * overlap * 0.5;
          }
        }
      }
    }
    if (!anyOverlap) break;
  }

  return new Map([...pos].map(([id, { x, y }]) => [id, { x, y, bfsDist: dist.get(id) ?? 9999 }]));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRatio(ratio: number): string {
  if (ratio >= 100) return `×${Math.round(ratio)}`;
  if (ratio >= 10)  return `×${Math.round(ratio)}`;
  if (ratio >= 1)   return `×${ratio.toFixed(1)}`;
  const inv = 1 / ratio;
  if (inv >= 100)   return `1/${Math.round(inv)}`;
  if (inv >= 10)    return `1/${Math.round(inv)}`;
  return `1/${inv.toFixed(1)}`;
}


// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onSelectGEVI: (gevi: GEVI) => void;
}

const W = 2100, H = 1500;

export function BrightnessNetworkPanel({ onSelectGEVI }: Props) {
  const gevis = useMemo(() => getAllGEVIs(), []);
  const { nodes, edges } = useMemo(() => buildGraph(gevis), [gevis]);
  const positions = useMemo(() => forceLayout(nodes, edges, W, H), [nodes, edges]);

  // Pan (no zoom)
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [hoverInfo, setHoverInfo] = useState<{ node: GNode & { x: number; y: number; r: number }; x: number; y: number } | null>(null);
  const hoveredId = hoverInfo?.node.id ?? null;
  const neighborIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const s = new Set<string>();
    for (const e of edges) {
      if (e.a === hoveredId) s.add(e.b);
      if (e.b === hoveredId) s.add(e.a);
    }
    return s;
  }, [hoveredId, edges]);
  const [fitted, setFitted] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    setTx(v => v + e.clientX - dragRef.current.x);
    setTy(v => v + e.clientY - dragRef.current.y);
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
  }, []);
  const onMouseUp = useCallback(() => { dragRef.current.active = false; }, []);

  // Compute final node data
  const finalNodes = useMemo(() => nodes.map(node => {
    const p = positions.get(node.id) ?? { x: W / 2, y: H / 2, bfsDist: 9999 };
    const r = node.isEGFP ? 14 : 11;
    return { ...node, x: p.x, y: p.y, r, bfsDist: p.bfsDist };
  }), [nodes, positions]);

  const nodeById = useMemo(() => new Map(finalNodes.map(n => [n.id, n])), [finalNodes]);

  // Graph bounding box (in layout coords)
  const graphBounds = useMemo(() => {
    const labelPad = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of finalNodes) {
      minX = Math.min(minX, n.x - labelPad);
      minY = Math.min(minY, n.y - labelPad);
      maxX = Math.max(maxX, n.x + labelPad);
      maxY = Math.max(maxY, n.y + labelPad);
    }
    return { minX, minY, maxX, maxY, gw: maxX - minX, gh: maxY - minY };
  }, [finalNodes]);

  // Canvas height adapts to graph aspect ratio: fill available width, derive height
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const fitToViewport = useCallback(() => {
    if (finalNodes.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    if (vw === 0 || graphBounds.gw === 0) return;
    // Scale to fill width, derive height from graph aspect ratio
    const s = vw / graphBounds.gw * 0.95;
    const derivedH = graphBounds.gh * s;
    // Clamp between 300px and 85vh
    const maxH = window.innerHeight * 0.85;
    const h = Math.max(300, Math.min(derivedH, maxH));
    setCanvasHeight(h);
    // Now fit within the actual canvas dimensions
    const finalScale = Math.min(vw / graphBounds.gw, h / graphBounds.gh) * 0.95;
    setScale(finalScale);
    setTx((vw - graphBounds.gw * finalScale) / 2 - graphBounds.minX * finalScale);
    setTy((h - graphBounds.gh * finalScale) / 2 - graphBounds.minY * finalScale);
  }, [finalNodes, graphBounds]);

  // Initial fit
  useEffect(() => {
    if (fitted || finalNodes.length === 0) return;
    fitToViewport();
    setFitted(true);
  }, [finalNodes, fitted, fitToViewport]);

  // Re-fit on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => fitToViewport());
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToViewport]);

  const bg      = '#fdfcfa';
  const edgeClr = '#cbd5e1';

  return (
    <div
      className="flex flex-col rounded-lg border-2 p-4 bg-surface-lowest border-gold/40 shadow-md text-ink"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-klein">Brightness Network</h3>
          <p className="text-xs text-ink mt-0.5">
            Graph of relative brightness measurements across GEVIs, anchored to EGFP via BFS traversal.
          </p>
        </div>
        <div className="ml-auto text-xs text-ink/40">
          {nodes.length} nodes · {edges.length} edges
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="overflow-hidden relative border rounded-lg bg-surface-low"
        style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab', height: canvasHeight }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block' }}>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>



            {/* Arrowhead markers */}
            <defs>
              <marker id="arrow-default" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6 Z" fill={edgeClr} />
              </marker>
              <marker id="arrow-highlight" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6 Z" fill="#60a5fa" />
              </marker>
            </defs>

            {/* Edges — directed: a measured itself as ratio× of b, arrow points a→b */}
            {edges.map((edge, i) => {
              const a = nodeById.get(edge.a), b = nodeById.get(edge.b);
              if (!a || !b) return null;
              const dx = b.x - a.x, dy = b.y - a.y;
              const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
              const nx = dx / d, ny = dy / d;
              const pad = 16;
              const x1 = a.x + nx * pad, y1 = a.y + ny * pad;
              const x2 = b.x - nx * pad, y2 = b.y - ny * pad;
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              const isRel = hoveredId === edge.a || hoveredId === edge.b;
              const fade = hoveredId && !isRel;
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isRel ? '#60a5fa' : edgeClr}
                    strokeWidth={isRel ? 2.5 : 1.5}
                    opacity={fade ? 0.1 : isRel ? 0.9 : 0.7}
                    markerEnd={`url(#arrow-${isRel ? 'highlight' : 'default'})`}
                  />
                  <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle"
                    fontSize={isRel ? 11 : 10}
                    fontWeight={isRel ? '700' : '600'}
                    fill={isRel ? '#3b82f6' : '#64748b'}
                    stroke={bg} strokeWidth={3} paintOrder="stroke"
                    opacity={fade ? 0.08 : 1}
                    style={{ userSelect: 'none', pointerEvents: 'none', fontFamily: 'system-ui' }}
                  >
                    {formatRatio(edge.ratio)}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {finalNodes.map(node => {
              const isHov = hoveredId === node.id;
              const isNeighbor = neighborIds.has(node.id);
              const fade = hoveredId && !isHov && !isNeighbor;
              return (
                <g key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  onMouseEnter={(e: React.MouseEvent) => {
                    if (hideTimeout.current) clearTimeout(hideTimeout.current);
                    setHoverInfo({ node, x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => {
                    hideTimeout.current = setTimeout(() => setHoverInfo(null), 120);
                  }}
                  onClick={() => node.gevi && onSelectGEVI(node.gevi)}
                  style={{ cursor: node.gevi ? 'pointer' : 'default' }}
                  opacity={fade ? 0.15 : 1}
                >
                  {/* Hover glow ring */}
                  {isHov && (
                    <path d={hexPath(node.r + 4)} fill="none"
                      stroke={node.color} strokeWidth={1.5} opacity={0.5} />
                  )}
                  {/* Neighbor ring */}
                  {isNeighbor && !isHov && (
                    <path d={hexPath(node.r + 3)} fill="none"
                      stroke="#60a5fa" strokeWidth={1} opacity={0.6} />
                  )}
                  {/* Invisible larger hit area */}
                  <path d={hexPath(node.r + 6)} fill="transparent" />
                  {/* Node hexagon */}
                  <path d={hexPath(node.r)}
                    fill={node.color}
                    fillOpacity={node.isExternal ? 0.35 : 1}
                    stroke={node.isExternal ? '#9ca3af' : '#fff'}
                    strokeWidth={node.isEGFP ? 2 : 1.5}
                    strokeDasharray={node.isExternal ? '2.5 1.5' : undefined}
                    style={node.isEGFP ? { filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.5))' } : node.gevi ? { filter: `drop-shadow(0 0 3px ${node.color})` } : undefined}
                  />
                  {/* Name label below */}
                  <text y={node.r + 13} textAnchor="middle" dominantBaseline="middle"
                    fontSize={node.isEGFP ? 12 : 9}
                    fontWeight={node.isEGFP ? '700' : '600'}
                    fill={node.isEGFP ? '#2563eb' : '#374151'}
                    stroke={bg} strokeWidth={2.5} paintOrder="stroke"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {node.name}
                  </text>
                  {/* B_rel below name */}
                  {node.bRel !== null && (
                    <text y={node.r + 24} textAnchor="middle" dominantBaseline="middle"
                      fontSize={7} fontWeight="500"
                      fill="#9ca3af"
                      stroke={bg} strokeWidth={2} paintOrder="stroke"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {node.bRel.toFixed(2)}×
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

      </div>

      {hoverInfo && hoverInfo.node.gevi && (() => {
        const g = hoverInfo.node.gevi!;
        const GAP = 14;
        let tipLeft = hoverInfo.x < window.innerWidth / 2
          ? hoverInfo.x + GAP
          : hoverInfo.x - GAP - TOOLTIP_W;
        tipLeft = Math.max(8, Math.min(tipLeft, window.innerWidth - TOOLTIP_W - 8));
        let tipTop = hoverInfo.y < window.innerHeight * 3 / 5
          ? hoverInfo.y + GAP
          : hoverInfo.y - GAP - TOOLTIP_H;
        tipTop = Math.max(8, Math.min(tipTop, window.innerHeight - TOOLTIP_H - 8));

        const nameColor = getTreeNodeColor(g);
        const tags = Array.isArray(g.tags) ? g.tags : [];
        const tooltipTags = tags.slice(0, 4);
        const tooltipExtraCount = tags.length - tooltipTags.length;

        return (
          <div
            style={{ position: 'fixed', left: tipLeft, top: tipTop, zIndex: 9999, width: TOOLTIP_W }}
            className="rounded-lg border shadow-ambient p-2.5 bg-surface-low border-ink/10"
            onMouseEnter={() => { if (hideTimeout.current) clearTimeout(hideTimeout.current); }}
            onMouseLeave={() => setHoverInfo(null)}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <button
                  className="font-bold text-sm text-left w-full hover:underline cursor-pointer leading-tight"
                  style={{ color: nameColor }}
                  onClick={() => { onSelectGEVI(g); setHoverInfo(null); }}
                >
                  {g.name}
                </button>
              </div>
              <div className="text-right flex-shrink-0 text-[10px] text-ink/50">{g.year}</div>
            </div>

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

            {g.paperUrl && g.paper && (
              <a
                href={g.paperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 mb-1.5 hover:underline text-klein"
              >
                <BookOpen className="w-3 h-3 flex-shrink-0" />
                <span className="truncate flex-1">{abbreviatePaper(g.paper)}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            )}

          </div>
        );
      })()}

    </div>
  );
}
