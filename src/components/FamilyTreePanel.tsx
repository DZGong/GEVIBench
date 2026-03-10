// Interactive Family Tree Panel
// Shows the full GEVI family tree with interactive nodes
// FPbase-style vertical SVG tree (root at top, descendants below)

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import gevisData from '../data.json';
import type { GEVI } from '../types';
import { FAMILY_TREE } from '../FamilyTree';

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
function buildVerticalTree(node: TreeNode, depth: number = 0, parentX: number = 0, parentY: number = 40): {
  nodes: { id: string; name: string; year?: number; x: number; y: number; geviId?: string; color: string; parentX: number; parentY: number }[];
  links: { fromX: number; fromY: number; toX: number; toY: number }[];
  maxY: number;
  width: number;
} {
  const nodes: { id: string; name: string; year?: number; x: number; y: number; geviId?: string; color: string; parentX: number; parentY: number }[] = [];
  const links: { fromX: number; fromY: number; toX: number; toY: number }[] = [];

  const nodeId = node.name.replace(/\s+/g, '_').toLowerCase();
  const isLeaf = !!node.geviId;
  const color = isLeaf ? getGEVIColor(node.name, '') : '#9ca3af';

  const y = parentY;
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
  let totalWidth = 0;

  if (node.children) {
    const childKeys = Object.keys(node.children);

    // First pass: calculate width of each child's subtree
    const childResults = childKeys.map((key) => {
      const childY = parentY + 70;
      const result = buildVerticalTree(node.children![key], depth + 1, 0, childY);
      return { key, result, width: result.width };
    });

    // Calculate spacing - tighter for narrower tree
    const baseWidth = Math.max(5, 8 - depth);
    const childSpacing = baseWidth / Math.max(1, childKeys.length - 1);

    // Calculate total width needed
    totalWidth = childResults.reduce((sum, cr) => sum + cr.width, 0) + (childKeys.length - 1) * 2;

    // Position children
    let currentX = parentX - totalWidth / 2;

    childResults.forEach(({ key, result }) => {
      const childX = currentX + result.width / 2;
      const childY = parentY + 70;

      // Adjust child positions
      const adjustedNodes = result.nodes.map(n => ({
        ...n,
        x: n.x + childX,
        parentX: n.parentX + childX,
      }));

      // Adjust links
      const adjustedLinks = result.links.map(l => ({
        fromX: l.fromX + childX,
        toX: l.toX + childX,
        fromY: l.fromY,
        toY: l.toY,
      }));

      // Add link from parent to first child node
      const firstChildNode = adjustedNodes.find(n => n.y === childY);
      if (firstChildNode) {
        links.push({
          fromX: x,
          fromY: y + 8,
          toX: firstChildNode.x,
          toY: firstChildNode.y - 8,
        });
      }

      nodes.push(...adjustedNodes);
      links.push(...adjustedLinks);
      maxChildY = Math.max(maxChildY, result.maxY);

      currentX += result.width + 5;
    });
  }

  return {
    nodes,
    links,
    maxY: Math.max(y, maxChildY),
    width: Math.max(totalWidth, 30)
  };
}

// Build all branches
function buildAllBranchesVertical() {
  const allNodes: { id: string; name: string; year?: number; x: number; y: number; geviId?: string; color: string; branch: string }[] = [];
  const allLinks: { fromX: number; fromY: number; toX: number; toY: number; branch: string }[] = [];

  const branches = Object.entries(FAMILY_TREE);

  // Calculate positions for each branch first
  const branchWidths: number[] = [];
  branches.forEach(([branchKey, branch]) => {
    const result = buildVerticalTree(branch as TreeNode, 0, 0, 40);
    branchWidths.push(result.width);
  });

  // Calculate total width and starting positions
  const branchGap = 0;
  const totalWidth = branchWidths.reduce((sum, w) => sum + w, 0) + (branches.length - 1) * branchGap;
  let currentX = 0;

  branches.forEach(([branchKey, branch], branchIndex) => {
    const branchCenterX = currentX + branchWidths[branchIndex] / 2;
    const result = buildVerticalTree(branch as TreeNode, 0, branchCenterX, 40);

    // Offset all nodes and links
    result.nodes.forEach(n => {
      allNodes.push({
        ...n,
        x: n.x + currentX,
        parentX: n.parentX + currentX,
        branch: branchKey
      });
    });
    result.links.forEach(l => {
      allLinks.push({
        ...l,
        fromX: l.fromX + currentX,
        toX: l.toX + currentX,
        branch: branchKey
      });
    });

    currentX += branchWidths[branchIndex] + branchGap;
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
  const svgWidth = Math.max(800, maxX);
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
