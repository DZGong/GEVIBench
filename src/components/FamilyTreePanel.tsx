// Interactive Family Tree Panel
// Shows the full GEVI family tree with interactive nodes
// FPbase-style vertical SVG tree (root at top, descendants below)

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import gevisData from '../data.json';
import type { GEVI } from '../types';

const gevis = gevisData as GEVI[];

// Color mapping based on GEVI properties
function getGEVIColor(geviName: string, category: string): string {
  const name = geviName.toLowerCase();

  // Red/Far-red
  if (name.includes('red') || name.includes('far') || name.includes('rfp') ||
      name.includes('nir') || name.includes('mcherry') || name.includes('tagrfp') ||
      category.includes('Red FP')) {
    return '#ff1744';
  }
  // Yellow/Orange
  if (name.includes('yellow') || name.includes('orange') || name.includes('yfp') ||
      name.includes('meyfp') || name.includes('citrine') || name.includes('venus')) {
    return '#ffea00';
  }
  // Cyan
  if (name.includes('cyan') || name.includes('cfp') || name.includes('tev') ||
      name.includes('mteal') || name.includes('cerulean')) {
    return '#00e5ff';
  }
  // Green (default)
  if (name.includes('green') || name.includes('gfp') || name.includes('emerald') ||
      name.includes('asap') || name.includes('arc') || name.includes('jedi') ||
      category.includes('VSD') || category.includes('Opsin')) {
    return '#00e676';
  }
  // Purple/Pink
  if (name.includes('purple') || name.includes('pink') || name.includes('mVenus') ||
      name.includes('positron') || name.includes('voltron')) {
    return '#d500f9';
  }

  return '#00e676';
}

