// GEVI Family Tree Component
// Shows genetic lineage/relationships for each GEVI
// FPbase-style vertical SVG tree (root at top, descendants below)

import { useMemo } from 'react';

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

// Build tree data structure from FAMILY_TREE
interface TreeNode {
  name: string;
  year?: number;
  children?: Record<string, TreeNode>;
  geviId?: string;
}

export const FAMILY_TREE = {
  'GEVI': {
    name: 'GEVI',
    children: {
      'VSD': {
        name: 'VSD Based',
        children: {
          'VSD-FRET': {
            name: 'Ci-VSP FRET-based',
            children: {
              'VSFP1': {
                name: 'VSFP1',
                year: 2001,
                geviId: 'vsfp1',
                children: {
                  'VSFP2': {
                    name: 'VSFP2',
                    year: 2007,
                    geviId: 'vsfp2',
                    children: {
                      'VSFP2.3': { name: 'VSFP2.3', year: 2009, geviId: 'vsfp2_3' },
                      'Mermaid': { name: 'Mermaid', year: 2008, geviId: 'mermaid' },
                      'Butterfly': {
                        name: 'VSFP-Butterfly',
                        year: 2010,
                        geviId: 'vsfpbutterfly',
                        children: {
                          'nirButterfly': { name: 'nirButterfly', year: 2018, geviId: 'nirbutterfly' },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
          'VSD-single': {
            name: 'VSD-cpGFP',
            children: {
              'ArcLight': {
                name: 'ArcLight lineage',
                children: {
                  'arclight': { name: 'ArcLight', year: 2012, geviId: 'arclight' },
                  'arclightd': { name: 'ArcLight-D', year: 2015, geviId: 'arclightd' },
                  'Bongwoori': { name: 'Bongwoori', year: 2017, geviId: 'bongwoori' },
                  'Marina': { name: 'Marina', year: 2017, geviId: 'marina' },
                }
              },
              'ASAP': {
                name: 'ASAP lineage',
                children: {
                  'asap1': {
                    name: 'ASAP1',
                    year: 2014,
                    geviId: 'asap1',
                    children: {
                      'asap2s': {
                        name: 'ASAP2s',
                        year: 2017,
                        geviId: 'asap2s',
                        children: {
                          'asap3': {
                            name: 'ASAP3',
                            year: 2019,
                            geviId: 'asap3',
                            children: {
                              'asap4e': {
                                name: 'ASAP4e',
                                year: 2022,
                                geviId: 'asap4e',
                                children: {
                                  'asap5': { name: 'ASAP5', year: 2024, geviId: 'asap5' },
                                }
                              },
                              'asap4b': { name: 'ASAP4b', year: 2022, geviId: 'asap4b' },
                            }
                          }
                        }
                      }
                    }
                  },
                  'JEDI': {
                    name: 'JEDI lineage',
                    children: {
                      'jedi2p': {
                        name: 'JEDI-2P',
                        year: 2022,
                        geviId: 'jedi2p',
                        children: {
                          'jedi1p': { name: 'JEDI-1P', year: 2023, geviId: 'jedi1p' },
                        }
                      },
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
                      'quasar1': {
                        name: 'QuasAr1',
                        year: 2014,
                        geviId: 'quasar1',
                        children: {
                          'quasar2': {
                            name: 'QuasAr2',
                            year: 2014,
                            geviId: 'quasar2',
                            children: {
                              'quasar3': { name: 'paQuasAr3', year: 2019, geviId: 'quasar3' },
                              'quasar6': { name: 'QuasAr6', year: 2022, geviId: 'quasar6' },
                            }
                          },
                        }
                      },
                    }
                  },
                  'Archon': {
                    name: 'Archon lineage',
                    children: {
                      'archon1': {
                        name: 'Archon1',
                        year: 2018,
                        geviId: 'archon1',
                        children: {
                          'archon2': {
                            name: 'Archon2',
                            year: 2018,
                            geviId: 'archon2',
                            children: {
                              'archon3': { name: 'Archon3', year: 2019, geviId: 'archon3' },
                            }
                          },
                        }
                      },
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
                  'nir': {
                    name: 'NIR',
                    year: 2016,
                    geviId: 'nir',
                    children: {
                      'nir2': { name: 'NIR2', year: 2018, geviId: 'nir2' },
                    }
                  },
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
          'Chemigenetic': {
            name: 'Chemigenetic',
            children: {
              'voltron': {
                name: 'Voltron',
                year: 2018,
                geviId: 'voltron',
                children: {
                  'voltron2': { name: 'Voltron2', year: 2023, geviId: 'voltron2' },
                }
              },
              'hviplus': { name: 'HVIplus', year: 2023, geviId: 'hviplus' },
            }
          },
        }
      },
      'Others': {
        name: 'Others',
        children: {
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
      },
    }
  }
};

// Map GEVI IDs to their tree path
const GEVI_PATHS: Record<string, string[]> = {
  // VSD Based
  'vsfp1': ['GEVI', 'VSD', 'VSD-FRET', 'VSFP1'],
  'vsfp2': ['GEVI', 'VSD', 'VSD-FRET', 'VSFP1', 'VSFP2'],
  'vsfp2_3': ['GEVI', 'VSD', 'VSD-FRET', 'VSFP1', 'VSFP2', 'VSFP2.3'],
  'mermaid': ['GEVI', 'VSD', 'VSD-FRET', 'VSFP1', 'VSFP2', 'Mermaid'],
  'vsfpbutterfly': ['GEVI', 'VSD', 'VSD-FRET', 'VSFP2', 'Butterfly'],
  'nirbutterfly': ['GEVI', 'VSD', 'VSD-FRET', 'VSFP2', 'Butterfly', 'nirButterfly'],
  'arclight': ['GEVI', 'VSD', 'VSD-single', 'ArcLight', 'arclight'],
  'arclightd': ['GEVI', 'VSD', 'VSD-single', 'ArcLight', 'arclightd'],
  'bongwoori': ['GEVI', 'VSD', 'VSD-single', 'ArcLight', 'Bongwoori'],
  'marina': ['GEVI', 'VSD', 'VSD-single', 'ArcLight', 'Marina'],
  'asap1': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'asap1'],
  'asap2s': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'asap1', 'asap2s'],
  'asap3': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'asap1', 'asap2s', 'asap3'],
  'asap4b': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'asap1', 'asap2s', 'asap3','asap4b'],
  'asap4e': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'asap1', 'asap2s', 'asap3','asap4e'],
  'asap5': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'asap1', 'asap2s', 'asap3','asap4e', 'asap5'],
  'jedi2p': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'JEDI', 'jedi2p'],
  'jedi1p': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'JEDI', 'jedi2p', 'jedi1p'],
  'restus': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'restus'],
  'synth': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'synth'],
  'probedb': ['GEVI', 'VSD', 'VSD-single', 'ASAP', 'probedb'],
  'chivsfp': ['GEVI', 'VSD', 'VSD-single', 'chiVSD', 'chivsfp'],

  // Opsin Based - Fluorescent
  'props': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'PROPS'],
  'archer1': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'archer1'],
  'quasar1': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'QuasAr', 'quasar1'],
  'quasar2': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'QuasAr', 'quasar1', 'quasar2'],
  'quasar3': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'QuasAr', 'quasar1', 'quasar2', 'quasar3'],
  'quasar6': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'QuasAr', 'quasar1', 'quasar2', 'quasar6'],
  'archon1': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'Archon', 'archon1'],
  'archon2': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'Archon', 'archon1', 'archon2'],
  'archon3': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'Archon', 'archon1', 'archon2', 'archon3'],
  'somarchon': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'Archon', 'somarchon'],
  'rho1': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'rho1'],
  'electric': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'electric'],
  'pado': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'Arch', 'pado'],
  'nir': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'NIR', 'nir'],
  'nir2': ['GEVI', 'Opsin', 'Opsin-Fluorescent', 'NIR', 'nir', 'nir2'],

  // Opsin Based - FRET
  'macq': ['GEVI', 'Opsin', 'Opsin-FRET', 'macq'],
  'ace1': ['GEVI', 'Opsin', 'Opsin-FRET', 'ace1'],
  'ace2n-mneon': ['GEVI', 'Opsin', 'Opsin-FRET', 'ace2n', 'ace2n-mneon'],
  'ace2n-mneon2': ['GEVI', 'Opsin', 'Opsin-FRET', 'ace2n', 'ace2n-mneon2'],
  'varnam': ['GEVI', 'Opsin', 'Opsin-FRET', 'varnam'],
  'positron': ['GEVI', 'Opsin', 'Opsin-FRET', 'positron'],
  'voltron': ['GEVI', 'Opsin', 'Chemigenetic', 'voltron'],
  'voltron2': ['GEVI', 'Opsin', 'Chemigenetic', 'voltron', 'voltron2'],
  'hviplus': ['GEVI', 'Opsin', 'Chemigenetic', 'hviplus'],

  // Others

  'flicr1': ['GEVI', 'Others', 'Red FP', 'flicr1'],
  'lotusv': ['GEVI', 'Others', 'Bioluminescent', 'lotusv'],
  'amber': ['GEVI', 'Others', 'Bioluminescent', 'amber'],
  'solaris': ['GEVI', 'Others', 'Bioluminescent', 'solaris'],
};

