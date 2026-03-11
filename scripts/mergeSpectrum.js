// Script to merge spectrum data into each GEVI JSON file
// Run with: node scripts/mergeSpectrum.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gevisDir = path.join(__dirname, '../src/gevis');
const spectrumDir = path.join(__dirname, '../src/data/spectrum');

// Spectrum data to merge
const SPECTRA = {
  'archon1': { type: 'rhodopsin', peakEx: 550, peakEm: 580, name: 'Archon1' },
  'archon2': { type: 'rhodopsin', peakEx: 550, peakEm: 580, name: 'Archon2' },
  'archon3': { type: 'rhodopsin', peakEx: 560, peakEm: 590, name: 'Archon3' },
  'quasar1': { type: 'rhodopsin', peakEx: 590, peakEm: 650, name: 'QuasAr1' },
  'quasar2': { type: 'rhodopsin', peakEx: 590, peakEm: 650, name: 'QuasAr2' },
  'quasar3': { type: 'rhodopsin', peakEx: 600, peakEm: 680, name: 'paQuasAr3' },
  'quasar6': { type: 'rhodopsin', peakEx: 610, peakEm: 690, name: 'QuasAr6' },
  'somarchon': { type: 'rhodopsin', peakEx: 560, peakEm: 590, name: 'SomArchon' },
  'props': { type: 'rhodopsin', peakEx: 530, peakEm: 560, name: 'PROPS' },
  'archer1': { type: 'rhodopsin', peakEx: 550, peakEm: 580, name: 'Archer1' },
  'ace1': { type: 'rhodopsin', peakEx: 510, peakEm: 540, name: 'Ace1' },
  'ace2n-mneon': { type: 'rhodopsin', peakEx: 510, peakEm: 540, name: 'Ace2N' },
  'ace2n-mneon2': { type: 'rhodopsin', peakEx: 510, peakEm: 540, name: 'Ace2N' },
  'macq': { type: 'rhodopsin', peakEx: 510, peakEm: 540, name: 'MacQ' },
  'varnam': { type: 'rhodopsin', peakEx: 550, peakEm: 600, name: 'VARNAM' },
  'positron': { type: 'rhodopsin', peakEx: 550, peakEm: 580, name: 'Positron' },
  'rho1': { type: 'rhodopsin', peakEx: 540, peakEm: 570, name: 'Rho1' },
  'electric': { type: 'rhodopsin', peakEx: 550, peakEm: 580, name: 'Electric' },
  'pado': { type: 'rhodopsin', peakEx: 560, peakEm: 590, name: 'Pado' },
  // FP-based
  'asap1': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ASAP1' },
  'asap2s': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ASAP2s' },
  'asap3': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ASAP3' },
  'asap4b': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ASAP4b' },
  'asap4e': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ASAP4e' },
  'asap5': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ASAP5' },
  'jedi1p': { type: 'fp', peakEx: 487, peakEm: 509, name: 'JEDI-1P' },
  'jedi2p': { type: 'fp', peakEx: 490, peakEm: 510, name: 'JEDI-2P' },
  'restus': { type: 'fp', peakEx: 490, peakEm: 510, name: 'rEstus' },
  'arclight': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ArcLight' },
  'arclightd': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ArcLight-D' },
  'bongwoori': { type: 'fp', peakEx: 490, peakEm: 510, name: 'Bongwoori' },
  'marina': { type: 'fp', peakEx: 490, peakEm: 510, name: 'Marina' },
  'synth': { type: 'fp', peakEx: 490, peakEm: 510, name: 'Synth' },
  'probedb': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ProbeDB' },
  'lotusv': { type: 'fp', peakEx: 490, peakEm: 510, name: 'LOTUS-V' },
  'amber': { type: 'fp', peakEx: 490, peakEm: 510, name: 'AMBER' },
  // FRET
  'vsfp1': { type: 'fret', peakEx: 440, peakEm: 530, name: 'VSFP1' },
  'vsfp2': { type: 'fret', peakEx: 440, peakEm: 530, name: 'VSFP2' },
  'vsfp2_3': { type: 'fret', peakEx: 440, peakEm: 530, name: 'VSFP2.3' },
  'chivsfp': { type: 'fret', peakEx: 440, peakEm: 530, name: 'chi-VSFP' },
  'butterfly': { type: 'fret', peakEx: 440, peakEm: 530, name: 'VSFP-Butterfly' },
  'vsfpbutterfly': { type: 'fret', peakEx: 440, peakEm: 530, name: 'VSFP-Butterfly' },
  'nirbutterfly': { type: 'nir', peakEx: 680, peakEm: 710, name: 'nirButterfly' },
  'mermaid': { type: 'fret', peakEx: 440, peakEm: 530, name: 'Mermaid' },
  // Red FP
  'flicr1': { type: 'redfp', peakEx: 550, peakEm: 600, name: 'FlicR1' },
  // NIR
  'nir': { type: 'nir', peakEx: 680, peakEm: 710, name: 'NIR-GEV1' },
  'nir2': { type: 'nir', peakEx: 700, peakEm: 730, name: 'NIR-GEV2' },
  // HaloTag/Chemigenetic
  'voltron': { type: 'fp', peakEx: 550, peakEm: 580, name: 'Voltron' },
  'voltron2': { type: 'fp', peakEx: 550, peakEm: 580, name: 'Voltron2' },
  'hviplus': { type: 'fp', peakEx: 550, peakEm: 580, name: 'HVI+' },
  'solaris': { type: 'fp', peakEx: 550, peakEm: 580, name: 'Solaris' },
};

