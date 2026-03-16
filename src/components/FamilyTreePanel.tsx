// Interactive Family Tree Panel
// Shows the full GEVI family tree with interactive nodes
// FPbase-style vertical SVG tree (root at top, descendants below)

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { getAllGEVIs } from '../geviData';
import type { GEVI, TreeNode } from '../types';
import { FAMILY_TREE } from '../FamilyTree';
import { getTreeNodeColor } from '../utils';

// Layout constants
const MIN_NODE_WIDTH = 56;   // minimum horizontal space per leaf node
const SIBLING_GAP = 6;       // gap between sibling subtrees
const LEVEL_HEIGHT = 68;     // vertical distance between levels
const TOP_PADDING = 30;      // top padding for root node
const NODE_RADIUS_LEAF = 8;
const NODE_RADIUS_BRANCH = 5;

interface LayoutNode {
  id: string;
  name: string;
  year?: number;
  x: number;
  y: number;
  geviId?: string;
  color: string;
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
}

// Recursively compute subtree width (bottom-up), then position nodes (top-down)
function layoutTree(node: TreeNode, x: number, y: number): LayoutResult {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];
  const isLeaf = !!node.geviId;
  const color = isLeaf ? getTreeNodeColor(node.name, '') : '#9ca3af';

  // If no children, this is a leaf
  if (!node.children || Object.keys(node.children).length === 0) {
    nodes.push({ id: node.name, name: node.name, year: node.year, x, y, geviId: node.geviId, color });
    return { nodes, links, width: MIN_NODE_WIDTH, maxY: y };
  }

  const childKeys = Object.keys(node.children);

  // First pass: layout each child subtree to get its width
  const childLayouts: { key: string; result: LayoutResult }[] = [];
  for (const key of childKeys) {
    const result = layoutTree(node.children[key], 0, y + LEVEL_HEIGHT);
    childLayouts.push({ key, result });
  }

  // Total width = sum of child widths + gaps between them
  const totalChildWidth = childLayouts.reduce((sum, cl) => sum + cl.result.width, 0)
    + (childLayouts.length - 1) * SIBLING_GAP;
  const treeWidth = Math.max(MIN_NODE_WIDTH, totalChildWidth);

  // Position this node centered above its children
  nodes.push({ id: node.name, name: node.name, year: node.year, x, y, geviId: node.geviId, color });

  // Position children left-to-right, centered under parent
  let childStartX = x - totalChildWidth / 2;
  let maxY = y;

  for (const { result } of childLayouts) {
    const childCenterX = childStartX + result.width / 2;
    const offsetX = childCenterX; // absolute center of this child subtree

    // Shift all child nodes by the offset
    for (const cn of result.nodes) {
      const shiftedX = cn.x + offsetX;
      nodes.push({ ...cn, x: shiftedX });
    }
    for (const cl of result.links) {
      links.push({
        fromX: cl.fromX + offsetX,
        fromY: cl.fromY,
        toX: cl.toX + offsetX,
        toY: cl.toY,
      });
    }

    // Link from parent to the root of this child subtree (first node at child y)
    const childRootNode = result.nodes[0]; // first node is the root of subtree
    links.push({
      fromX: x,
      fromY: y + NODE_RADIUS_BRANCH + 2,
      toX: childRootNode.x + offsetX,
      toY: (y + LEVEL_HEIGHT) - NODE_RADIUS_BRANCH - 2,
    });

    maxY = Math.max(maxY, result.maxY);
    childStartX += result.width + SIBLING_GAP;
  }

  return { nodes, links, width: treeWidth, maxY };
}

// Build the complete tree from FAMILY_TREE (which has a single root "GEVI")
function buildFullTree() {
  const root = FAMILY_TREE['GEVI'];
  if (!root) return { nodes: [] as LayoutNode[], links: [] as LayoutLink[] };

  // Layout starting at center x=0, we'll shift everything to be positive afterwards
  const result = layoutTree(root, 0, TOP_PADDING);

  // Find min X to shift everything into positive coordinates
  const minX = Math.min(...result.nodes.map(n => n.x));
  const padding = 40; // left/right padding

  // Shift all coordinates so minX becomes padding
  const shiftX = -minX + padding;
  const shiftedNodes = result.nodes.map(n => ({ ...n, x: n.x + shiftX }));
  const shiftedLinks = result.links.map(l => ({
    fromX: l.fromX + shiftX,
    toX: l.toX + shiftX,
    fromY: l.fromY,
    toY: l.toY,
  }));

  return { nodes: shiftedNodes, links: shiftedLinks };
}

