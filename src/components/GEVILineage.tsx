// Compact lineage display shown in the GEVI detail panel.
// Horizontal on narrow screens, vertical on md+.

import { useMemo } from 'react';

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
import { getAllGEVIs } from '../geviData';
import { getTreeNodeColor } from '../utils';
import type { GEVI } from '../types';

interface GEVILineageProps {
  gevi: GEVI;
}

export function GEVILineage({ gevi }: GEVILineageProps) {
  const gevis = useMemo(() => getAllGEVIs(), []);
  const geviById = useMemo(() => new Map(gevis.map(g => [g.id, g])), [gevis]);

  const path = useMemo(() => {
    if (gevi.familyTreePath) return gevi.familyTreePath as string[];
    if (!gevi.parentId) return null;
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
    return resolvedPaths.get(gevi.id) ?? null;
  }, [gevi, gevis]);

  if (!path || path.length === 0) {
    return (
      <div className="rounded-lg p-4 bg-surface-low border border-ink/10 inline-block">
        <h4 className="text-sm font-semibold mb-2 text-ink text-center">
          Genetic Lineage
        </h4>
        <div className="text-xs text-ink/40">
          Family information not available
        </div>
      </div>
    );
  }

  const pathNodes = path.map((key, i) => {
    const isLast = i === path.length - 1;
    const match = geviById.get(key);
    const geviData = isLast ? gevi : match;
    return {
      name: isLast ? gevi.name : (match?.name ?? key),
      year: isLast ? gevi.year : match?.year,
      isSelected: isLast,
      geviData,
    };
  });

  // Vertical layout params (md+)
  const vNodeSpacing = 80;
  const vTopPad = 45;
  const vSvgHeight = pathNodes.length * vNodeSpacing + vTopPad + 25;
  const vSvgWidth = 180;

  // Horizontal layout params (narrow)
  const hNodeSpacing = 90;
  const hLeftPad = 50;
  const hSvgWidth = pathNodes.length * hNodeSpacing + hLeftPad + 30;
  const hSvgHeight = 70;
  const hCy = 35;

  return (
    <div className="rounded-lg p-4 bg-surface-low border border-ink/10 md:inline-block overflow-hidden">
      <h4 className="text-sm font-semibold mb-3 text-ink text-center">
        Genetic Lineage
      </h4>

      {/* Horizontal layout — narrow screens */}
      <div className="overflow-x-auto -mx-2 px-2 md:hidden">
        <svg width={hSvgWidth} height={hSvgHeight} className="mx-auto">
          {pathNodes.slice(0, -1).map((_node, i) => {
            const x1 = i * hNodeSpacing + hLeftPad;
            const x2 = (i + 1) * hNodeSpacing + hLeftPad;
            return (
              <path
                key={`h_link_${i}`}
                d={`M${x1},${hCy} C${x1 + 15},${hCy} ${x2 - 15},${hCy} ${x2},${hCy}`}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
              />
            );
          })}
          {pathNodes.map((node, i) => {
            const color = node.geviData ? getTreeNodeColor(node.geviData) : node.name === 'GEVI' ? '#002FA7' : '#9ca3af';
            const radius = node.isSelected ? 12 : 8;
            const x = i * hNodeSpacing + hLeftPad;
            return (
              <g key={`h_node_${i}`} transform={`translate(${x}, ${hCy})`}>
                <path
                  d={hexPath(radius)}
                  fill={color}
                  stroke={node.isSelected ? '#fff' : 'none'}
                  strokeWidth={node.isSelected ? 2 : 0}
                  style={{ filter: node.isSelected ? `drop-shadow(0 0 8px ${color})` : 'none' }}
                />
                <text
                  x={0}
                  y={-20}
                  textAnchor="middle"
                  style={{ fontSize: '10px', fontWeight: node.isSelected ? 'bold' : 'normal', fill: '#374151' }}
                >
                  {node.name}
                </text>
                {node.year && (
                  <text
                    x={0}
                    y={24}
                    textAnchor="middle"
                    style={{ fontSize: '8px', fill: '#9ca3af' }}
                  >
                    ({node.year})
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Vertical layout — md+ screens */}
      <div className="overflow-auto hidden md:block">
        <svg width={vSvgWidth} height={vSvgHeight} className="mx-auto">
          {pathNodes.slice(0, -1).map((_node, i) => (
            <path
              key={`v_link_${i}`}
              d={`M${vSvgWidth / 2},${i * vNodeSpacing + vTopPad}
                  C${vSvgWidth / 2},${i * vNodeSpacing + vTopPad + 15}
                   ${vSvgWidth / 2},${(i + 1) * vNodeSpacing + vTopPad - 15}
                   ${vSvgWidth / 2},${(i + 1) * vNodeSpacing + vTopPad}`}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
            />
          ))}
          {pathNodes.map((node, i) => {
            const color = node.geviData ? getTreeNodeColor(node.geviData) : node.name === 'GEVI' ? '#002FA7' : '#9ca3af';
            const radius = node.isSelected ? 12 : 8;
            const y = i * vNodeSpacing + vTopPad;
            return (
              <g key={`v_node_${i}`} transform={`translate(${vSvgWidth / 2}, ${y})`}>
                <path
                  d={hexPath(radius)}
                  fill={color}
                  stroke={node.isSelected ? '#fff' : 'none'}
                  strokeWidth={node.isSelected ? 2 : 0}
                  style={{ filter: node.isSelected ? `drop-shadow(0 0 8px ${color})` : 'none' }}
                />
                <text
                  x={0}
                  y={-20}
                  textAnchor="middle"
                  style={{ fontSize: '11px', fontWeight: node.isSelected ? 'bold' : 'normal',
                    fill: '#374151' }}
                >
                  {node.name}
                </text>
                {node.year && (
                  <text
                    x={0}
                    y={-8}
                    textAnchor="middle"
                    style={{ fontSize: '9px', fill: '#9ca3af' }}
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
  );
}

export default GEVILineage;
