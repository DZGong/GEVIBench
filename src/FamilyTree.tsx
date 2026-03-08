// GEVI Family Tree Component
// Shows genetic lineage/relationships for each GEVI

import { useMemo } from 'react';

// Family tree structure - genetic relationships
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

interface FamilyTreeProps {
  geviId: string;
  darkMode?: boolean;
}

export function FamilyTree({ geviId, darkMode = false }: FamilyTreeProps) {
  const path = GEVI_PATHS[geviId];
  
  if (!path) {
    return (
      <div className={`border rounded-lg p-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Family Tree
        </h4>
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Family information not available
        </div>
      </div>
    );
  }
  
  // Build the tree nodes to display
  const renderTree = () => {
    const nodes: { name: string; year?: number; isSelected: boolean; isRoot: boolean }[] = [];
    
    let current: any = FAMILY_TREE;
    
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      const isSelected = i === path.length - 1;
      
      if (current[key]) {
        nodes.push({
          name: current[key].name,
          year: current[key].year,
          isSelected,
          isRoot: i === 0
        });
        if (current[key].children) {
          current = current[key].children;
        }
      }
    }
    
    return nodes;
  };
  
  const treeNodes = renderTree();
  
  return (
    <div className={`border rounded-lg p-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className="space-y-1">
        {treeNodes.map((node, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {/* Connector lines */}
            <div className="flex flex-col items-center" style={{ width: '20px' }}>
              {idx > 0 && (
                <div className={`w-0.5 h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
              )}
              <div 
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  node.isSelected 
                    ? 'bg-blue-500 ring-2 ring-blue-500/30' 
                    : darkMode ? 'bg-gray-500' : 'bg-gray-300'
                }`} 
              />
              {idx < treeNodes.length - 1 && (
                <div className={`w-0.5 flex-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
              )}
            </div>
            
            {/* Node content */}
            <div className={`flex-1 py-0.5 ${node.isSelected ? '' : 'opacity-70'}`}>
              <div className={`text-xs font-medium ${node.isSelected ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-gray-300' : 'text-gray-700')}`}>
                {node.name}
              </div>
              {node.year && (
                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {node.year}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Root category label */}
      <div className={`mt-3 pt-2 border-t text-xs ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
        Category: <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{treeNodes[0]?.name}</span>
      </div>
    </div>
  );
}

export default FamilyTree;