interface FamilyTreeProps {
  geviId: string;
  darkMode?: boolean;
}

export function FamilyTree({ geviId, darkMode = false }: FamilyTreeProps) {
  const path = GEVI_PATHS[geviId];

  if (!path) {
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

  // Build the path nodes
  const pathNodes: { name: string; year?: number; isSelected: boolean; category: string }[] = [];

  let current: any = FAMILY_TREE;

  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    const isSelected = i === path.length - 1;

    if (current[key]) {
      pathNodes.push({
        name: current[key].name,
        year: current[key].year,
        isSelected,
        category: key,
      });
      if (current[key].children) {
        current = current[key].children;
      }
    }
  }

  // Vertical layout: root at top, children below
  const nodeSpacing = 80; // vertical spacing
  const svgHeight = pathNodes.length * nodeSpacing + 50;
  const svgWidth = 180;

  // Generate gradient IDs based on node names
  const gradients = pathNodes.map((node, i) => ({
    id: `v_gradient_${i}`,
    color: getGEVIColor(node.name, node.category),
  }));

  return (
    <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Genetic Lineage
      </h4>

      <div className="overflow-auto">
        <svg width={svgWidth} height={svgHeight} className="mx-auto">
          <defs>
            {gradients.map((g, i) => (
              <linearGradient key={g.id} id={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#000" />
                <stop offset="50%" stopColor={g.color} />
                <stop offset="100%" stopColor={g.color} />
              </linearGradient>
            ))}
          </defs>

          {/* Links (vertical curved paths) */}
          {pathNodes.slice(0, -1).map((node, i) => (
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

          {/* Nodes (vertical) */}
          {pathNodes.map((node, i) => {
            const color = getGEVIColor(node.name, node.category);
            const isSelected = node.isSelected;
            const radius = isSelected ? 12 : 8;
            const y = i * nodeSpacing + 25;

            return (
              <g key={`v_node_${i}`} transform={`translate(${svgWidth / 2}, ${y})`}>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <circle
                    r={radius}
                    fill={`url(#v_gradient_${i})`}
                    stroke={isSelected ? '#fff' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                    style={{ filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'none' }}
                  />
                </a>
                <text
                  x={0}
                  y={-20}
                  textAnchor="middle"
                  className={`text-xs ${isSelected ? 'font-bold' : ''} ${darkMode ? 'fill-white' : 'fill-gray-700'}`}
                  style={{ fontSize: '11px' }}
                >
                  {node.name}
                </text>
                {node.year && (
                  <text
                    x={0}
                    y={-8}
                    textAnchor="middle"
                    className={`text-xs ${darkMode ? 'fill-gray-400' : 'fill-gray-400'}`}
                    style={{ fontSize: '9px' }}
                  >
                    ({node.year})
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Category label */}
      <div className={`mt-3 pt-2 border-t text-xs text-center ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
        <span className="font-medium">Category:</span>{' '}
        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{pathNodes[0]?.name}</span>
      </div>
    </div>
  );
}

export default FamilyTree;
