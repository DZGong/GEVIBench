// GEVI Family Tree Component
// Shows genetic lineage/relationships for each GEVI

import { useMemo } from 'react';

// Family tree structure - genetic relationships
const FAMILY_TREE = {
  'Ion-channel': {
    name: 'Ion-channel based',
    children: {
      'Flash': { name: 'FlaSh', year: 1997 },
      'VSFP1': { name: 'VSFP1', year: 2001 },
      'SPARC': { name: 'SPARC', year: 2002 },
    }
  },
  'VSD-FRET': {
    name: 'Ci-VSP FRET-based',
    children: {
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
          'asap4': { name: 'ASAP4', year: 2022 },
          'asap4s': { name: 'ASAP4s', year: 2022 },
          'asap5': { name: 'ASAP5', year: 2024 },
          'JEDI': {
            name: 'JEDI lineage',
            children: {
              'jedi2p': { name: 'JEDI-2P', year: 2022 },
              'jedi1p': { name: 'JEDI-1P', year: 2023 },
            }
          },
          'restus': { name: 'rEstus', year: 2024 },
        }
      }
    }
  },
  'Opsin': {
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
      }
    }
  },
  'eFRET': {
    name: 'Opsin-FRET',
    children: {
      'macq': { name: 'MacQ', year: 2014 },
      'ace1': { name: 'Ace1', year: 2014 },
      'ace2n': { name: 'Ace2N', year: 2015 },
      'ace2n4aa': { name: 'Ace2N-4AA', year: 2018 },
      'varnam': { name: 'VARNAM', year: 2018 },
      'positron': { name: 'Positron', year: 2020 },
    }
  },
  'Chemigenetic': {
    name: 'Chemigenetic',
    children: {
      'voltron': { name: 'Voltron', year: 2018 },
      'voltron2': { name: 'Voltron2', year: 2023 },
    }
  },
  'Red FP GEVI': {
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
    }
  }
};

// Map GEVI IDs to their tree path
const GEVI_PATHS: Record<string, string[]> = {
  'vsfp1': ['Ion-channel', 'VSFP1'],
  'vsfp2': ['VSD-FRET', 'VSFP2', 'VSFP2'],
  'vsfp2_3': ['VSD-FRET', 'VSFP2', 'VSFP2.3'],
  'mermaid': ['VSD-FRET', 'VSFP2', 'Mermaid'],
  'vsfpbutterfly': ['VSD-FRET', 'VSFP2', 'Butterfly'],
  'nirbutterfly': ['VSD-FRET', 'VSFP2', 'nirButterfly'],
  'arclight': ['VSD-single', 'ArcLight', 'arclight'],
  'arclightd': ['VSD-single', 'ArcLight', 'arclightd'],
  'bongwoori': ['VSD-single', 'ArcLight', 'Bongwoori'],
  'marina': ['VSD-single', 'ArcLight', 'Marina'],
  'asap1': ['VSD-cpGFP', 'ASAP', 'asap1'],
  'asap2s': ['VSD-cpGFP', 'ASAP', 'asap2s'],
  'asap3': ['VSD-cpGFP', 'ASAP', 'asap3'],
  'asap4': ['VSD-cpGFP', 'ASAP', 'asap4'],
  'asap4s': ['VSD-cpGFP', 'ASAP', 'asap4s'],
  'asap5': ['VSD-cpGFP', 'ASAP', 'asap5'],
  'jedi2p': ['VSD-cpGFP', 'ASAP', 'JEDI', 'jedi2p'],
  'jedi1p': ['VSD-cpGFP', 'ASAP', 'JEDI', 'jedi1p'],
  'restus': ['VSD-cpGFP', 'ASAP', 'restus'],
  'props': ['Opsin', 'PROPS'],
  'archer1': ['Opsin', 'Arch', 'archer1'],
  'quasar1': ['Opsin', 'Arch', 'QuasAr', 'quasar1'],
  'quasar2': ['Opsin', 'Arch', 'QuasAr', 'quasar2'],
  'quasar3': ['Opsin', 'Arch', 'QuasAr', 'quasar3'],
  'quasar6': ['Opsin', 'Arch', 'QuasAr', 'quasar6'],
  'archon1': ['Opsin', 'Arch', 'Archon', 'archon1'],
  'archon2': ['Opsin', 'Arch', 'Archon', 'archon2'],
  'archon3': ['Opsin', 'Arch', 'Archon', 'archon3'],
  'somarchon': ['Opsin', 'Arch', 'Archon', 'somarchon'],
  'rho1': ['Opsin', 'Arch', 'rho1'],
  'electric': ['Opsin', 'Arch', 'electric'],
  'pado': ['Opsin', 'Arch', 'pado'],
  'macq': ['eFRET', 'macq'],
  'ace1': ['eFRET', 'ace1'],
  'ace2n': ['eFRET', 'ace2n'],
  'ace2n4aa': ['eFRET', 'ace2n4aa'],
  'varnam': ['eFRET', 'varnam'],
  'positron': ['eFRET', 'positron'],
  'voltron': ['Chemigenetic', 'voltron'],
  'voltron2': ['Chemigenetic', 'voltron2'],
  'flicr1': ['Red FP GEVI', 'flicr1'],
  'lotusv': ['Bioluminescent', 'lotusv'],
  'amber': ['Bioluminescent', 'amber'],
  'dragon': ['VSD-cpGFP', 'ASAP', 'dragon'],
  'synth': ['VSD-cpGFP', 'ASAP', 'synth'],
  'probedb': ['VSD-cpGFP', 'ASAP', 'probedb'],
  'nir': ['Opsin', 'Arch', 'nir'],
  'nir2': ['Opsin', 'Arch', 'nir2'],
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
      <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Genetic Lineage
      </h4>
      
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
