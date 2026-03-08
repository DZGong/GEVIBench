// Interactive Family Tree Panel
// Shows the full GEVI family tree with interactive nodes
// This component is used in the detail panel area of the database tab

import { useState } from 'react';
import { X, ChevronRight, Info } from 'lucide-react';
import gevisData from '../data.json';
import type { GEVI } from '../types';
import { useTheme } from '../context/ThemeContext';

const gevis = gevisData as GEVI[];

// Family tree structure from FamilyTree.tsx
const FAMILY_TREE = {
  'VSD': {
    name: 'VSD Based',
    children: {
      'VSD-FRET': {
        name: 'Ci-VSP FRET-based',
        children: {
          'VSFP1': { name: 'VSFP1', year: 2001 },
          'VSFP2': {
            name: 'VSFP2',
            year: 2007,
            children: {
              'VSFP2.3': { name: 'VSFP2.3', year: 2009 },
              'Mermaid': { name: 'Mermaid', year: 2008 },
              'Butterfly': { name: 'VSFP-Butterfly', year: 2010 },
              'nirButterfly': { name: 'nirButterfly', year: 2018 },
            }
          },
        }
      },
      'VSD-single': {
        name: 'Ci-VSP Single-FP',
        children: {
          'ArcLight': {
            name: 'ArcLight lineage',
            children: {
              'arclight': { name: 'ArcLight', year: 2012 },
              'arclightd': { name: 'ArcLight-D', year: 2015 },
              'Bongwoori': { name: 'Bongwoori', year: 2017 },
              'Marina': { name: 'Marina', year: 2017 },
            }
          }
        }
      },
      'VSD-cpGFP': {
        name: 'VSD-cpGFP',
        children: {
          'ASAP': {
            name: 'ASAP lineage',
            children: {
              'asap1': { name: 'ASAP1', year: 2014 },
              'asap2s': { name: 'ASAP2s', year: 2017 },
              'asap3': { name: 'ASAP3', year: 2019 },
              'asap4b': { name: 'ASAP4b', year: 2022 },
              'asap4e': { name: 'ASAP4e', year: 2022 },
              'asap5': { name: 'ASAP5', year: 2024 },
              'JEDI': {
                name: 'JEDI lineage',
                children: {
                  'jedi2p': { name: 'JEDI-2P', year: 2022 },
                  'jedi1p': { name: 'JEDI-1P', year: 2023 },
                }
              },
              'restus': { name: 'rEstus', year: 2024 },
              'synth': { name: 'Synth', year: 2024 },
              'probedb': { name: 'ProbeDB', year: 2024 },
            }
          },
          'chiVSD': {
            name: 'ChiVSD lineage',
            children: {
              'chivsfp': { name: 'ChiVSF', year: 2018 },
            }
          },
        }
      },
    }
  },
  'Opsin': {
    name: 'Opsin Based',
    children: {
      'Opsin-Fluorescent': {
        name: 'Microbial Rhodopsin',
        children: {
          'PROPS': { name: 'PROPS', year: 2011 },
          'Arch': {
            name: 'Arch lineage',
            children: {
              'archer1': { name: 'Archer1', year: 2014 },
              'QuasAr': {
                name: 'QuasAr lineage',
                children: {
                  'quasar1': { name: 'QuasAr1', year: 2014 },
                  'quasar2': { name: 'QuasAr2', year: 2014 },
                  'quasar3': { name: 'paQuasAr3', year: 2019 },
                  'quasar6': { name: 'QuasAr6', year: 2022 },
                }
              },
              'Archon': {
                name: 'Archon lineage',
                children: {
                  'archon1': { name: 'Archon1', year: 2018 },
                  'archon2': { name: 'Archon2', year: 2018 },
                  'archon3': { name: 'Archon3', year: 2019 },
                  'somarchon': { name: 'SomArchon', year: 2019 },
                }
              },
              'rho1': { name: 'Rho1', year: 2015 },
              'electric': { name: 'Electric', year: 2018 },
              'pado': { name: 'Pado', year: 2020 },
            }
          },
          'NIR': {
            name: 'NIR lineage',
            children: {
              'nir': { name: 'NIR', year: 2016 },
              'nir2': { name: 'NIR2', year: 2018 },
            }
          },
        }
      },
      'Opsin-FRET': {
        name: 'Opsin-FRET',
        children: {
          'macq': { name: 'MacQ', year: 2014 },
          'ace1': { name: 'Ace1', year: 2014 },
          'ace2n': {
            name: 'Ace2N lineage',
            children: {
              'ace2n-mneon': { name: 'Ace2N-mNeon', year: 2015 },
              'ace2n-mneon2': { name: 'Ace2N-mNeon2', year: 2018 },
            }
          },
          'varnam': { name: 'VARNAM', year: 2018 },
          'positron': { name: 'Positron', year: 2020 },
        }
      },
    }
  },
  'Others': {
    name: 'Others',
    children: {
      'Chemigenetic': {
        name: 'Chemigenetic',
        children: {
          'voltron': { name: 'Voltron', year: 2018 },
          'voltron2': { name: 'Voltron2', year: 2023 },
          'hviplus': { name: 'HVIplus', year: 2023 },
        }
      },
      'Red FP': {
        name: 'Red FP',
        children: {
          'flicr1': { name: 'FlicR1', year: 2016 },
        }
      },
      'Bioluminescent': {
        name: 'Bioluminescent',
        children: {
          'lotusv': { name: 'LOTUS-V', year: 2017 },
          'amber': { name: 'AMBER', year: 2022 },
          'solaris': { name: 'Solaris', year: 2023 },
        }
      },
    }
  }
};

