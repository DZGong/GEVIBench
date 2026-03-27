import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getAllGEVIs } from '../geviData';
import { getTreeNodeColor } from '../utils';
import type { GEVI } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GNode {
  id: string;
  name: string;
  bRel: number | null;
  bScore: number | null;
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
    const bScore = bRel !== null
      ? Math.max(0, Math.min(100, Math.round(25 * Math.log10(bRel) + 60)))
      : null;
    return {
      id,
      name: gevi?.name ?? id,
      bRel,
      bScore,
      color: id === 'EGFP' ? '#f59e0b' : gevi ? getTreeNodeColor(gevi) : '#6b7280',
      isEGFP: id === 'EGFP',
      isExternal: !gevi && id !== 'EGFP',
      gevi,
    };
  });

  return { nodes, edges };
}

// ── Force-directed layout (Enhanced Fruchterman-Reingold) ───────────────────
// EGFP is pinned at the center. Post-simulation collision resolution pass.

function forceLayout(
  nodes: GNode[],
  edges: GEdge[],
  W: number,
  H: number,
): Map<string, { x: number; y: number; bfsDist: number }> {
  if (nodes.length === 0) return new Map();
  const N = nodes.length;
  const K = Math.sqrt((W * H) / N) * 1.5;

  // BFS distances from EGFP — used for initial concentric placement
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

  // Group by distance; place in concentric rings
  const byDist = new Map<number, string[]>();
  for (const node of nodes) {
    const d = dist.get(node.id) ?? 9999;
    if (!byDist.has(d)) byDist.set(d, []);
    byDist.get(d)!.push(node.id);
  }
  const maxDist = Math.max(0, ...[...dist.values()].filter(v => v < 9999));

  const pos = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  for (const [d, ids] of byDist) {
    if (d === 0) { pos.set('EGFP', { x: W / 2, y: H / 2, vx: 0, vy: 0 }); continue; }
    if (d >= 9999) {
      ids.forEach((id, i) => pos.set(id, { x: 80 + (i % 8) * 120, y: H - 80, vx: 0, vy: 0 }));
      continue;
    }
    const r = (d / (maxDist + 1)) * Math.min(W, H) * 0.40;
    ids.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / ids.length - Math.PI / 2;
      pos.set(id, { x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle), vx: 0, vy: 0 });
    });
  }

  // FR simulation
  let temp = Math.min(W, H) * 0.12;
  const cooling = 0.93;
  const pad = 80;

  for (let iter = 0; iter < 500; iter++) {
    for (const p of pos.values()) { p.vx = 0; p.vy = 0; }

    // Repulsion (all pairs)
    const entries = [...pos.entries()];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [idA, a] = entries[i];
        const [idB, b] = entries[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const f = K * K / d;
        if (idA !== 'EGFP') { a.vx += (dx / d) * f; a.vy += (dy / d) * f; }
        if (idB !== 'EGFP') { b.vx -= (dx / d) * f; b.vy -= (dy / d) * f; }
      }
    }

    // Attraction (edges, weakened)
    for (const edge of edges) {
      const a = pos.get(edge.a), b = pos.get(edge.b);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const f = (d * d) / K * 0.4;
      if (edge.a !== 'EGFP') { a.vx += (dx / d) * f; a.vy += (dy / d) * f; }
      if (edge.b !== 'EGFP') { b.vx -= (dx / d) * f; b.vy -= (dy / d) * f; }
    }

    // Mild gravity toward center
    for (const [id, p] of pos) {
      if (id === 'EGFP') continue;
      p.vx += (W / 2 - p.x) * 0.003;
      p.vy += (H / 2 - p.y) * 0.003;
    }

    // Integrate + clamp
    for (const [id, p] of pos) {
      if (id === 'EGFP') continue;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0) {
        const move = Math.min(temp, speed);
        p.x += (p.vx / speed) * move;
        p.y += (p.vy / speed) * move;
        p.x = Math.max(pad, Math.min(W - pad, p.x));
        p.y = Math.max(pad, Math.min(H - pad, p.y));
      }
    }
    temp *= cooling;
  }

  // Post-simulation collision resolution
  const MIN_DIST = 70;
  const posEntries = [...pos.entries()];
  for (let iter = 0; iter < 50; iter++) {
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
          // Clamp
          if (idA !== 'EGFP') {
            a.x = Math.max(pad, Math.min(W - pad, a.x));
            a.y = Math.max(pad, Math.min(H - pad, a.y));
          }
          if (idB !== 'EGFP') {
            b.x = Math.max(pad, Math.min(W - pad, b.x));
            b.y = Math.max(pad, Math.min(H - pad, b.y));
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

// Small inline hexagon SVG for legend
function LegendHex({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg width="11" height="12" viewBox="-6 -7 12 14" className="inline-block flex-shrink-0" style={{ verticalAlign: 'middle' }}>
      <path d={hexPath(6, 1.8)} fill={color} fillOpacity={dashed ? 0.35 : 1}
        stroke={dashed ? color : 'none'} strokeWidth={dashed ? 0.8 : 0}
        strokeDasharray={dashed ? '1.5 1' : undefined} />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onSelectGEVI: (gevi: GEVI) => void;
}

const W = 1400, H = 1000;

export function BrightnessNetworkPanel({ onSelectGEVI }: Props) {
  const { darkMode } = useTheme();
  const gevis = useMemo(() => getAllGEVIs(), []);
  const { nodes, edges } = useMemo(() => buildGraph(gevis), [gevis]);
  const positions = useMemo(() => forceLayout(nodes, edges, W, H), [nodes, edges]);

  // Pan / zoom
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredEdgeIdx, setHoveredEdgeIdx] = useState<number | null>(null);
  const [fitted, setFitted] = useState(false);

  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Non-passive wheel listener
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = (e.clientX - rect.left - tx) / scale;
      const my = (e.clientY - rect.top  - ty) / scale;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setScale(s => {
        const ns = Math.max(0.25, Math.min(4, s * factor));
        setTx(() => e.clientX - rect.left - mx * ns);
        setTy(() => e.clientY - rect.top  - my * ns);
        return ns;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [tx, ty, scale]);

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
  const hoveredNode = hoveredId ? nodeById.get(hoveredId) ?? null : null;

  // Compute max BFS distance for ring guides
  const maxBfsDist = useMemo(() => {
    let max = 0;
    for (const n of finalNodes) {
      if (n.bfsDist < 9999 && n.bfsDist > max) max = n.bfsDist;
    }
    return max;
  }, [finalNodes]);

  // Auto-fit graph into viewport on first render
  useEffect(() => {
    if (fitted || finalNodes.length === 0) return;
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = rect.width, vh = rect.height;
    if (vw === 0 || vh === 0) return;
    const labelPad = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of finalNodes) {
      minX = Math.min(minX, n.x - labelPad);
      minY = Math.min(minY, n.y - labelPad);
      maxX = Math.max(maxX, n.x + labelPad);
      maxY = Math.max(maxY, n.y + labelPad);
    }
    const gw = maxX - minX, gh = maxY - minY;
    const s = Math.min(vw / gw, vh / gh, 1.2) * 0.92;
    setScale(s);
    setTx((vw - gw * s) / 2 - minX * s);
    setTy((vh - gh * s) / 2 - minY * s);
    setFitted(true);
  }, [finalNodes, fitted]);

  const bg      = darkMode ? '#111827' : '#f8fafc';
  const edgeClr = darkMode ? '#4b5563' : '#cbd5e1';
  const txt     = darkMode ? '#d1d5db' : '#374151';
  const subTxt  = darkMode ? '#6b7280' : '#94a3b8';
  const ringClr = darkMode ? '#1e293b' : '#e2e8f0';
  const tipBg   = darkMode ? '#1f2937' : '#ffffff';
  const tipBd   = darkMode ? '#374151' : '#e2e8f0';

  const ringSpacing = Math.min(W, H) * 0.18;
  const cx = W / 2, cy = H / 2;

  return (
    <div
      className={`flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-paper text-gray-900'}`}
      style={{ height: 'calc(100vh - 61px)' }}
    >
      {/* Header bar */}
      <div className={`flex items-center gap-4 px-5 py-2.5 border-b flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div>
          <h2 className="text-sm font-semibold">Brightness Network</h2>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Edges show direct brightness comparisons from published papers. Labels show the ratio A&nbsp;/&nbsp;B. Scroll to zoom · drag to pan · click a node to view details.
          </p>
        </div>
        <div className={`ml-auto text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {nodes.length} nodes · {edges.length} edges
        </div>
      </div>

      {/* Legend */}
      <div className={`flex flex-wrap gap-x-5 gap-y-1 px-5 py-1.5 text-xs border-b flex-shrink-0 ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
        {[
          { color: '#f59e0b', label: 'EGFP (anchor)' },
          { color: '#22c55e', label: 'GFP-based' },
          { color: '#d500f9', label: 'Chemigenetic' },
          { color: '#7f1d1d', label: 'Opsin-based' },
          { color: '#6b7280', label: 'External ref.', dashed: true },
        ].map(({ color, label, dashed }) => (
          <span key={label} className="flex items-center gap-1.5">
            <LegendHex color={color} dashed={dashed} />
            {label}
          </span>
        ))}
      </div>

      {/* Canvas */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <svg ref={svgRef} width="100%" height="100%" style={{ background: bg, display: 'block' }}>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>

            {/* Decorative concentric ring guides */}
            {Array.from({ length: maxBfsDist }, (_, i) => i + 1).map(d => (
              <circle key={`ring-${d}`}
                cx={cx} cy={cy} r={d * ringSpacing}
                fill="none" stroke={ringClr} strokeWidth={1}
                strokeDasharray="4 3" opacity={0.5}
              />
            ))}

            {/* Edges */}
            {edges.map((edge, i) => {
              const a = nodeById.get(edge.a), b = nodeById.get(edge.b);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              const isHE = hoveredEdgeIdx === i;
              const isRel = hoveredId === edge.a || hoveredId === edge.b;
              const fade = (hoveredId || hoveredEdgeIdx !== null) && !isHE && !isRel;
              return (
                <g key={i}
                  onMouseEnter={() => setHoveredEdgeIdx(i)}
                  onMouseLeave={() => setHoveredEdgeIdx(null)}
                  style={{ cursor: 'default' }}
                >
                  {/* Wide invisible hit area */}
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="transparent" strokeWidth={14} />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={isHE || isRel ? '#60a5fa' : edgeClr}
                    strokeWidth={isHE ? 2.5 : 1.2}
                    opacity={fade ? 0.1 : isHE || isRel ? 0.9 : 0.7}
                  />
                  {/* Ratio label — always visible */}
                  <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle"
                    fontSize={isHE || isRel ? 9.5 : 8.5}
                    fontWeight={isHE || isRel ? '600' : '500'}
                    fill={isHE ? '#60a5fa' : isRel ? '#60a5fa' : darkMode ? '#6b7280' : '#64748b'}
                    stroke={bg} strokeWidth={2.5} paintOrder="stroke"
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
              const isRelE = hoveredEdgeIdx !== null &&
                (edges[hoveredEdgeIdx]?.a === node.id || edges[hoveredEdgeIdx]?.b === node.id);
              const fade = (hoveredId || hoveredEdgeIdx !== null) && !isHov && !isRelE;
              return (
                <g key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => node.gevi && onSelectGEVI(node.gevi)}
                  style={{ cursor: node.gevi ? 'pointer' : 'default' }}
                  opacity={fade ? 0.15 : 1}
                >
                  {/* Hover glow ring */}
                  {isHov && (
                    <path d={hexPath(node.r + 4)} fill="none"
                      stroke={node.color} strokeWidth={1.5} opacity={0.5} />
                  )}
                  {/* Invisible larger hit area */}
                  <path d={hexPath(node.r + 6)} fill="transparent" />
                  {/* Node hexagon */}
                  <path d={hexPath(node.r)}
                    fill={node.color}
                    fillOpacity={node.isExternal ? 0.35 : 1}
                    stroke={isHov ? '#fff' : '#fff'}
                    strokeWidth={isHov ? 2 : 1.2}
                    strokeDasharray={node.isExternal ? '2.5 1.5' : undefined}
                  />
                  {/* Name label below */}
                  <text y={node.r + 13} textAnchor="middle" dominantBaseline="middle"
                    fontSize={node.isEGFP ? 10.5 : 8.5}
                    fontWeight={node.isEGFP ? '700' : isHov ? '600' : '500'}
                    fill={txt}
                    stroke={bg} strokeWidth={2.5} paintOrder="stroke"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {node.name}
                  </text>
                  {/* Brightness score below name */}
                  {node.bScore !== null && (
                    <text y={node.r + 24} textAnchor="middle" dominantBaseline="middle"
                      fontSize={7.5} fontWeight="500"
                      fill={subTxt}
                      stroke={bg} strokeWidth={2} paintOrder="stroke"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {node.bScore}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover tooltip — fixed at top-right */}
        {hoveredNode && (
          <div className="absolute top-3 right-3 pointer-events-none z-20 rounded-lg shadow-xl p-3 text-xs"
            style={{ background: tipBg, border: `1px solid ${tipBd}`, minWidth: 190 }}>
            <div className="font-semibold text-sm mb-1.5">{hoveredNode.name}</div>
            {hoveredNode.isEGFP && (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Reference standard — B_rel = 1.00 · Score = 60
              </p>
            )}
            {hoveredNode.isExternal && (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                External reference (not in database)
              </p>
            )}
            {!hoveredNode.isEGFP && !hoveredNode.isExternal && (
              <>
                <div className={`text-xs mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {hoveredNode.gevi?.category}
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between gap-6">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>B_rel (vs EGFP)</span>
                    <span className="font-mono font-semibold">
                      {hoveredNode.bRel !== null ? `${hoveredNode.bRel.toFixed(3)}×` : 'unresolved'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Brightness score</span>
                    <span className="font-mono font-semibold">
                      {hoveredNode.bScore !== null ? `${hoveredNode.bScore}/100` : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className={`mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Click to view GEVI details ↗
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
