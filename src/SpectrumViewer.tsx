// Interactive Spectrum Viewer Component - FPBase style
// Real-time mouse tracking with instant updates

import { useState, useRef, useCallback } from 'react';

interface SpectrumPoint {
  wavelength: number;
  excitation: number;
  emission: number;
}

// Custom spectrum data for GEVIs with measured data
// Note: excitation and emission can have different wavelength ranges
const CUSTOM_SPECTRA: Record<string, { minEx: number; excitation: number[]; minEm: number; emission: number[] }> = {
  'jedi1p': {
    minEx: 350,
    excitation: [0.0518, 0.0483, 0.0730, 0.0772, 0.0641, 0.0747, 0.0827, 0.0804, 0.0898, 0.1037, 0.0996, 0.0988, 0.1013, 0.1029, 0.1261, 0.1109, 0.0996, 0.1197, 0.1108, 0.1105, 0.1244, 0.1386, 0.1423, 0.1501, 0.1558, 0.1674, 0.1539, 0.1683, 0.1729, 0.1834, 0.1913, 0.1979, 0.2078, 0.2144, 0.2157, 0.2085, 0.2259, 0.2402, 0.2374, 0.2511, 0.2595, 0.2571, 0.2610, 0.2621, 0.2635, 0.2761, 0.2758, 0.2763, 0.2908, 0.2801, 0.2867, 0.2933, 0.2977, 0.2967, 0.3054, 0.3014, 0.3160, 0.3194, 0.3239, 0.3205, 0.3207, 0.3160, 0.3245, 0.3274, 0.3267, 0.3198, 0.3459, 0.3391, 0.3394, 0.3447, 0.3571, 0.3638, 0.3682, 0.3658, 0.3836, 0.3719, 0.3769, 0.3814, 0.3726, 0.3746, 0.3797, 0.3915, 0.3872, 0.3913, 0.4029, 0.4052, 0.4255, 0.4262, 0.4376, 0.4547, 0.4544, 0.4455, 0.4662, 0.4754, 0.4819, 0.4931, 0.4934, 0.5132, 0.5111, 0.5358, 0.5468, 0.5586, 0.5724, 0.5951, 0.6104, 0.6302, 0.6590, 0.6717, 0.6928, 0.7305, 0.7339, 0.7437, 0.7798, 0.7620, 0.7677, 0.7973, 0.7983, 0.8066, 0.8264, 0.8337, 0.8375, 0.8414, 0.8331, 0.8489, 0.8424, 0.8545, 0.8805, 0.8577, 0.8884, 0.8989, 0.9162, 0.9535, 0.9584, 0.9579, 0.9824, 0.9921, 0.9988, 1.0000, 0.9892, 0.9751, 0.9496, 0.9553, 0.9248, 0.8983, 0.8866, 0.8786, 0.8387, 0.8069, 0.8134, 0.7555, 0.7200, 0.6852, 0.6418, 0.5927, 0.5552, 0.5300, 0.4896, 0.4302, 0.4146, 0.3774, 0.3457, 0.3116, 0.2926, 0.2492, 0.2211, 0.2021, 0.1729, 0.1508, 0.1303, 0.1129, 0.0911, 0.0811, 0.0684, 0.0590, 0.0467, 0.0501, 0.0507, 0.0397, 0.0400, 0.0389, 0.0319, 0.0313, 0.0318, 0.0332, 0.0299, 0.0539, 0.0377, 0.0396],
    minEm: 460,
    emission: [0.0430, 0.0579, 0.0548, 0.0554, 0.0619, 0.0608, 0.0649, 0.0677, 0.0728, 0.0764, 0.0808, 0.0879, 0.0857, 0.0900, 0.1044, 0.1040, 0.1124, 0.1234, 0.1321, 0.1368, 0.1554, 0.1774, 0.1871, 0.2007, 0.2307, 0.2418, 0.2752, 0.2977, 0.3214, 0.3508, 0.3828, 0.4105, 0.4434, 0.4898, 0.5185, 0.5429, 0.5883, 0.6149, 0.6506, 0.6937, 0.7332, 0.7593, 0.7968, 0.8432, 0.8659, 0.9128, 0.9408, 0.9485, 0.9741, 1.0000, 0.9922, 0.9957, 0.9889, 0.9699, 0.9464, 0.9554, 0.9289, 0.8921, 0.8782, 0.8540, 0.8339, 0.7984, 0.7898, 0.7577, 0.7194, 0.7089, 0.6899, 0.6612, 0.6276, 0.6133, 0.5980, 0.5644, 0.5602, 0.5402, 0.5270, 0.5111, 0.5228, 0.4863, 0.4784, 0.4624, 0.4645, 0.4543, 0.4407, 0.4270, 0.4266, 0.4217, 0.4144, 0.3952, 0.3903, 0.3866, 0.3725, 0.3577, 0.3416, 0.3353, 0.3222, 0.3046, 0.3064, 0.2920, 0.2829, 0.2686, 0.2706, 0.2599, 0.2364, 0.2273, 0.2335, 0.2215, 0.2049, 0.2047, 0.2020, 0.2019, 0.1935, 0.1807, 0.1797, 0.1690, 0.1683, 0.1612, 0.1597, 0.1492, 0.1517, 0.1498, 0.1379, 0.1394, 0.1321, 0.1361, 0.1406, 0.1181, 0.1261, 0.1123, 0.1236, 0.1166, 0.1260, 0.1060, 0.1022, 0.1141, 0.1052, 0.0978, 0.0926, 0.0975, 0.0982, 0.0918, 0.0812, 0.0704, 0.0884, 0.0852, 0.0897, 0.0703, 0.0822, 0.0727, 0.0696, 0.0739, 0.0701, 0.0687, 0.0609, 0.0620, 0.0537, 0.0557, 0.0573, 0.0501, 0.0585, 0.0602, 0.0616, 0.0508, 0.0452, 0.0445, 0.0437, 0.0527, 0.0396, 0.0413, 0.0512, 0.0539, 0.0423, 0.0351, 0.0385, 0.0372, 0.0422, 0.0512, 0.0524, 0.0428, 0.0298, 0.0288, 0.0407, 0.0291, 0.0319, 0.0313, 0.0290, 0.0353, 0.0350, 0.0396]
  }
};