// Map GEVI IDs to their tree path
const GEVI_PATHS: Record<string, string[]> = {
  // VSD Based
  'vsfp1': ['VSD', 'VSD-FRET', 'VSFP1'],
  'vsfp2': ['VSD', 'VSD-FRET', 'VSFP2', 'VSFP2'],
  'vsfp2_3': ['VSD', 'VSD-FRET', 'VSFP2', 'VSFP2.3'],
  'mermaid': ['VSD', 'VSD-FRET', 'VSFP2', 'Mermaid'],
  'vsfpbutterfly': ['VSD', 'VSD-FRET', 'VSFP2', 'Butterfly'],
  'nirbutterfly': ['VSD', 'VSD-FRET', 'VSFP2', 'nirButterfly'],
  'arclight': ['VSD', 'VSD-single', 'ArcLight', 'arclight'],
  'arclightd': ['VSD', 'VSD-single', 'ArcLight', 'arclightd'],
  'bongwoori': ['VSD', 'VSD-single', 'ArcLight', 'Bongwoori'],
  'marina': ['VSD', 'VSD-single', 'ArcLight', 'Marina'],
  'asap1': ['VSD', 'VSD-cpGFP', 'ASAP', 'asap1'],
  'asap2s': ['VSD', 'VSD-cpGFP', 'ASAP', 'asap2s'],
  'asap3': ['VSD', 'VSD-cpGFP', 'ASAP', 'asap3'],
  'asap4b': ['VSD', 'VSD-cpGFP', 'ASAP', 'asap4b'],
  'asap4e': ['VSD', 'VSD-cpGFP', 'ASAP', 'asap4e'],
  'asap5': ['VSD', 'VSD-cpGFP', 'ASAP', 'asap5'],
  'jedi2p': ['VSD', 'VSD-cpGFP', 'ASAP', 'JEDI', 'jedi2p'],
  'jedi1p': ['VSD', 'VSD-cpGFP', 'ASAP', 'JEDI', 'jedi1p'],
  'restus': ['VSD', 'VSD-cpGFP', 'ASAP', 'restus'],
  'synth': ['VSD', 'VSD-cpGFP', 'ASAP', 'synth'],
  'probedb': ['VSD', 'VSD-cpGFP', 'ASAP', 'probedb'],
  'chivsfp': ['VSD', 'VSD-cpGFP', 'chiVSD', 'chivsfp'],

  // Opsin Based - Fluorescent
  'props': ['Opsin', 'Opsin-Fluorescent', 'PROPS'],
  'archer1': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'archer1'],
  'quasar1': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'QuasAr', 'quasar1'],
  'quasar2': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'QuasAr', 'quasar2'],
  'quasar3': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'QuasAr', 'quasar3'],
  'quasar6': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'QuasAr', 'quasar6'],
  'archon1': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'Archon', 'archon1'],
  'archon2': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'Archon', 'archon2'],
  'archon3': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'Archon', 'archon3'],
  'somarchon': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'Archon', 'somarchon'],
  'rho1': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'rho1'],
  'electric': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'electric'],
  'pado': ['Opsin', 'Opsin-Fluorescent', 'Arch', 'pado'],
  'nir': ['Opsin', 'Opsin-Fluorescent', 'NIR', 'nir'],
  'nir2': ['Opsin', 'Opsin-Fluorescent', 'NIR', 'nir2'],

  // Opsin Based - FRET
  'macq': ['Opsin', 'Opsin-FRET', 'macq'],
  'ace1': ['Opsin', 'Opsin-FRET', 'ace1'],
  'ace2n-mneon': ['Opsin', 'Opsin-FRET', 'ace2n', 'ace2n-mneon'],
  'ace2n-mneon2': ['Opsin', 'Opsin-FRET', 'ace2n', 'ace2n-mneon2'],
  'varnam': ['Opsin', 'Opsin-FRET', 'varnam'],
  'positron': ['Opsin', 'Opsin-FRET', 'positron'],

  // Others
  'voltron': ['Others', 'Chemigenetic', 'voltron'],
  'voltron2': ['Others', 'Chemigenetic', 'voltron2'],
  'hviplus': ['Others', 'Chemigenetic', 'hviplus'],
  'flicr1': ['Others', 'Red FP', 'flicr1'],
  'lotusv': ['Others', 'Bioluminescent', 'lotusv'],
  'amber': ['Others', 'Bioluminescent', 'amber'],
  'solaris': ['Others', 'Bioluminescent', 'solaris'],
};

