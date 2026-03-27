// Compact vertical lineage display shown in the GEVI detail panel.
// Driven purely by gevi.familyTreePath — no FamilyTree.tsx needed.

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
  darkMode?: boolean;
}

export function GEVILineage({ gevi, darkMode = false }: GEVILineageProps) {
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
      <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-paper border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Genetic Lineage
        </h4>
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
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

  const nodeSpacing = 80;
  const svgHeight = pathNodes.length * nodeSpacing + 50;
  const svgWidth = 180;

  return (
    <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-paper border-gray-200'}`}>
      <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Genetic Lineage
      </h4>

      <div className="overflow-auto">
        <svg width={svgWidth} height={svgHeight} className="mx-auto">

          {pathNodes.slice(0, -1).map((_node, i) => (
            <path
              key={`v_link_${i}`}
              d={`M${svgWidth / 2},${i * nodeSpacing + 25}
                  C${svgWidth / 2},${i * nodeSpacing + 40}
                   ${svgWidth / 2},${(i + 1) * nodeSpacing + 10}
                   ${svgWidth / 2},${(i + 1) * nodeSpacing + 25}`}
              fill="none"
              stroke={darkMode ? '#4b5563' : '#9ca3af'}
              strokeWidth="2"
            />
          ))}

          {pathNodes.map((node, i) => {
            const color = node.geviData ? getTreeNodeColor(node.geviData) : '#9ca3af';
            const radius = node.isSelected ? 12 : 8;
            const y = i * nodeSpacing + 25;
            return (
              <g key={`v_node_${i}`} transform={`translate(${svgWidth / 2}, ${y})`}>
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
                    fill: darkMode ? 'white' : '#374151' }}
                >
                  {node.name}
                </text>
                {node.year && (
                  <text
                    x={0}
                    y={-8}
                    textAnchor="middle"
                    style={{ fontSize: '9px', fill: darkMode ? '#9ca3af' : '#9ca3af' }}
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