// Generate spectrum data for different protein types
function generateSpectrum(type: 'fp' | 'rhodopsin' | 'nir' | 'fret' | 'redfp', peakEx: number, peakEm: number, geviId?: string): SpectrumPoint[] {
  // Check for custom spectrum data first
  if (geviId && CUSTOM_SPECTRA[geviId]) {
    const custom = CUSTOM_SPECTRA[geviId];
    const data: SpectrumPoint[] = [];
    
    // Use the actual wavelength ranges for excitation and emission
    const minWavelength = Math.min(custom.minEx, custom.minEm);
    const maxWavelength = Math.max(custom.minEx + custom.excitation.length - 1, custom.minEm + custom.emission.length - 1);
    
    for (let w = minWavelength; w <= maxWavelength; w++) {
      // Get excitation value if in range
      let exc = 0;
      if (w >= custom.minEx && w < custom.minEx + custom.excitation.length) {
        exc = custom.excitation[w - custom.minEx];
      }
      
      // Get emission value if in range
      let em = 0;
      if (w >= custom.minEm && w < custom.minEm + custom.emission.length) {
        em = custom.emission[w - custom.minEm];
      }
      
      data.push({ wavelength: w, excitation: exc, emission: em });
    }
    return data;
  }
  
  const data: SpectrumPoint[] = [];
  
  for (let w = 350; w <= 850; w += 1) {
    let ex = 0, em = 0;
    
    if (type === 'fp') {
      // GFP-like spectrum
      const sigmaEx = 30 / 2.355;
      const sigmaEm = 30 / 2.355;
      ex = Math.exp(-Math.pow(w - peakEx, 2) / (2 * sigmaEx * sigmaEx));
      em = Math.exp(-Math.pow(w - peakEm, 2) / (2 * sigmaEm * sigmaEm));
    } else if (type === 'rhodopsin') {
      // Microbial rhodopsin (broad)
      const sigmaEx = 40 / 2.355;
      const sigmaEm = 50 / 2.355;
      ex = Math.exp(-Math.pow(w - peakEx, 2) / (2 * sigmaEx * sigmaEx));
      em = Math.exp(-Math.pow(w - peakEm, 2) / (2 * sigmaEm * sigmaEm));
    } else if (type === 'nir') {
      // Near-infrared phytochrome
      const sigmaEx = 60 / 2.355;
      const sigmaEm = 70 / 2.355;
      ex = Math.exp(-Math.pow(w - peakEx, 2) / (2 * sigmaEx * sigmaEx));
      em = Math.exp(-Math.pow(w - peakEm, 2) / (2 * sigmaEm * sigmaEm));
    } else if (type === 'fret') {
      // FRET (two peaks)
      const sigma1 = 25 / 2.355;
      const sigma2 = 30 / 2.355;
      ex = Math.exp(-Math.pow(w - 440, 2) / (2 * sigma1 * sigma1));
      em = Math.exp(-Math.pow(w - peakEm, 2) / (2 * sigma2 * sigma2));
    } else if (type === 'redfp') {
      // Red fluorescent protein
      const sigmaEx = 35 / 2.355;
      const sigmaEm = 40 / 2.355;
      ex = Math.exp(-Math.pow(w - peakEx, 2) / (2 * sigmaEx * sigmaEx));
      em = Math.exp(-Math.pow(w - peakEm, 2) / (2 * sigmaEm * sigmaEm));
    }
    
    data.push({ wavelength: w, excitation: ex, emission: em });
  }
  
  return data;
}

