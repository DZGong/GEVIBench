// Spectrum Viewer Component - Pure Function
// Shows excitation/emission spectrum curves
// Accepts spectrum data as props - no internal GEVI lookup

import { useMemo } from 'react';
import { wavelengthToColor } from './utils';
import { NoteTip, SourceLink } from './components/SourceCitation';

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
  // Optional provenance — rendered as a small caption + note tooltip beneath the panel
  source?: string;
  sourceFigure?: string;
  note?: string;
}

interface SpectrumViewerProps {
  spectrumData?: SpectrumData | null;
  geviName?: string;
  // Bioluminescent/chemiluminescent sensors (e.g. BRET) have no excitation spectrum —
  // when true, the excitation curve, legend entry, peak label, and "modeled" flag are hidden.
  bioluminescent?: boolean;
}

// Generate spectrum data for different protein types.
// `suppressExcitation` is set for bioluminescent/chemiluminescent sensors, which have no
// excitation spectrum at all (light comes from a luciferase reaction, not excitation light):
// excitation is forced to 0 and the wavelength range is based on emission alone.
function generateSpectrum(type: 'fp' | 'rhodopsin' | 'nir' | 'fret' | 'redfp', peakEx: number, peakEm: number, custom?: CustomSpectrum, suppressExcitation = false): SpectrumPoint[] {
  // Check for custom spectrum data first
  if (custom) {
    const data: SpectrumPoint[] = [];

    // Excitation may be measured (custom.excitation). When it is absent, model it as a
    // Gaussian around peakEx so the panel still shows an excitation curve (drawn dashed),
    // while a measured emission curve is kept as-is. Bioluminescent sensors skip excitation
    // entirely.
    const hasEx = !suppressExcitation && custom.minEx != null && custom.excitation != null;
    const sigmaEx = (type === 'fp' ? 30 : type === 'nir' ? 60 : type === 'redfp' ? 35 : type === 'fret' ? 25 : 40) / 2.355;
    const emMin = custom.minEm;
    const emMax = custom.minEm + custom.emission.length - 1;
    const minWavelength = suppressExcitation
      ? emMin
      : hasEx
        ? Math.min(custom.minEx!, emMin)
        : Math.min(emMin, Math.round(peakEx - 4 * sigmaEx));
    const maxWavelength = suppressExcitation
      ? emMax
      : hasEx
        ? Math.max(custom.minEx! + custom.excitation!.length - 1, emMax)
        : Math.max(emMax, Math.round(peakEx + 4 * sigmaEx));

    for (let w = minWavelength; w <= maxWavelength; w++) {
      // Excitation: measured value if available, otherwise a Gaussian model around peakEx
      // (skipped entirely for bioluminescent sensors).
      let exc = 0;
      if (!suppressExcitation) {
        if (hasEx) {
          if (w >= custom.minEx! && w < custom.minEx! + custom.excitation!.length) {
            exc = custom.excitation![w - custom.minEx!];
          }
        } else {
          exc = Math.exp(-Math.pow(w - peakEx, 2) / (2 * sigmaEx * sigmaEx));
        }
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

    data.push({ wavelength: w, excitation: suppressExcitation ? 0 : ex, emission: em });
  }

  return data;
}

export function SpectrumViewer({ spectrumData, geviName, bioluminescent = false }: SpectrumViewerProps) {
  // Support both formats:
  // 1. { config: { type, peakEx, peakEm, name }, custom: {...} } - legacy
  // 2. { type, peakEx, peakEm, name, custom: {...} } - GEVI format
  const spectrumConfig = spectrumData?.config || spectrumData;
  const spectrumCustom = spectrumData?.custom || spectrumData?.custom;

  // Bioluminescent sensors have no excitation spectrum at all — hide the whole excitation curve.
  const showExcitation = !bioluminescent;
  const panelTitle = showExcitation ? 'Excitation/Emission Spectrum' : 'Emission Spectrum';

  // Per-curve modeling. With no `custom` data both curves are Gaussian models. With custom
  // emission but no custom excitation, only the excitation is modeled (drawn dashed) while
  // the measured emission stays solid. Flagged in the UI so a model is never mistaken for data.
  // For bioluminescent sensors excitation is not shown, so it never counts as "modeled".
  const customHasEx = spectrumCustom?.minEx != null && spectrumCustom?.excitation != null;
  const emModeled = !spectrumCustom;
  const exModeled = showExcitation && (!spectrumCustom || !customHasEx);
  const anyModeled = exModeled || emModeled;

  // Generate spectrum data from props
  const computedSpectrum = useMemo(() => {
    if (!spectrumConfig?.type || !spectrumConfig?.peakEx || !spectrumConfig?.peakEm) return null;
    const { type, peakEx, peakEm } = spectrumConfig;
    return generateSpectrum(type, peakEx, peakEm, spectrumCustom, bioluminescent);
  }, [spectrumConfig, spectrumCustom, bioluminescent]);

  const config = spectrumConfig;
  const exColor = config?.peakEx ? wavelengthToColor(config.peakEx) : 'rgb(59,130,246)';
  const emColor = config?.peakEm ? wavelengthToColor(config.peakEm) : 'rgb(34,197,94)';

  // Determine wavelength range for x-axis: fit to the data's lower bound (so a curve
  // truncated at, e.g., 400 nm starts the axis there rather than padding to 350), and
  // extend the upper bound to at least 700 nm.
  const dataMinWl = computedSpectrum?.[0]?.wavelength ?? 350;
  const dataMaxWl = computedSpectrum?.[computedSpectrum.length - 1]?.wavelength ?? 700;
  const minWl = dataMinWl;
  const maxWl = Math.max(700, dataMaxWl);
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
        <h4 className="text-sm font-semibold mb-2 text-ink">
          {panelTitle}
        </h4>
        <div className="text-xs text-ink">
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
      <h4 className="text-sm font-semibold mb-2 text-ink flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>
          {panelTitle}
          {config.name && <span className="ml-2 font-normal">({config.name})</span>}
        </span>
        {anyModeled && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-gold border border-gold/40 bg-gold/10"
            title={emModeled
              ? 'No measured spectrum available — a Gaussian model is shown.'
              : 'Excitation is a Gaussian model; emission is measured.'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            {emModeled ? 'Modeled' : 'Ex. modeled'}
          </span>
        )}
      </h4>

      <div className="relative bg-surface-low rounded">
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

          {/* Excitation area — omitted for bioluminescent sensors (no excitation spectrum) */}
          {showExcitation && (
            <path
              d={`M 0 ${plotBottom} ${computedSpectrum.map((d) => {
                return `L ${toX(d.wavelength)} ${toY(d.excitation)}`;
              }).join(' ')} L ${svgW} ${plotBottom} Z`}
              fill="url(#exGradient)"
            />
          )}

          {/* Emission area */}
          <path
            d={`M 0 ${plotBottom} ${computedSpectrum.map((d) => {
              return `L ${toX(d.wavelength)} ${toY(d.emission)}`;
            }).join(' ')} L ${svgW} ${plotBottom} Z`}
            fill="url(#emGradient)"
          />

          {/* Excitation line — dashed when the curve is a Gaussian model, not measured.
              Omitted for bioluminescent sensors. */}
          {showExcitation && (
            <path
              d={computedSpectrum.map((d, i) => {
                return `${i === 0 ? 'M' : 'L'} ${toX(d.wavelength)} ${toY(d.excitation)}`;
              }).join(' ')}
              fill="none"
              stroke={exColor}
              strokeWidth="2"
              strokeDasharray={exModeled ? '5 3' : undefined}
            />
          )}

          {/* Emission line — dashed when the curve is a Gaussian model, not measured */}
          <path
            d={computedSpectrum.map((d, i) => {
              return `${i === 0 ? 'M' : 'L'} ${toX(d.wavelength)} ${toY(d.emission)}`;
            }).join(' ')}
            fill="none"
            stroke={emColor}
            strokeWidth="2"
            strokeDasharray={emModeled ? '5 3' : undefined}
          />

          {/* X-axis line */}
          <line x1={0} y1={plotBottom} x2={svgW} y2={plotBottom} stroke="#9ca3af" strokeWidth="1" />

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
        {showExcitation && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: exColor }} />
            <span className="text-ink">Excitation</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: emColor }} />
          <span className="text-ink">Emission</span>
        </div>
      </div>

      {/* Peak wavelengths + optional source/note */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-ink">
        <span>
          {showExcitation && <>Peak Excitation: {config.peakEx}nm | </>}Peak Emission: {config.peakEm}nm
        </span>
        {(spectrumData?.source || spectrumData?.note) && (
          <span className="inline-flex items-center gap-1.5">
            <NoteTip note={spectrumData?.note} />
            <SourceLink source={spectrumData?.source} sourceFigure={spectrumData?.sourceFigure} />
          </span>
        )}
      </div>

      {anyModeled && (
        <div className="mt-1.5 text-[10px] text-ink/60 italic leading-snug">
          {emModeled
            ? 'No measured spectrum available — the curve is a Gaussian approximation generated from the peak excitation/emission wavelengths, not experimental data.'
            : 'Emission is measured; the excitation curve is a Gaussian approximation generated from the peak excitation wavelength, not experimental data.'}
        </div>
      )}
    </div>
  );
}

export default SpectrumViewer;
