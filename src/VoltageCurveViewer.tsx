// Interactive Voltage Curve Viewer Component - Pure Function
// Shows deltaF/F response vs membrane potential
// Real-time mouse tracking with instant updates
// Accepts voltage data as props - no internal GEVI lookup

import { useState, useRef, useCallback, useMemo } from 'react';
import { getDoiCitationMap } from './geviData';
import { abbreviateFigure } from './components/SourceCitation';

interface VoltagePoint {
  voltage: number;  // mV
  deltaF: number;  // % deltaF/F
}

interface VoltageConfig {
  type: 'opsin' | 'fp' | 'fret' | 'red' | 'chemi';
  slope: number;
  polarity: 'positive' | 'negative';
  name: string;
}

interface VoltageCustom {
  voltage: number[];
  deltaF: number[];
}

interface AdditionalCurve {
  name: string;
  voltage: number[];
  deltaF: number[];
}

export interface VoltageData {
  config?: VoltageConfig;
  custom?: VoltageCustom;
  additionalCurves?: AdditionalCurve[];
  // Inline GEVI format (`voltage` in the JSON): the config fields may appear at the
  // top level instead of nested under `config`. See the format note in VoltageCurveViewer.
  type?: VoltageConfig['type'];
  slope?: number;
  polarity?: VoltageConfig['polarity'];
  name?: string;
  source?: string;
  sourceImage?: string;
  sourceFigure?: string;
}

interface VoltageCurveViewerProps {
  voltageData?: VoltageData | null;
  geviName?: string;
}

// Generate placeholder F-V curve data for different GEVI types
export function generateVoltageCurve(type: 'opsin' | 'fp' | 'fret' | 'red' | 'chemi', slope: number = 10, polarity: 'positive' | 'negative' = 'positive'): VoltagePoint[] {
  const data: VoltagePoint[] = [];

  // Generate curve from -100mV to +40mV (resting to action potential range)
  for (let v = -100; v <= 40; v += 5) {
    let deltaF = 0;

    if (type === 'opsin' || type === 'chemi') {
      // Microbial rhodopsins - typically large signals
      // Sigmoid-like response, scaled to -50% to +30% range
      const midpoint = -20;
      const steepness = 15;
      const maxResponse = polarity === 'positive' ? 28 : -45;
      deltaF = maxResponse / (1 + Math.exp(-(v - midpoint) / steepness));
    } else if (type === 'fp') {
      // FP-based sensors - moderate signals
      const midpoint = -30;
      const steepness = 20;
      const maxResponse = polarity === 'positive' ? 25 : -40;
      deltaF = maxResponse / (1 + Math.exp(-(v - midpoint) / steepness));
    } else if (type === 'fret') {
      // FRET sensors - typically decrease with depolarization (negative)
      const midpoint = -25;
      const steepness = 18;
      const maxResponse = -35;
      deltaF = maxResponse / (1 + Math.exp(-(v - midpoint) / steepness));
    } else {
      // Red FP - moderate response
      const midpoint = -20;
      const steepness = 22;
      const maxResponse = polarity === 'positive' ? 22 : -35;
      deltaF = maxResponse / (1 + Math.exp(-(v - midpoint) / steepness));
    }

    // Clamp to -50% to +30% range
    deltaF = Math.max(-50, Math.min(30, deltaF));

    data.push({ voltage: v, deltaF: Math.round(deltaF * 100) / 100 });
  }

  return data;
}

// Estimate sensitivity (|ΔF/F| over a 100-mV step) directly from a measured curve.
// Used for the caption whenever real custom data exists, so it no longer relies on the
// hand-maintained `slope` field. Reports the steepest 100-mV window across the curve;
// if the curve spans less than 100 mV, falls back to the full ΔF/F range.
export function sensitivityFromCurve(points: VoltagePoint[]): number {
  if (!points.length) return 0;
  const sorted = [...points].sort((a, b) => a.voltage - b.voltage);
  const minV = sorted[0].voltage;
  const maxV = sorted[sorted.length - 1].voltage;

  // Linear interpolation of ΔF/F at an arbitrary voltage, clamped to the data range.
  const interp = (v: number): number => {
    if (v <= minV) return sorted[0].deltaF;
    if (v >= maxV) return sorted[sorted.length - 1].deltaF;
    for (let i = 1; i < sorted.length; i++) {
      if (v <= sorted[i].voltage) {
        const a = sorted[i - 1];
        const b = sorted[i];
        const t = (v - a.voltage) / (b.voltage - a.voltage);
        return a.deltaF + t * (b.deltaF - a.deltaF);
      }
    }
    return sorted[sorted.length - 1].deltaF;
  };

  // Span < 100 mV: best available estimate is the full ΔF/F range.
  if (maxV - minV < 100) {
    const ys = sorted.map(p => p.deltaF);
    return Math.round(Math.abs(Math.max(...ys) - Math.min(...ys)));
  }

  // Otherwise report the steepest 100-mV window.
  let maxStep = 0;
  for (let v = minV; v <= maxV - 100 + 1e-6; v += 1) {
    maxStep = Math.max(maxStep, Math.abs(interp(v + 100) - interp(v)));
  }
  return Math.round(maxStep);
}

