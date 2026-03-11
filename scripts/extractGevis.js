// Script to extract individual GEVI JSON files from data.json
// Run with: node scripts/extractGevis.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data.json'), 'utf-8'));
const GEVI_PATHS = {
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

const outputDir = path.join(__dirname, '../../src/gevis');

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Extract each GEVI to its own file
data.forEach((gevi) => {
  const geviWithPath = {
    ...gevi,
    familyTreePath: GEVI_PATHS[gevi.id] || null
  };

  const filename = path.join(outputDir, `${gevi.id}.json`);
  fs.writeFileSync(filename, JSON.stringify(geviWithPath, null, 2));
  console.log(`Created: ${filename}`);
});

console.log(`\nExtracted ${data.length} GEVIs to ${outputDir}`);