// Family tree structure
const FAMILY_TREE = {
  'VSD': {
    name: 'VSD Based',
    children: {
      'VSD-FRET': {
        name: 'Ci-VSP FRET-based',
        children: {
          'VSFP1': { name: 'VSFP1', year: 2001, geviId: 'vsfp1' },
          'VSFP2': {
            name: 'VSFP2',
            year: 2007,
            geviId: 'vsfp2',
            children: {
              'VSFP2.3': { name: 'VSFP2.3', year: 2009, geviId: 'vsfp2_3' },
              'Mermaid': { name: 'Mermaid', year: 2008, geviId: 'mermaid' },
              'Butterfly': { name: 'VSFP-Butterfly', year: 2010, geviId: 'vsfpbutterfly' },
              'nirButterfly': { name: 'nirButterfly', year: 2018, geviId: 'nirbutterfly' },
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
              'arclight': { name: 'ArcLight', year: 2012, geviId: 'arclight' },
              'arclightd': { name: 'ArcLight-D', year: 2015, geviId: 'arclightd' },
              'Bongwoori': { name: 'Bongwoori', year: 2017, geviId: 'bongwoori' },
              'Marina': { name: 'Marina', year: 2017, geviId: 'marina' },
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
              'asap1': { name: 'ASAP1', year: 2014, geviId: 'asap1' },
              'asap2s': { name: 'ASAP2s', year: 2017, geviId: 'asap2s' },
              'asap3': { name: 'ASAP3', year: 2019, geviId: 'asap3' },
              'asap4b': { name: 'ASAP4b', year: 2022, geviId: 'asap4b' },
              'asap4e': { name: 'ASAP4e', year: 2022, geviId: 'asap4e' },
              'asap5': { name: 'ASAP5', year: 2024, geviId: 'asap5' },
              'JEDI': {
                name: 'JEDI lineage',
                children: {
                  'jedi2p': { name: 'JEDI-2P', year: 2022, geviId: 'jedi2p' },
                  'jedi1p': { name: 'JEDI-1P', year: 2023, geviId: 'jedi1p' },
                }
              },
              'restus': { name: 'rEstus', year: 2024, geviId: 'restus' },
              'synth': { name: 'Synth', year: 2024, geviId: 'synth' },
              'probedb': { name: 'ProbeDB', year: 2024, geviId: 'probedb' },
            }
          },
          'chiVSD': {
            name: 'ChiVSD lineage',
            children: {
              'chivsfp': { name: 'ChiVSF', year: 2018, geviId: 'chivsfp' },
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
          'PROPS': { name: 'PROPS', year: 2011, geviId: 'props' },
          'Arch': {
            name: 'Arch lineage',
            children: {
              'archer1': { name: 'Archer1', year: 2014, geviId: 'archer1' },
              'QuasAr': {
                name: 'QuasAr lineage',
                children: {
                  'quasar1': { name: 'QuasAr1', year: 2014, geviId: 'quasar1' },
                  'quasar2': { name: 'QuasAr2', year: 2014, geviId: 'quasar2' },
                  'quasar3': { name: 'paQuasAr3', year: 2019, geviId: 'quasar3' },
                  'quasar6': { name: 'QuasAr6', year: 2022, geviId: 'quasar6' },
                }
              },
              'Archon': {
                name: 'Archon lineage',
                children: {
                  'archon1': { name: 'Archon1', year: 2018, geviId: 'archon1' },
                  'archon2': { name: 'Archon2', year: 2018, geviId: 'archon2' },
                  'archon3': { name: 'Archon3', year: 2019, geviId: 'archon3' },
                  'somarchon': { name: 'SomArchon', year: 2019, geviId: 'somarchon' },
                }
              },
              'rho1': { name: 'Rho1', year: 2015, geviId: 'rho1' },
              'electric': { name: 'Electric', year: 2018, geviId: 'electric' },
              'pado': { name: 'Pado', year: 2020, geviId: 'pado' },
            }
          },
          'NIR': {
            name: 'NIR lineage',
            children: {
              'nir': { name: 'NIR', year: 2016, geviId: 'nir' },
              'nir2': { name: 'NIR2', year: 2018, geviId: 'nir2' },
            }
          },
        }
      },
      'Opsin-FRET': {
        name: 'Opsin-FRET',
        children: {
          'macq': { name: 'MacQ', year: 2014, geviId: 'macq' },
          'ace1': { name: 'Ace1', year: 2014, geviId: 'ace1' },
          'ace2n': {
            name: 'Ace2N lineage',
            children: {
              'ace2n-mneon': { name: 'Ace2N-mNeon', year: 2015, geviId: 'ace2n-mneon' },
              'ace2n-mneon2': { name: 'Ace2N-mNeon2', year: 2018, geviId: 'ace2n-mneon2' },
            }
          },
          'varnam': { name: 'VARNAM', year: 2018, geviId: 'varnam' },
          'positron': { name: 'Positron', year: 2020, geviId: 'positron' },
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
          'voltron': { name: 'Voltron', year: 2018, geviId: 'voltron' },
          'voltron2': { name: 'Voltron2', year: 2023, geviId: 'voltron2' },
          'hviplus': { name: 'HVIplus', year: 2023, geviId: 'hviplus' },
        }
      },
      'Red FP': {
        name: 'Red FP',
        children: {
          'flicr1': { name: 'FlicR1', year: 2016, geviId: 'flicr1' },
        }
      },
      'Bioluminescent': {
        name: 'Bioluminescent',
        children: {
          'lotusv': { name: 'LOTUS-V', year: 2017, geviId: 'lotusv' },
          'amber': { name: 'AMBER', year: 2022, geviId: 'amber' },
          'solaris': { name: 'Solaris', year: 2023, geviId: 'solaris' },
        }
      },
    }
  }
};

interface TreeNode {
  name: string;
  year?: number;
  children?: Record<string, TreeNode>;
  geviId?: string;
}

interface FamilyTreePanelProps {
  darkMode: boolean;
  onSelectGEVI: (gevi: GEVI) => void;
  selectedGEVI: GEVI | null;
  onCloseDetail: () => void;
  compareGEVIs: GEVI[];
  onAddToCompare: (gevi: GEVI) => void;
}

// Build vertical SVG tree with proper positioning
function buildVerticalTree(node: TreeNode, depth: number = 0, parentX: number = 0): {
  nodes: { id: string; name: string; year?: number; x: number; y: number; geviId?: string; color: string; parentX: number; parentY: number }[];
  links: { fromX: number; fromY: number; toX: number; toY: number }[];
  maxY: number;
} {
  const nodes: { id: string; name: string; year?: number; x: number; y: number; geviId?: string; color: string; parentX: number; parentY: number }[] = [];
  const links: { fromX: number; fromY: number; toX: number; toY: number }[] = [];

  const nodeId = node.name.replace(/\s+/g, '_').toLowerCase();
  const isLeaf = !!node.geviId;
  const color = isLeaf ? getGEVIColor(node.name, '') : '#9ca3af';

  // Calculate y position based on depth
  const y = depth * 80 + 40;
  const x = parentX;

  nodes.push({
    id: nodeId,
    name: node.name,
    year: node.year,
    x,
    y,
    geviId: node.geviId,
    color,
    parentX,
    parentY: y,
  });

  let maxChildY = y;

  if (node.children) {
    const childKeys = Object.keys(node.children);
    const totalWidth = childKeys.length * 100;
    const startX = parentX - totalWidth / 2 + 50;

    childKeys.forEach((key, index) => {
      const child = node.children![key];
      const childX = startX + index * 100;
      const childResult = buildVerticalTree(child, depth + 1, childX);

      // Add link from parent to child
      links.push({
        fromX: x,
        fromY: y + 10,
        toX: childX,
        toY: childResult.nodes[0]?.y || (depth + 1) * 80 + 40,
      });

      nodes.push(...childResult.nodes);
      links.push(...childResult.links);
      maxChildY = Math.max(maxChildY, childResult.maxY);
    });
  }

  return { nodes, links, maxY: Math.max(y, maxChildY) };
}

// Build all branches
function buildAllBranchesVertical() {
  const allNodes: { id: string; name: string; year?: number; x: number; y: number; geviId?: string; color: string; branch: string }[] = [];
  const allLinks: { fromX: number; fromY: number; toX: number; toY: number; branch: string }[] = [];

  const branches = Object.entries(FAMILY_TREE);
  // Vertical layout: each branch is a column
  const branchSpacing = 500;

  branches.forEach(([branchKey, branch], branchIndex) => {
    const branchCenterX = 50 + branchIndex * branchSpacing + 250;
    const result = buildVerticalTree(branch as TreeNode, 0, branchCenterX);

    result.nodes.forEach(n => {
      allNodes.push({ ...n, branch: branchKey });
    });
    result.links.forEach(l => {
      allLinks.push({ ...l, branch: branchKey });
    });
  });

  return { nodes: allNodes, links: allLinks };
}

export function FamilyTreePanel({
  darkMode,
  onSelectGEVI,
  selectedGEVI,
  onCloseDetail,
  compareGEVIs,
  onAddToCompare,
}: FamilyTreePanelProps) {
  const { nodes, links } = useMemo(() => buildAllBranchesVertical(), []);

  // Calculate SVG dimensions
  const maxX = Math.max(...nodes.map(n => n.x), 0) + 150;
  const maxY = Math.max(...nodes.map(n => n.y), 0) + 100;
  const svgWidth = Math.max(1400, maxX);
  const svgHeight = Math.max(600, maxY);

  const handleNodeClick = (geviId?: string) => {
    if (geviId) {
      const gevi = gevis.find(g => g.id === geviId);
      if (gevi) {
        onSelectGEVI(gevi);
      }
    }
  };

  // Generate unique gradient IDs
  const uniqueColors = [...new Set(nodes.map(n => n.color))];

  return (
    <div className={`rounded-lg border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onCloseDetail}
          className={`p-1 rounded-md ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title="Close and return"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Genetic Lineage
        </h3>
      </div>

      {/* Scrollable container with fixed height */}
      <div className="overflow-auto border rounded-lg" style={{ height: '500px' }}>
        <svg width={svgWidth} height={svgHeight} className="block">
          <defs>
            {uniqueColors.map((color, i) => (
              <radialGradient key={`v_grad_${i}`} id={`v_node_grad_${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="40%" stopColor={color} />
                <stop offset="100%" stopColor={color} />
              </radialGradient>
            ))}
          </defs>

          {/* Links - vertical curved paths */}
          {links.map((link, i) => (
            <path
              key={`link_${i}`}
              d={`M${link.fromX},${link.fromY}
                  C${link.fromX},${link.fromY + 20}
                   ${link.toX},${link.toY - 20}
                   ${link.toX},${link.toY}`}
              fill="none"
              stroke={darkMode ? '#6b7280' : '#9ca3af'}
              strokeWidth="1.5"
              opacity="0.6"
            />
          ))}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const isLeaf = !!node.geviId;
            const colorIndex = uniqueColors.indexOf(node.color);
            const radius = isLeaf ? 8 : 10;

            return (
              <g
                key={`node_${i}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node.geviId)}
                style={{ cursor: isLeaf ? 'pointer' : 'default' }}
              >
                <circle
                  r={radius}
                  fill={isLeaf ? `url(#v_node_grad_${colorIndex})` : (darkMode ? '#4b5563' : '#d1d5db')}
                  stroke={isLeaf ? '#fff' : (darkMode ? '#6b7280' : '#9ca3af')}
                  strokeWidth={isLeaf ? 1.5 : 1}
                  opacity={isLeaf ? 1 : 0.7}
                  style={{
                    filter: isLeaf ? `drop-shadow(0 0 4px ${node.color})` : 'none',
                  }}
                />
                <text
                  x={0}
                  y={22}
                  textAnchor="middle"
                  className={`text-xs ${darkMode ? 'fill-gray-300' : 'fill-gray-700'}`}
                  style={{ fontSize: '9px', fontWeight: isLeaf ? '600' : '500' }}
                >
                  {node.name}
                </text>
                {node.year && (
                  <text
                    x={0}
                    y={32}
                    textAnchor="middle"
                    className={`text-xs ${darkMode ? 'fill-gray-500' : 'fill-gray-500'}`}
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

      <div className={`mt-4 pt-3 border-t text-xs text-center ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
        Click on nodes to view sensor details
      </div>
    </div>
  );
}

export default FamilyTreePanel;