interface TreeNode {
  name: string;
  year?: number;
  children?: Record<string, TreeNode>;
  geviId?: string;
}

interface HoveredNode {
  node: TreeNode;
  gevi: GEVI | null;
  x: number;
  y: number;
}

interface FamilyTreePanelProps {
  darkMode: boolean;
  onSelectGEVI: (gevi: GEVI) => void;
  selectedGEVI: GEVI | null;
  onCloseDetail: () => void;
  compareGEVIs: GEVI[];
  onAddToCompare: (gevi: GEVI) => void;
}

function flattenTree(node: TreeNode, path: string[] = []): { node: TreeNode; path: string[] }[] {
  const result: { node: TreeNode; path: string[] }[] = [];

  if (node.geviId) {
    result.push({ node, path });
  }

  if (node.children) {
    for (const [key, child] of Object.entries(node.children)) {
      result.push(...flattenTree(child, [...path, key]));
    }
  }

  return result;
}

// Mini Radar Chart component
function MiniRadar({ gevi, size = 80 }: { gevi: GEVI | null; size?: number }) {
  if (!gevi) return null;

  const metrics = [
    { label: 'Bright', value: gevi.brightness },
    { label: 'Speed', value: gevi.speed },
    { label: 'SNR', value: gevi.snr },
    { label: 'Range', value: gevi.dynamicRange },
    { label: 'Stable', value: gevi.photostability },
  ];

  const maxValue = 100;
  const center = size / 2;
  const radius = size / 2 - 10;
  const angleStep = (2 * Math.PI) / 5;

  const points = metrics.map((m, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const value = (m.value / maxValue) * radius;
    return {
      x: center + value * Math.cos(angle),
      y: center + value * Math.sin(angle),
    };
  });

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Background pentagon */}
      {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
        <polygon
          key={i}
          points={metrics.map((_, j) => {
            const angle = j * angleStep - Math.PI / 2;
            const r = radius * scale;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ')}
          fill="none"
          stroke="#ccc"
          strokeWidth="0.5"
        />
      ))}
      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3b82f6"
        strokeWidth="1.5"
      />
      {/* Labels */}
      {metrics.map((m, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const labelRadius = radius + 8;
        return (
          <text
            key={i}
            x={center + labelRadius * Math.cos(angle)}
            y={center + labelRadius * Math.sin(angle)}
            fontSize="6"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#666"
          >
            {m.label}
          </text>
        );
      })}
    </svg>
  );
}

