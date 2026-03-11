// Script to merge voltage data into each GEVI JSON file
// Run with: node scripts/mergeVoltage.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gevisDir = path.join(__dirname, '../src/gevis');

// Voltage data to merge
const VOLTAGE_DATA = {
  // Opsins (positive response, large signal)
  'archon1': { type: 'opsin', slope: 35, polarity: 'positive', name: 'Archon1' },
  'archon2': { type: 'opsin', slope: 38, polarity: 'positive', name: 'Archon2' },
  'archon3': { type: 'opsin', slope: 40, polarity: 'positive', name: 'Archon3' },
  'quasar1': { type: 'opsin', slope: 25, polarity: 'positive', name: 'QuasAr1' },
  'quasar2': { type: 'opsin', slope: 28, polarity: 'positive', name: 'QuasAr2' },
  'quasar3': { type: 'opsin', slope: 22, polarity: 'positive', name: 'paQuasAr3' },
  'quasar6': { type: 'opsin', slope: 20, polarity: 'positive', name: 'QuasAr6' },
  'somarchon': { type: 'opsin', slope: 32, polarity: 'positive', name: 'SomArchon' },
  'props': { type: 'opsin', slope: 30, polarity: 'positive', name: 'PROPS' },
  'archer1': { type: 'opsin', slope: 28, polarity: 'positive', name: 'Archer1' },
  'ace1': { type: 'opsin', slope: 15, polarity: 'positive', name: 'Ace1' },
  'ace2n-mneon': { type: 'opsin', slope: 18, polarity: 'positive', name: 'Ace2N' },
  'ace2n-mneon2': { type: 'opsin', slope: 18, polarity: 'positive', name: 'Ace2N' },
  'macq': { type: 'opsin', slope: 14, polarity: 'positive', name: 'MacQ' },
  'varnam': { type: 'opsin', slope: 12, polarity: 'positive', name: 'VARNAM' },
  'positron': { type: 'opsin', slope: 20, polarity: 'positive', name: 'Positron' },
  'rho1': { type: 'opsin', slope: 22, polarity: 'positive', name: 'Rho1' },
  'electric': { type: 'opsin', slope: 18, polarity: 'positive', name: 'Electric' },
  'pado': { type: 'opsin', slope: 16, polarity: 'positive', name: 'Pado' },
  // FP-based (typically negative response)
  'asap1': { type: 'fp', slope: 15, polarity: 'negative', name: 'ASAP1' },
  'asap2s': { type: 'fp', slope: 18, polarity: 'negative', name: 'ASAP2s' },
  'asap3': { type: 'fp', slope: 12, polarity: 'negative', name: 'ASAP3' },
  'asap4b': { type: 'fp', slope: 20, polarity: 'negative', name: 'ASAP4b' },
  'asap4e': { type: 'fp', slope: 20, polarity: 'negative', name: 'ASAP4e' },
  'asap5': { type: 'fp', slope: 14, polarity: 'negative', name: 'ASAP5' },
  'jedi1p': { type: 'fp', slope: 10, polarity: 'positive', name: 'JEDI-1P' },
  'jedi2p': { type: 'fp', slope: 12, polarity: 'positive', name: 'JEDI-2P' },
  'restus': { type: 'fp', slope: 15, polarity: 'positive', name: 'rEstus' },
  'arclight': { type: 'fp', slope: 20, polarity: 'negative', name: 'ArcLight' },
  'arclightd': { type: 'fp', slope: 18, polarity: 'negative', name: 'ArcLight-D' },
  'bongwoori': { type: 'fp', slope: 12, polarity: 'negative', name: 'Bongwoori' },
  'marina': { type: 'fp', slope: 8, polarity: 'positive', name: 'Marina' },
  'synth': { type: 'fp', slope: 14, polarity: 'positive', name: 'Synth' },
  'probedb': { type: 'fp', slope: 11, polarity: 'positive', name: 'ProbeDB' },
  'lotusv': { type: 'fp', slope: 9, polarity: 'positive', name: 'LOTUS-V' },
  'amber': { type: 'fp', slope: 8, polarity: 'positive', name: 'AMBER' },
  // FRET (typically negative)
  'vsfp1': { type: 'fret', slope: 12, polarity: 'negative', name: 'VSFP1' },
  'vsfp2': { type: 'fret', slope: 15, polarity: 'negative', name: 'VSFP2' },
  'vsfp2_3': { type: 'fret', slope: 18, polarity: 'negative', name: 'VSFP2.3' },
  'chivsfp': { type: 'fret', slope: 16, polarity: 'negative', name: 'chi-VSFP' },
  'butterfly': { type: 'fret', slope: 14, polarity: 'negative', name: 'VSFP-Butterfly' },
  'vsfpbutterfly': { type: 'fret', slope: 14, polarity: 'negative', name: 'VSFP-Butterfly' },
  'nirbutterfly': { type: 'red', slope: 10, polarity: 'negative', name: 'nirButterfly' },
  'mermaid': { type: 'fret', slope: 12, polarity: 'negative', name: 'Mermaid' },
  // Red FP
  'flicr1': { type: 'red', slope: 12, polarity: 'positive', name: 'FlicR1' },
  // NIR
  'nir': { type: 'red', slope: 8, polarity: 'positive', name: 'NIR-GEV1' },
  'nir2': { type: 'red', slope: 7, polarity: 'positive', name: 'NIR-GEV2' },
  // Chemigenetic
  'voltron': { type: 'chemi', slope: 25, polarity: 'positive', name: 'Voltron' },
  'voltron2': { type: 'chemi', slope: 28, polarity: 'positive', name: 'Voltron2' },
  'hviplus': { type: 'chemi', slope: 25, polarity: 'positive', name: 'HVI+' },
  'solaris': { type: 'chemi', slope: 30, polarity: 'positive', name: 'Solaris' },
};

// Get all GEVI files
const files = fs.readdirSync(gevisDir).filter(f => f.endsWith('.json'));

let merged = 0;
files.forEach(file => {
  const geviId = file.replace('.json', '');
  const voltage = VOLTAGE_DATA[geviId];

  if (voltage) {
    const geviPath = path.join(gevisDir, file);
    const gevi = JSON.parse(fs.readFileSync(geviPath, 'utf-8'));

    // Add voltage data
    gevi.voltage = voltage;

    fs.writeFileSync(geviPath, JSON.stringify(gevi, null, 2));
    merged++;
    console.log(`Merged voltage into ${file}`);
  } else {
    console.log(`No voltage data for ${file}`);
  }
});

console.log(`\nMerged voltage data into ${merged} GEVI files`);
console.log('Done! Voltage data is now embedded in each GEVI file.');