export function VoltageCurveViewer({ voltageData, geviName }: VoltageCurveViewerProps) {
  const [hoverVoltage, setHoverVoltage] = useState<number | null>(null);
  const [insetExpanded, setInsetExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Support both formats:
  // 1. { config: {...}, custom: {...} } - legacy
  // 2. { type, slope, polarity, name, custom: {...} } - GEVI format
  const voltageConfig = voltageData?.config || voltageData;
  const voltageCustom = voltageData?.custom;
  const additionalCurves = (voltageData as any)?.additionalCurves as AdditionalCurve[] | undefined;

  // Generate voltage curve data from props
  const computedVoltage = useMemo(() => {
    // Prefer custom data if available
    if (voltageCustom?.voltage?.length && voltageCustom?.deltaF?.length) {
      return voltageCustom.voltage.map((v, i) => ({ voltage: v, deltaF: voltageCustom.deltaF[i] }));
    }
    if (!voltageConfig?.type || !voltageConfig?.slope || !voltageConfig?.polarity) return null;
    const { type, slope, polarity } = voltageConfig;
    return generateVoltageCurve(type, slope, polarity);
  }, [voltageConfig, voltageCustom]);

  // Compute additional curves (for chemigenetic GEVIs with multiple dyes)
  const computedAdditional = useMemo(() => {
    if (!additionalCurves?.length) return [];
    return additionalCurves.map(c => ({
      name: c.name,
      points: c.voltage.map((v, i) => ({ voltage: v, deltaF: c.deltaF[i] })),
    }));
  }, [additionalCurves]);

  const config = voltageConfig;

  // Dynamic voltage range based on actual data (include additional curves)
  const allPoints = [
    ...(computedVoltage || []),
    ...computedAdditional.flatMap(c => c.points),
  ];
  const dataMinV = allPoints.length ? Math.min(...allPoints.map(d => d.voltage)) : -100;
  const dataMaxV = allPoints.length ? Math.max(...allPoints.map(d => d.voltage)) : 40;

  // Find values at hover voltage
  const hoverData = computedVoltage?.reduce((closest, d) => {
    if (hoverVoltage === null) return null;
    if (!closest) return d;
    return Math.abs(d.voltage - hoverVoltage) < Math.abs(closest.voltage - hoverVoltage) ? d : closest;
  }, null as VoltagePoint | null) || null;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !computedVoltage) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Map x position to actual voltage range
    const voltage = Math.round(dataMinV + (x / width) * (dataMaxV - dataMinV));

    if (voltage >= dataMinV && voltage <= dataMaxV) {
      setHoverVoltage(voltage);
    }
  }, [computedVoltage, dataMinV, dataMaxV]);

  const handleMouseLeave = useCallback(() => {
    setHoverVoltage(null);
  }, []);

  // Chart dimensions - larger for better visibility
  const width = 600;
  const height = 280;
  const padding = { top: 25, right: 25, bottom: 40, left: 55 };

  // Pick a "nice" tick step (1, 2, or 5 × power of 10) for a given range and target tick count
  const niceStep = (range: number, target: number): number => {
    if (range <= 0) return 1;
    const raw = range / target;
    const exp = Math.floor(Math.log10(raw));
    const mag = Math.pow(10, exp);
    const norm = raw / mag;
    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return nice * mag;
  };

  const rawMinDeltaF = allPoints.length ? Math.min(...allPoints.map(d => d.deltaF)) : -50;
  const rawMaxDeltaF = allPoints.length ? Math.max(...allPoints.map(d => d.deltaF)) : 30;

  // Snap chart bounds to round multiples of the chosen step so ticks fall on data-aligned values
  const xStep = niceStep(dataMaxV - dataMinV, 7);
  const yStep = niceStep((rawMaxDeltaF - rawMinDeltaF) || 10, 6);
  const minV = Math.floor(dataMinV / xStep) * xStep;
  const maxV = Math.ceil(dataMaxV / xStep) * xStep;
  const minDeltaF = Math.floor(rawMinDeltaF / yStep) * yStep;
  const maxDeltaF = Math.ceil(rawMaxDeltaF / yStep) * yStep;

  // Generate tick arrays at the chosen step
  const buildTicks = (lo: number, hi: number, step: number): number[] => {
    const ticks: number[] = [];
    for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Math.round(v / step) * step);
    return ticks;
  };
  const xTicks = buildTicks(minV, maxV, xStep);
  const yTicks = buildTicks(minDeltaF, maxDeltaF, yStep);

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (v: number) => padding.left + ((v - minV) / (maxV - minV)) * chartWidth;
  const yScale = (d: number) => padding.top + chartHeight - ((d - minDeltaF) / (maxDeltaF - minDeltaF)) * chartHeight;

  // Create smooth path
  const createPath = () => {
    if (!computedVoltage) return '';
    const points = computedVoltage.map(d => {
      return `${xScale(d.voltage)},${yScale(d.deltaF)}`;
    }).join(' ');
    return `M ${points}`;
  };

  // Map dye/fluorophore wavelength to a display color
  const getWavelengthColor = (name: string): string | null => {
    const m = name.match(/\b(?:JF|AF)(\d{3})\b/i);
    if (!m) return null;
    const wl = parseInt(m[1]);
    if (wl <= 530) return '#16a34a'; // green
    if (wl <= 560) return '#ca8a04'; // yellow
    if (wl <= 600) return '#ea580c'; // orange
    return '#dc2626'; // red
  };

  const primaryColor = '#002FA7'; // klein blue

  // Get color based on polarity
  const getResponseColor = (deltaF: number) => {
    if (deltaF > 0) return '#16a34a'; // green for positive
    if (deltaF < 0) return '#dc2626'; // red for negative
    return '#6b7280'; // gray for zero
  };

  // Sensitivity (% |ΔF/F| per 100 mV). Prefer the measured curve; fall back to the
  // legacy `slope` field only when a GEVI has no custom data.
  const sensitivity = useMemo(() => {
    if (voltageCustom?.voltage?.length && computedVoltage?.length) {
      return sensitivityFromCurve(computedVoltage);
    }
    return config ? Math.abs(config.slope) : 15;
  }, [voltageCustom, computedVoltage, config]);

  if (!config || !computedVoltage) {
    return (
      <div className="border rounded-lg p-4 bg-surface-low border-ink/10">
        <div className="text-xs text-ink">
          No voltage curve data available
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-surface-low border-ink/10">
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative cursor-crosshair bg-surface-low rounded"
      >
        <svg className="w-full block" viewBox={`0 0 ${width} ${height}`}>
          {/* Grid lines - aligned to data-step Y ticks */}
          {yTicks.map(v => (
            <line
              key={`grid-${v}`}
              x1={padding.left}
              y1={yScale(v)}
              x2={width - padding.right}
              y2={yScale(v)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          {/* X-axis labels - aligned to data step */}
          {xTicks.map(v => (
            <text
              key={`x-${v}`}
              x={xScale(v)}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fill="#1c1c19"
            >
              {v}
            </text>
          ))}
          {/* Y-axis labels - aligned to data step */}
          {yTicks.map(v => (
            <text
              key={`y-${v}`}
              x={padding.left - 8}
              y={yScale(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#1c1c19"
            >
              {v}%
            </text>
          ))}
          {/* Zero line - only if 0 is within the y-axis range */}
          {minDeltaF <= 0 && maxDeltaF >= 0 && (
            <line
              x1={padding.left}
              y1={yScale(0)}
              x2={width - padding.right}
              y2={yScale(0)}
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="4"
            />
          )}
          {/* Voltage curve - primary */}
          <path
            d={createPath()}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2"
          />
          {/* Data points - primary curve */}
          {computedVoltage && computedVoltage.map((d, i) => (
            <circle
              key={i}
              cx={xScale(d.voltage)}
              cy={yScale(d.deltaF)}
              r="4"
              fill={primaryColor}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          ))}
          {/* Additional curves (e.g., different dyes for chemigenetic GEVIs) */}
          {computedAdditional.map((curve, ci) => {
            const fallbackColors = ['#d97706', '#7c3aed', '#0891b2', '#db2777'];
            const color = getWavelengthColor(curve.name) || fallbackColors[ci % fallbackColors.length];
            const path = 'M ' + curve.points.map(d => `${xScale(d.voltage)},${yScale(d.deltaF)}`).join(' ');
            return (
              <g key={`additional-${ci}`}>
                <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="6 3" />
                {curve.points.map((d, i) => (
                  <circle
                    key={i}
                    cx={xScale(d.voltage)}
                    cy={yScale(d.deltaF)}
                    r="3"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                ))}
              </g>
            );
          })}
          {/* Hover point */}
          {hoverData && (
            <circle
              cx={xScale(hoverData.voltage)}
              cy={yScale(hoverData.deltaF)}
              r="6"
              fill={primaryColor}
              stroke="white"
              strokeWidth="2"
            />
          )}
        </svg>

        {/* Source figure inset — positive-going: bottom-right, negative-going: top-right */}
        {voltageData?.sourceImage && (
          <button
            onClick={() => setInsetExpanded(true)}
            className="absolute border border-ink/20 rounded shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden"
            title={`View source: ${voltageData.sourceFigure || 'Original figure'}`}
            style={{
              width: '18%',
              aspectRatio: '105/75',
              right: '1%',
              ...(config.polarity === 'negative' ? { top: '12%' } : { bottom: '18%' }),
            }}
          >
            <img
              src={voltageData.sourceImage}
              alt="Source figure"
              className="w-full h-full object-cover"
            />
          </button>
        )}

        {/* Hover tooltip */}
        {hoverData && (
          <div
            className="absolute top-1 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs bg-surface-low text-ink shadow"
            style={{ pointerEvents: 'none' }}
          >
            {hoverData.voltage}mV | {hoverData.deltaF.toFixed(2)}% ΔF/F
          </div>
        )}

      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-1 text-xs">
        <span className="text-ink">Membrane Potential (mV)</span>
        <span className="text-ink">ΔF/F (%)</span>
      </div>

      {/* Legend for multiple curves */}
      {computedAdditional.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink">
          <span className="flex items-center gap-1">
            <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={primaryColor} strokeWidth="2" /></svg>
            {config.name}
          </span>
          {computedAdditional.map((curve, ci) => {
            const fallbackColors = ['#d97706', '#7c3aed', '#0891b2', '#db2777'];
            const color = getWavelengthColor(curve.name) || fallbackColors[ci % fallbackColors.length];
            return (
              <span key={ci} className="flex items-center gap-1">
                <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth="1.5" strokeDasharray="4 2" /></svg>
                {curve.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Sensitivity */}
      <div className="mt-2 text-xs text-ink">
        Sensitivity: ~{sensitivity}% per 100mV | Response: {config.polarity === 'positive' ? 'Positive (↑ depolarization = ↑ fluorescence)' : 'Negative (↑ depolarization = ↓ fluorescence)'}
      </div>

      {/* Source */}
      {voltageData?.source && (() => {
        const source = voltageData.source!;
        const doi = source.startsWith('doi:') ? source.slice(4) : null;
        const citationMap = getDoiCitationMap();
        const label = doi ? (citationMap[doi] || source) : source;
        const url = doi ? `https://doi.org/${doi}` : null;
        return (
          <div className="mt-1 text-[10px] text-ink/50">
            Source:{' '}
            {url
              ? <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline text-klein">{label}</a>
              : <span>{label}</span>
            }
            {voltageData.sourceFigure && <span> — {abbreviateFigure(voltageData.sourceFigure)}</span>}
          </div>
        );
      })()}

      {/* Expanded lightbox */}
      {insetExpanded && voltageData?.sourceImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setInsetExpanded(false)}
        >
          <div className="relative max-w-lg" onClick={e => e.stopPropagation()}>
            <img
              src={voltageData.sourceImage}
              alt={`Source: ${voltageData.sourceFigure || 'Original figure'}`}
              className="rounded-lg shadow-xl max-h-[80vh]"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-3 py-1.5 rounded-b-lg">
              {voltageData.sourceFigure ? abbreviateFigure(voltageData.sourceFigure) : 'Source figure'}
              {voltageData.source && (() => {
                const doi = voltageData.source!.startsWith('doi:') ? voltageData.source!.slice(4) : null;
                return doi ? (
                  <> — <a href={`https://doi.org/${doi}`} target="_blank" rel="noopener noreferrer" className="underline text-blue-300">{doi}</a></>
                ) : null;
              })()}
            </div>
            <button
              onClick={() => setInsetExpanded(false)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-white text-black rounded-full text-xs font-bold shadow flex items-center justify-center"
            >×</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoltageCurveViewer;