// Tooltip component
function NodeTooltip({ hoveredNode }: { hoveredNode: HoveredNode }) {
  const { darkMode } = useTheme();
  const gevi = hoveredNode.gevi;

  return (
    <div
      className={`absolute z-50 p-3 rounded-lg shadow-xl border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
      style={{
        left: hoveredNode.x + 20,
        top: hoveredNode.y - 50,
        minWidth: '200px',
        pointerEvents: 'none',
      }}
    >
      {gevi ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-blue-500">{gevi.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              {gevi.year}
            </span>
          </div>
          <div className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {gevi.description.substring(0, 80)}...
          </div>
          <MiniRadar gevi={gevi} size={100} />
          <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
            <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Overall: <span className="font-semibold text-blue-500">{gevi.overall}</span></div>
            <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SNR: <span className="font-semibold">{gevi.snr}</span></div>
            <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Speed: <span className="font-semibold">{gevi.speed}</span></div>
            <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Range: <span className="font-semibold">{gevi.dynamicRange}</span></div>
          </div>
        </>
      ) : (
        <div className="text-center">
          <div className="font-semibold mb-1">{hoveredNode.node.name}</div>
          {hoveredNode.node.year && (
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Year: {hoveredNode.node.year}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tree Node component
function TreeNodeComponent({
  node,
  path,
  level,
  onHover,
  onLeave,
  onClick,
  expandedNodes,
  toggleNode,
  darkMode,
}: {
  node: TreeNode;
  path: string[];
  level: number;
  onHover: (node: TreeNode, gevi: GEVI | null, x: number, y: number) => void;
  onLeave: () => void;
  onClick: (node: TreeNode, gevi: GEVI | null) => void;
  expandedNodes: Set<string>;
  toggleNode: (path: string) => void;
  darkMode: boolean;
}) {
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const isExpanded = expandedNodes.has(path.join('/'));
  const nodePath = path.join('/');

  const handleMouseEnter = (e: React.MouseEvent) => {
    const gevi = node.geviId ? gevis.find(g => g.id === node.geviId) || null : null;
    onHover(node, gevi, e.clientX, e.clientY);
  };

  const handleClick = () => {
    const gevi = node.geviId ? gevis.find(g => g.id === node.geviId) || null : null;
    if (gevi) {
      onClick(node, gevi);
    } else if (hasChildren) {
      toggleNode(nodePath);
    }
  };

  const isLeaf = node.geviId;
  const isCategory = !node.geviId;

  return (
    <div className="ml-4">
      <div
        className={`flex items-center gap-1 py-0.5 cursor-pointer rounded px-2 hover:bg-opacity-20 ${
          isLeaf
            ? 'hover:bg-blue-500'
            : hasChildren
              ? 'hover:bg-blue-500'
              : ''
        } ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onLeave}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(nodePath);
            }}
            className="p-0.5"
          >
            <ChevronRight
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        )}
        <span
          className={`text-sm ${
            isLeaf
              ? 'font-medium text-blue-500'
              : isCategory && level === 0
                ? 'font-bold'
                : darkMode
                  ? 'text-gray-300'
                  : 'text-gray-700'
          }`}
        >
          {node.name}
        </span>
        {node.year && (
          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            ({node.year})
          </span>
        )}
        {isLeaf && (
          <Info className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="border-l border-gray-300 dark:border-gray-600 ml-1">
          {Object.entries(node.children!).map(([key, child]) => (
            <TreeNodeComponent
              key={key}
              node={child}
              path={[...path, key]}
              level={level + 1}
              onHover={onHover}
              onLeave={onLeave}
              onClick={onClick}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FamilyTreePanel({
  darkMode,
  onSelectGEVI,
  selectedGEVI,
  onCloseDetail,
  compareGEVIs,
  onAddToCompare,
}: FamilyTreePanelProps) {
  const { colors } = useTheme();
  const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['VSD', 'Opsin', 'Others', 'VSD/VSD-FRET', 'VSD/VSD-cpGFP', 'Opsin/Opsin-Fluorescent'])
  );

  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleHover = (node: TreeNode, gevi: GEVI | null, x: number, y: number) => {
    setHoveredNode({ node, gevi, x, y });
  };

  const handleLeave = () => {
    setHoveredNode(null);
  };

  const handleNodeClick = (node: TreeNode, gevi: GEVI | null) => {
    if (gevi) {
      onSelectGEVI(gevi);
    }
  };

  const handleCloseDetail = () => {
    onCloseDetail();
  };

  return (
    <div className={`rounded-lg border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start gap-2 mb-4">
        <button
          onClick={handleCloseDetail}
          className={`p-1 rounded-md ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title="Close and return"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Genetic Lineage
        </h3>
      </div>

      <div className="relative overflow-auto" style={{ maxHeight: '500px' }}>
        {Object.entries(FAMILY_TREE).map(([key, branch]) => (
          <TreeNodeComponent
            key={key}
            node={branch}
            path={[key]}
            level={0}
            onHover={handleHover}
            onLeave={handleLeave}
            onClick={handleNodeClick}
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
            darkMode={darkMode}
          />
        ))}

        {/* Tooltip */}
        {hoveredNode && <NodeTooltip hoveredNode={hoveredNode} />}
      </div>
    </div>
  );
}

export default FamilyTreePanel;
