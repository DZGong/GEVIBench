// Compact vertical lineage display shown in the GEVI detail panel.
// Driven purely by gevi.familyTreePath — no FamilyTree.tsx needed.

import { useMemo } from 'react';
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
      <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
    return {
      name: isLast ? gevi.name : (match?.name ?? key),
      year: isLast ? gevi.year : match?.year,
      isSelected: isLast,
      category: key,
    };
  });

  const nodeSpacing = 80;
  const svgHeight = pathNodes.length * nodeSpacing + 50;
  const svgWidth = 180;

  const gradients = pathNodes.map((node, i) => ({
    id: `v_gradient_${i}`,
    color: getTreeNodeColor(node.name, node.category),
  }));

  return (
    <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Genetic Lineage
      </h4>

      <div className="overflow-auto">
        <svg width={svgWidth} height={svgHeight} className="mx-auto">
          <defs>
            {gradients.map((g) => (
              <linearGradient key={g.id} id={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#000" />
                <stop offset="50%" stopColor={g.color} />
                <stop offset="100%" stopColor={g.color} />
              </linearGradient>
            ))}
          </defs>

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
            const color = getTreeNodeColor(node.name, node.category);
            const radius = node.isSelected ? 12 : 8;
            const y = i * nodeSpacing + 25;
            return (
              <g key={`v_node_${i}`} transform={`translate(${svgWidth / 2}, ${y})`}>
                <circle
                  r={radius}
                  fill={`url(#v_gradient_${i})`}
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

      <div className={`mt-3 pt-2 border-t text-xs text-center ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
        <span className="font-medium">Category:</span>{' '}
        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{pathNodes[0]?.name}</span>
      </div>
    </div>
  );
}

export default GEVILineage;
