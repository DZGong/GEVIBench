// Spectrum Viewer Component - Pure Function
// Shows excitation/emission spectrum curves
// Accepts spectrum data as props - no internal GEVI lookup

import { useMemo } from 'react';
import { wavelengthToColor } from './utils';

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
  minEx?: number;
  excitation?: number[];
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
}

// Generate spectrum data for different protein types
function generateSpectrum(type: 'fp' | 'rhodopsin' | 'nir' | 'fret' | 'redfp', peakEx: number, peakEm: number, custom?: CustomSpectrum): SpectrumPoint[] {
  // Check for custom spectrum data first
  if (custom) {
    const data: SpectrumPoint[] = [];

    // Use the actual wavelength ranges for excitation and emission
    const hasEx = custom.minEx != null && custom.excitation != null;
    const minWavelength = hasEx ? Math.min(custom.minEx!, custom.minEm) : custom.minEm;
    const maxWavelength = hasEx
      ? Math.max(custom.minEx! + custom.excitation!.length - 1, custom.minEm + custom.emission.length - 1)
      : custom.minEm + custom.emission.length - 1;

    for (let w = minWavelength; w <= maxWavelength; w++) {
      // Get excitation value if in range
      let exc = 0;
      if (hasEx && w >= custom.minEx! && w < custom.minEx! + custom.excitation!.length) {
        exc = custom.excitation![w - custom.minEx!];
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

export function SpectrumViewer({ spectrumData, geviName }: SpectrumViewerProps) {
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
  const exColor = config?.peakEx ? wavelengthToColor(config.peakEx) : 'rgb(59,130,246)';
  const emColor = config?.peakEm ? wavelengthToColor(config.peakEm) : 'rgb(34,197,94)';

  // Determine wavelength range for x-axis labels
  const minWl = computedSpectrum?.[0]?.wavelength ?? 350;
  const maxWl = computedSpectrum?.[computedSpectrum.length - 1]?.wavelength ?? 850;
  const wlRange = maxWl - minWl;

  // Generate ~6 evenly spaced x-axis tick values, rounded to nearest 50
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = Math.max(50, Math.round(wlRange / 6 / 50) * 50);
    const start = Math.ceil(minWl / step) * step;
    for (let v = start; v <= maxWl; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [minWl, maxWl, wlRange]);

  if (!config || !computedSpectrum) {
    return (
      <div className="border rounded-lg p-4 bg-surface-low border-ink/10">
        <h4 className="text-sm font-semibold mb-2 text-ink/70">
          Excitation/Emission Spectrum
        </h4>
        <div className="text-xs text-ink/40">
          No spectrum data available
        </div>
      </div>
    );
  }

  // SVG dimensions with padding for x-axis labels
  const svgW = 500;
  const svgH = 180;
  const plotTop = 0;
  const plotBottom = 155;
  const plotH = plotBottom - plotTop;

  const toX = (wl: number) => ((wl - minWl) / wlRange) * svgW;
  const toY = (val: number) => plotBottom - val * (plotH - 5);

  return (
    <div className="border rounded-lg p-4 bg-surface-low border-ink/10">
      <h4 className="text-sm font-semibold mb-2 text-ink/70">
        Excitation/Emission Spectrum
        {config.name && <span className="ml-2 font-normal">({config.name})</span>}
      </h4>

      <div className="relative bg-surface rounded">
        <svg className="w-full block" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="exGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={exColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={exColor} stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="emGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={emColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={emColor} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Excitation area */}
          <path
            d={`M 0 ${plotBottom} ${computedSpectrum.map((d) => {
              return `L ${toX(d.wavelength)} ${toY(d.excitation)}`;
            }).join(' ')} L ${svgW} ${plotBottom} Z`}
            fill="url(#exGradient)"
          />

          {/* Emission area */}
          <path
            d={`M 0 ${plotBottom} ${computedSpectrum.map((d) => {
              return `L ${toX(d.wavelength)} ${toY(d.emission)}`;
            }).join(' ')} L ${svgW} ${plotBottom} Z`}
            fill="url(#emGradient)"
          />

          {/* Excitation line */}
          <path
            d={computedSpectrum.map((d, i) => {
              return `${i === 0 ? 'M' : 'L'} ${toX(d.wavelength)} ${toY(d.excitation)}`;
            }).join(' ')}
            fill="none"
            stroke={exColor}
            strokeWidth="2"
          />

          {/* Emission line */}
          <path
            d={computedSpectrum.map((d, i) => {
              return `${i === 0 ? 'M' : 'L'} ${toX(d.wavelength)} ${toY(d.emission)}`;
            }).join(' ')}
            fill="none"
            stroke={emColor}
            strokeWidth="2"
          />

          {/* X-axis wavelength labels */}
          {xTicks.map(wl => (
            <g key={wl}>
              <line x1={toX(wl)} y1={plotBottom} x2={toX(wl)} y2={plotBottom + 4} stroke="#9ca3af" strokeWidth="1" />
              <text x={toX(wl)} y={svgH - 2} textAnchor="middle" fontSize="10" fill="#6b7280">{wl}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: exColor }} />
          <span className="text-ink/60">Excitation</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: emColor }} />
          <span className="text-ink/60">Emission</span>
        </div>
      </div>

      {/* Peak wavelengths */}
      <div className="mt-2 text-xs text-ink/40">
        Peak Excitation: {config.peakEx}nm | Peak Emission: {config.peakEm}nm
      </div>
    </div>
  );
}

export default SpectrumViewer;
