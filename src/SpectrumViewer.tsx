// Interactive Spectrum Viewer Component - Pure Function
// Real-time mouse tracking with instant updates
// Accepts spectrum data as props - no internal GEVI lookup

import { useState, useRef, useCallback, useMemo } from 'react';

interface SpectrumPoint {
  wavelength: number;
  excitation: number;
  emission: number;
}

interface SpectrumConfig {
  type: 'fp' | 'rhodopsin' | 'nir' | 'fret' | 'redfp';
  peakEx: number;
  peakEm: number;
  name: string;
}

interface CustomSpectrum {
  minEx: number;
  excitation: number[];
  minEm: number;
  emission: number[];
}

export interface SpectrumData {
  config?: SpectrumConfig;
  custom?: CustomSpectrum;
}

interface SpectrumViewerProps {
  spectrumData?: SpectrumData | null;
  geviName?: string;
  darkMode?: boolean;
}

// Generate spectrum data for different protein types
function generateSpectrum(type: 'fp' | 'rhodopsin' | 'nir' | 'fret' | 'redfp', peakEx: number, peakEm: number, custom?: CustomSpectrum): SpectrumPoint[] {
  // Check for custom spectrum data first
  if (custom) {
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

export function SpectrumViewer({ spectrumData, geviName, darkMode = false }: SpectrumViewerProps) {
  const [hoverWavelength, setHoverWavelength] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Support both formats:
  // 1. { config: { type, peakEx, peakEm, name }, custom: {...} } - legacy
  // 2. { type, peakEx, peakEm, name, custom: {...} } - GEVI format
  const spectrumConfig = spectrumData?.config || spectrumData;
  const spectrumCustom = spectrumData?.custom || spectrumData?.custom;

  // Generate spectrum data from props
  const computedSpectrum = useMemo(() => {
    if (!spectrumConfig?.type || !spectrumConfig?.peakEx || !spectrumConfig?.peakEm) return null;
    const { type, peakEx, peakEm } = spectrumConfig;
    return generateSpectrum(type, peakEx, peakEm, spectrumCustom);
  }, [spectrumConfig, spectrumCustom]);

  const config = spectrumConfig;

  // Find values at hover wavelength
  const hoverData = computedSpectrum?.find(d => d.wavelength === hoverWavelength) || null;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !computedSpectrum) return;

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
  }, [computedSpectrum]);

  const handleMouseLeave = useCallback(() => {
    setHoverWavelength(null);
  }, []);

  if (!config || !computedSpectrum) {
    return (
      <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Excitation/Emission Spectrum
        </h4>
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No spectrum data available
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Excitation/Emission Spectrum
        {config.name && <span className="ml-2 font-normal">({config.name})</span>}
      </h4>

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative h-40 cursor-crosshair ${darkMode ? 'bg-gray-900' : 'bg-white'} rounded`}
      >
        {/* Excitation curve */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
          <defs>
            <linearGradient id="exGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={darkMode ? '#3b82f6' : '#2563eb'} stopOpacity="0.6" />
              <stop offset="100%" stopColor={darkMode ? '#3b82f6' : '#2563eb'} stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="emGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={darkMode ? '#22c55e' : '#16a34a'} stopOpacity="0.6" />
              <stop offset="100%" stopColor={darkMode ? '#22c55e' : '#16a34a'} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Excitation area */}
          <path
            d={`M 0 160 ${computedSpectrum.map((d, i) => {
              const x = ((d.wavelength - 350) / 500) * 500;
              const y = 160 - d.excitation * 150;
              return `L ${x} ${y}`;
            }).join(' ')} L 500 160 Z`}
            fill="url(#exGradient)"
          />

          {/* Emission area */}
          <path
            d={`M 0 160 ${computedSpectrum.map((d, i) => {
              const x = ((d.wavelength - 350) / 500) * 500;
              const y = 160 - d.emission * 150;
              return `L ${x} ${y}`;
            }).join(' ')} L 500 160 Z`}
            fill="url(#emGradient)"
          />

          {/* Excitation line */}
          <path
            d={computedSpectrum.map((d, i) => {
              const x = ((d.wavelength - 350) / 500) * 500;
              const y = 160 - d.excitation * 150;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke={darkMode ? '#3b82f6' : '#2563eb'}
            strokeWidth="2"
          />

          {/* Emission line */}
          <path
            d={computedSpectrum.map((d, i) => {
              const x = ((d.wavelength - 350) / 500) * 500;
              const y = 160 - d.emission * 150;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke={darkMode ? '#22c55e' : '#16a34a'}
            strokeWidth="2"
          />

          {/* Hover line */}
          {hoverWavelength && (
            <line
              x1={((hoverWavelength - 350) / 500) * 500}
              y1="0"
              x2={((hoverWavelength - 350) / 500) * 500}
              y2="160"
              stroke={darkMode ? '#f59e0b' : '#d97706'}
              strokeWidth="1"
              strokeDasharray="4"
            />
          )}
        </svg>

        {/* Hover tooltip */}
        {hoverData && (
          <div
            className={`absolute top-1 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs ${
              darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800 shadow'
            }`}
            style={{ pointerEvents: 'none' }}
          >
            {hoverWavelength}nm | Ex: {hoverData.excitation.toFixed(2)} | Em: {hoverData.emission.toFixed(2)}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${darkMode ? 'bg-blue-500' : 'bg-blue-600'}`} />
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Excitation</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${darkMode ? 'bg-green-500' : 'bg-green-600'}`} />
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Emission</span>
        </div>
      </div>

      {/* Peak wavelengths */}
      <div className={`mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        Peak Excitation: {config.peakEx}nm | Peak Emission: {config.peakEm}nm
      </div>
    </div>
  );
}

export default SpectrumViewer;