// GEVI spectrum configurations
const GEVI_SPECTRA: Record<string, { type: 'fp' | 'rhodopsin' | 'nir' | 'fret' | 'redfp'; peakEx: number; peakEm: number; name: string }> = {
  // Opsins
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
  'ace2n': { type: 'rhodopsin', peakEx: 510, peakEm: 540, name: 'Ace2N' },
  'ace2n4aa': { type: 'rhodopsin', peakEx: 510, peakEm: 540, name: 'Ace2N-4AA' },
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
  'asap4': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ASAP4' },
  'asap4s': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ASAP4s' },
  'asap5': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ASAP5' },
  'jedi1p': { type: 'fp', peakEx: 487, peakEm: 509, name: 'JEDI-1P' },
  'jedi2p': { type: 'fp', peakEx: 490, peakEm: 510, name: 'JEDI-2P' },
  'restus': { type: 'fp', peakEx: 490, peakEm: 510, name: 'rEstus' },
  'arclight': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ArcLight' },
  'arclightd': { type: 'fp', peakEx: 490, peakEm: 510, name: 'ArcLight-D' },
  'bongwoori': { type: 'fp', peakEx: 490, peakEm: 510, name: 'Bongwoori' },
  'marina': { type: 'fp', peakEx: 490, peakEm: 510, name: 'Marina' },
  'dragon': { type: 'fp', peakEx: 490, peakEm: 510, name: 'Dragon' },
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
  // HaloTag/Chemigenetic (show as generic fp for now)
  'voltron': { type: 'fp', peakEx: 550, peakEm: 580, name: 'Voltron' },
  'voltron2': { type: 'fp', peakEx: 550, peakEm: 580, name: 'Voltron2' },
};

interface SpectrumViewerProps {
  geviId: string;
  darkMode?: boolean;
}