// Custom spectrum for JEDI-1P
const CUSTOM_SPECTRA = {
  'jedi1p': {
    minEx: 350,
    excitation: [0.0518, 0.0483, 0.0730, 0.0772, 0.0641, 0.0747, 0.0827, 0.0804, 0.0898, 0.1037, 0.0996, 0.0988, 0.1013, 0.1029, 0.1261, 0.1109, 0.0996, 0.1197, 0.1108, 0.1105, 0.1244, 0.1386, 0.1423, 0.1501, 0.1558, 0.1674, 0.1539, 0.1683, 0.1729, 0.1834, 0.1913, 0.1979, 0.2078, 0.2144, 0.2157, 0.2085, 0.2259, 0.2402, 0.2374, 0.2511, 0.2595, 0.2571, 0.2610, 0.2621, 0.2635, 0.2761, 0.2758, 0.2763, 0.2908, 0.2801, 0.2867, 0.2933, 0.2977, 0.2967, 0.3054, 0.3014, 0.3160, 0.3194, 0.3239, 0.3205, 0.3207, 0.3160, 0.3245, 0.3274, 0.3267, 0.3198, 0.3459, 0.3391, 0.3394, 0.3447, 0.3571, 0.3638, 0.3682, 0.3658, 0.3836, 0.3719, 0.3769, 0.3814, 0.3726, 0.3746, 0.3797, 0.3915, 0.3872, 0.3913, 0.4029, 0.4052, 0.4255, 0.4262, 0.4376, 0.4547, 0.4544, 0.4455, 0.4662, 0.4754, 0.4819, 0.4931, 0.4934, 0.5132, 0.5111, 0.5358, 0.5468, 0.5586, 0.5724, 0.5951, 0.6104, 0.6302, 0.6590, 0.6717, 0.6928, 0.7305, 0.7339, 0.7437, 0.7798, 0.7620, 0.7677, 0.7973, 0.7983, 0.8066, 0.8264, 0.8337, 0.8375, 0.8414, 0.8331, 0.8489, 0.8424, 0.8545, 0.8805, 0.8577, 0.8884, 0.8989, 0.9162, 0.9535, 0.9584, 0.9579, 0.9824, 0.9921, 0.9988, 1.0000, 0.9892, 0.9751, 0.9496, 0.9553, 0.9248, 0.8983, 0.8866, 0.8786, 0.8387, 0.8069, 0.8134, 0.7555, 0.7200, 0.6852, 0.6418, 0.5927, 0.5552, 0.5300, 0.4896, 0.4302, 0.4146, 0.3774, 0.3457, 0.3116, 0.2926, 0.2492, 0.2211, 0.2021, 0.1729, 0.1508, 0.1303, 0.1129, 0.0911, 0.0811, 0.0684, 0.0590, 0.0467, 0.0501, 0.0507, 0.0397, 0.0400, 0.0389, 0.0319, 0.0313, 0.0318, 0.0332, 0.0299, 0.0539, 0.0377, 0.0396],
    minEm: 460,
    emission: [0.0430, 0.0579, 0.0548, 0.0554, 0.0619, 0.0608, 0.0649, 0.0677, 0.0728, 0.0764, 0.0808, 0.0879, 0.0857, 0.0900, 0.1044, 0.1040, 0.1124, 0.1234, 0.1321, 0.1368, 0.1554, 0.1774, 0.1871, 0.2007, 0.2307, 0.2418, 0.2752, 0.2977, 0.3214, 0.3508, 0.3828, 0.4105, 0.4434, 0.4898, 0.5185, 0.5429, 0.5883, 0.6149, 0.6506, 0.6937, 0.7332, 0.7593, 0.7968, 0.8432, 0.8659, 0.9128, 0.9408, 0.9485, 0.9741, 1.0000, 0.9922, 0.9957, 0.9889, 0.9699, 0.9464, 0.9554, 0.9289, 0.8921, 0.8782, 0.8540, 0.8339, 0.7984, 0.7898, 0.7577, 0.7194, 0.7089, 0.6899, 0.6612, 0.6276, 0.6133, 0.5980, 0.5644, 0.5602, 0.5402, 0.5270, 0.5111, 0.5228, 0.4863, 0.4784, 0.4624, 0.4645, 0.4543, 0.4407, 0.4270, 0.4266, 0.4217, 0.4144, 0.3952, 0.3903, 0.3866, 0.3725, 0.3577, 0.3416, 0.3353, 0.3222, 0.3046, 0.3064, 0.2920, 0.2829, 0.2686, 0.2706, 0.2599, 0.2364, 0.2273, 0.2335, 0.2215, 0.2049, 0.2047, 0.2020, 0.2019, 0.1935, 0.1807, 0.1797, 0.1690, 0.1683, 0.1612, 0.1597, 0.1492, 0.1517, 0.1498, 0.1379, 0.1394, 0.1321, 0.1361, 0.1406, 0.1181, 0.1261, 0.1123, 0.1236, 0.1166, 0.1260, 0.1060, 0.1022, 0.1141, 0.1052, 0.0978, 0.0926, 0.0975, 0.0982, 0.0918, 0.0812, 0.0704, 0.0884, 0.0852, 0.0897, 0.0703, 0.0822, 0.0727, 0.0696, 0.0739, 0.0701, 0.0687, 0.0609, 0.0620, 0.0537, 0.0557, 0.0573, 0.0501, 0.0585, 0.0602, 0.0616, 0.0508, 0.0452, 0.0445, 0.0437, 0.0527, 0.0396, 0.0413, 0.0512, 0.0539, 0.0423, 0.0351, 0.0385, 0.0372, 0.0422, 0.0512, 0.0524, 0.0428, 0.0298, 0.0288, 0.0407, 0.0291, 0.0319, 0.0313, 0.0290, 0.0353, 0.0350, 0.0396]
  }
};

// Get all GEVI files
const files = fs.readdirSync(gevisDir).filter(f => f.endsWith('.json'));

let merged = 0;
files.forEach(file => {
  const geviId = file.replace('.json', '');
  const spectrum = SPECTRA[geviId];

  if (spectrum) {
    const geviPath = path.join(gevisDir, file);
    const gevi = JSON.parse(fs.readFileSync(geviPath, 'utf-8'));

    // Add spectrum data
    gevi.spectrum = { ...spectrum };

    // Add custom spectrum if available
    if (CUSTOM_SPECTRA[geviId]) {
      gevi.spectrum.custom = CUSTOM_SPECTRA[geviId];
    }

    fs.writeFileSync(geviPath, JSON.stringify(gevi, null, 2));
    merged++;
    console.log(`Merged spectrum into ${file}`);
  }
});

console.log(`\nMerged spectrum data into ${merged} GEVI files`);

// Delete separate spectrum files
const spectrumFiles = fs.readdirSync(spectrumDir);
spectrumFiles.forEach(file => {
  fs.unlinkSync(path.join(spectrumDir, file));
  console.log(`Deleted ${file}`);
});

console.log('\nDone! Spectrum data is now embedded in each GEVI file.');