interface FamilyTreePanelProps {
  darkMode: boolean;
  onSelectGEVI: (gevi: GEVI) => void;
  selectedGEVI: GEVI | null;
  onCloseDetail: () => void;
  compareGEVIs: GEVI[];
  onAddToCompare: (gevi: GEVI) => void;
}

export function FamilyTreePanel({
  darkMode,
  onSelectGEVI,
  onCloseDetail,
}: FamilyTreePanelProps) {
  const gevis = useMemo(() => getAllGEVIs(), []);
  const { nodes, links } = useMemo(() => buildFullTree(), []);

  // Calculate SVG dimensions with enough padding for labels below deepest nodes
  const svgWidth = Math.max(800, Math.max(...nodes.map(n => n.x)) + 80);
  const svgHeight = Math.max(400, Math.max(...nodes.map(n => n.y)) + 50);

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

      {/* Scrollable container - auto height, horizontal scroll only */}
      <div className="overflow-x-auto overflow-y-hidden border rounded-lg">
        <svg width={svgWidth} height={svgHeight} className="block">
          <defs>
            {uniqueColors.map((color, i) => (
              <radialGradient key={`grad_${i}`} id={`tree_grad_${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="40%" stopColor={color} />
                <stop offset="100%" stopColor={color} />
              </radialGradient>
            ))}
          </defs>

          {/* Links - curved paths */}
          {links.map((link, i) => {
            const midY = (link.fromY + link.toY) / 2;
            return (
              <path
                key={`link_${i}`}
                d={`M${link.fromX},${link.fromY} C${link.fromX},${midY} ${link.toX},${midY} ${link.toX},${link.toY}`}
                fill="none"
                stroke={darkMode ? '#4b5563' : '#cbd5e1'}
                strokeWidth="1.5"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const isLeaf = !!node.geviId;
            const isRoot = i === 0 && node.name === 'GEVI';
            const colorIndex = uniqueColors.indexOf(node.color);
            const radius = isRoot ? 10 : isLeaf ? NODE_RADIUS_LEAF : NODE_RADIUS_BRANCH;

            return (
              <g
                key={`node_${i}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node.geviId)}
                style={{ cursor: isLeaf ? 'pointer' : 'default' }}
              >
                {/* Hover target (invisible larger circle for easier clicking) */}
                {isLeaf && (
                  <circle r={16} fill="transparent" />
                )}
                <circle
                  r={radius}
                  fill={isRoot ? (darkMode ? '#60a5fa' : '#3b82f6') : isLeaf ? `url(#tree_grad_${colorIndex})` : (darkMode ? '#4b5563' : '#d1d5db')}
                  stroke={isRoot ? '#fff' : isLeaf ? '#fff' : (darkMode ? '#6b7280' : '#9ca3af')}
                  strokeWidth={isRoot ? 2 : isLeaf ? 1.5 : 1}
                  opacity={1}
                  style={{
                    filter: isRoot ? 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' : isLeaf ? `drop-shadow(0 0 3px ${node.color})` : 'none',
                  }}
                />
                <text
                  x={0}
                  y={isRoot ? -(radius + 4) : isLeaf ? radius + 14 : radius + 12}
                  textAnchor="middle"
                  fill={isRoot ? (darkMode ? '#93c5fd' : '#2563eb') : darkMode ? (isLeaf ? '#e5e7eb' : '#9ca3af') : (isLeaf ? '#374151' : '#6b7280')}
                  style={{ fontSize: isRoot ? '12px' : isLeaf ? '9px' : '10px', fontWeight: isRoot ? '700' : isLeaf ? '600' : '500' }}
                >
                  {node.name}
                </text>
                {node.year && (
                  <text
                    x={0}
                    y={radius + 24}
                    textAnchor="middle"
                    fill={darkMode ? '#6b7280' : '#9ca3af'}
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