export function SpectrumViewer({ geviId, darkMode = false }: SpectrumViewerProps) {
  const [hoverWavelength, setHoverWavelength] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const config = GEVI_SPECTRA[geviId];
  
  const isHaloTag = ['voltron', 'voltron2'].includes(geviId);
  
  // Generate spectrum data
  const spectrumData = config ? generateSpectrum(config.type, config.peakEx, config.peakEm, geviId) : null;
  
  // Find values at hover wavelength
  const hoverData = spectrumData?.find(d => d.wavelength === hoverWavelength) || null;
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !spectrumData) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Map x position to wavelength (350-850nm range)
    const minWl = 350;
    const maxWl = 850;
    const wavelength = Math.round(minWl + (x / width) * (maxWl - minWl));
    
    if (wavelength >= minWl && wavelength <= maxWl) {
      setHoverWavelength(wavelength);
    }
  }, [spectrumData]);
  
  const handleMouseLeave = useCallback(() => {
    setHoverWavelength(null);
  }, []);
  
  if (isHaloTag) {
    return (
      <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Excitation/Emission Spectrum
        </h4>
        <div className={`text-sm p-4 text-center rounded ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
          Requires chemical dye staining (HaloTag). See paper for dye options.
        </div>
      </div>
    );
  }
  
  if (!spectrumData || !config) {
    return (
      <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Excitation/Emission Spectrum
        </h4>
        <div className={`text-sm p-4 text-center rounded ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
          Spectrum data not available
        </div>
      </div>
    );
  }
  
  // Chart dimensions
  const width = 500;
  const height = 180;
  const padding = { top: 15, right: 15, bottom: 25, left: 35 };
  
  const minWl = 350;
  const maxWl = 850;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const xScale = (w: number) => padding.left + ((w - minWl) / (maxWl - minWl)) * chartWidth;
  const yScale = (v: number) => padding.top + chartHeight - v * chartHeight;
  
  // Create path
  const createPath = (key: 'excitation' | 'emission') => {
    const points = spectrumData.map(d => {
      const y = key === 'excitation' ? d.excitation : d.emission;
      return `${xScale(d.wavelength)},${yScale(y)}`;
    }).join(' ');
    return `M ${points}`;
  };
  
  // Color gradient for wavelength
  const getWavelengthColor = (w: number): string => {
    if (w < 380) return '#8b5cf6'; // UV/violet
    if (w < 440) return '#a855f7'; // violet
    if (w < 490) return '#3b82f6'; // blue
    if (w < 510) return '#22c55e'; // cyan
    if (w < 580) return '#eab308'; // green-yellow
    if (w < 645) return '#f97316'; // orange-red
    if (w < 780) return '#dc2626'; // red
    return '#7f1d1d'; // far-red
  };
  
  return (
    <div className={`border rounded-lg p-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Spectrum
        </h4>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {config.name}
        </span>
      </div>
      
      {/* Spectrum display */}
      <div 
        ref={containerRef}
        className="relative cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ touchAction: 'none' }}>
          {/* Background gradient bar (wavelength colors) */}
          <defs>
            <linearGradient id="wlGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="10%" stopColor="#a855f7" />
              <stop offset="20%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="60%" stopColor="#f97316" />
              <stop offset="80%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
          </defs>
          
          {/* Wavelength color bar at bottom */}
          <rect 
            x={padding.left} 
            y={height - 8} 
            width={chartWidth} 
            height={6} 
            fill="url(#wlGradient)" 
            rx={2}
          />
          
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((v, i) => (
            <line 
              key={i}
              x1={padding.left} 
              y1={yScale(v)} 
              x2={width - padding.right} 
              y2={yScale(v)} 
              stroke={darkMode ? '#374151' : '#e5e7eb'} 
              strokeWidth="1"
            />
          ))}
          
          {/* X-axis */}
          {[400, 500, 600, 700, 800].map(w => (
            <g key={w}>
              <line 
                x1={xScale(w)} 
                y1={padding.top} 
                x2={xScale(w)} 
                y2={height - 10} 
                stroke={darkMode ? '#4b5563' : '#d1d5db'} 
                strokeWidth="1"
              />
              <text 
                x={xScale(w)} 
                y={height - 12} 
                textAnchor="middle" 
                fontSize="9" 
                fill={darkMode ? '#9ca3af' : '#6b7280'}
              >
                {w}
              </text>
            </g>
          ))}
          
          {/* Y-axis labels */}
          {[0, 50, 100].map(v => (
            <text 
              key={v}
              x={padding.left - 5} 
              y={yScale(v / 100) + 3} 
              textAnchor="end" 
              fontSize="8" 
              fill={darkMode ? '#9ca3af' : '#6b7280'}
            >
              {v}%
            </text>
          ))}
          
          {/* Excitation area */}
          <path 
            d={createPath('excitation') + ` L ${xScale(maxWl)} ${yScale(0)} L ${xScale(minWl)} ${yScale(0)} Z`}
            fill={darkMode ? '#3b82f6' : '#2563eb'} 
            fillOpacity={0.25}
          />
          
          {/* Emission area */}
          <path 
            d={createPath('emission') + ` L ${xScale(maxWl)} ${yScale(0)} L ${xScale(minWl)} ${yScale(0)} Z`}
            fill={darkMode ? '#ef4444' : '#dc2626'} 
            fillOpacity={0.25}
          />
          
          {/* Excitation line */}
          <path 
            d={createPath('excitation')} 
            fill="none" 
            stroke={darkMode ? '#60a5fa' : '#3b82f6'} 
            strokeWidth="2"
          />
          
          {/* Emission line */}
          <path 
            d={createPath('emission')} 
            fill="none" 
            stroke={darkMode ? '#f87171' : '#ef4444'} 
            strokeWidth="2"
          />
          
          {/* Hover line */}
          {hoverWavelength && (
            <g>
              <line 
                x1={xScale(hoverWavelength)} 
                y1={padding.top} 
                x2={xScale(hoverWavelength)} 
                y2={height - 10} 
                stroke={getWavelengthColor(hoverWavelength)} 
                strokeWidth="2"
                strokeOpacity={0.8}
              />
            </g>
          )}
        </svg>
        
        {/* Hover info overlay - FPBase style */}
        <div 
          className="absolute pointer-events-none transition-opacity duration-75"
          style={{
            left: hoverWavelength ? `${((hoverWavelength - minWl) / (maxWl - minWl)) * 100}%` : '0%',
            top: '0',
            transform: 'translateX(-50%)',
            opacity: hoverWavelength ? 1 : 0,
          }}
        >
          <div className={`flex flex-col items-center -mt-1`}>
            <div 
              className="w-3 h-3 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: hoverWavelength ? getWavelengthColor(hoverWavelength) : 'transparent' }}
            />
          </div>
        </div>
      </div>
      
      {/* Data readout - FPBase style */}
      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: darkMode ? '#60a5fa' : '#3b82f6' }} />
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Ex</span>
            </div>
            {hoverData && hoverData.excitation > 0.01 && (
              <span className={`font-mono ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {hoverData.excitation > 0.01 ? `${Math.round(hoverData.excitation * 100)}%` : '--'}
              </span>
            )}
          </div>
          
          {hoverWavelength && (
            <div className={`font-mono font-semibold text-sm`} style={{ color: getWavelengthColor(hoverWavelength) }}>
              {hoverWavelength} nm
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {hoverData && hoverData.emission > 0.01 && (
              <span className={`font-mono ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {hoverData.emission > 0.01 ? `${Math.round(hoverData.emission * 100)}%` : '--'}
              </span>
            )}
            <div className="flex items-center gap-1">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Em</span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: darkMode ? '#f87171' : '#ef4444' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpectrumViewer;
