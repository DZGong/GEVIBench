import { Trash2, GitCompare, X } from 'lucide-react';
import React, { useState, useRef, useCallback } from 'react';
import { generateVoltageCurve } from '../VoltageCurveViewer';
import { DistributionRadar } from './DistributionRadar';
import { COMPARE_COLORS as COLORS } from '../constants';

interface ComparisonProps {
  compareGEVIs: any[];
  onRemove: (id: string) => void;
  showEmpty?: boolean;
  onClose?: () => void;
  /**
   * The raw values for the selection, as the site's own `GEVIList` narrowed to the compared
   * sensors. The panel used to rebuild that table column for column with its own formatters,
   * which drifted from the real one; passing the component in means there is a single
   * definition of what a sensor row looks like.
   */
  table: React.ReactNode;
}

export function ComparisonPanel({ compareGEVIs, onRemove, showEmpty = false, onClose, table }: ComparisonProps) {
  // Show empty state when no GEVIs selected and showEmpty is true
  if (compareGEVIs.length === 0) {
    if (!showEmpty) return null;

    return (
      <div id="compare-panel" className="border-2 rounded-lg p-4 md:p-6 mb-6 bg-surface-lowest border-gold/40 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-ink">
            <GitCompare className="w-5 h-5" />Compare Sensors (0)
          </h3>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-surface-low text-ink/50">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-ink/50">
          <GitCompare className="w-12 h-12 mb-4 text-ink/30" />
          <p className="text-center">
            No sensors selected for comparison.
          </p>
          <p className="text-sm mt-2 text-ink/40">
            Click the <span className="font-semibold">Compare</span> button on any sensor to add it to the comparison.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="compare-panel" className="border-2 rounded-lg p-4 md:p-6 mb-6 bg-surface-lowest border-gold/40 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-ink">
          <GitCompare className="w-5 h-5" />Compare Sensors ({compareGEVIs.length})
        </h3>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-low text-ink/50">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Selected GEVIs — also the legend for both charts, since the colors are shared. */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {compareGEVIs.map((gevi, idx) => (
          <div key={gevi.id} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg bg-surface-low">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
            <span className="text-sm font-medium text-ink/70">{gevi.name}</span>
            <button
              onClick={() => onRemove(gevi.id)}
              className="p-1 rounded text-ink/40 hover:text-red-600"
              title={`Remove ${gevi.name} from comparison`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-lg overflow-x-auto bg-surface-lowest border border-ink/10">{table}</div>

      {/* Charts side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* F-V Curve Comparison */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-ink/70">ΔF/F - Voltage Curve</h4>
          <FVCurveCompare compareGEVIs={compareGEVIs} COLORS={COLORS} />
        </div>

        {/* Performance Profile (raw-data radar) */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-ink/70">Performance Profile</h4>
          <div className="border rounded-lg p-3 bg-surface-low border-ink/10">
            <div className="h-64">
              <DistributionRadar
                gevis={compareGEVIs}
                colors={compareGEVIs.map((_, idx) => COLORS[idx % COLORS.length])}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// F-V Curve Comparison Component
function FVCurveCompare({ compareGEVIs, COLORS }: { compareGEVIs: any[]; COLORS: string[] }) {
  const [hoverVoltage, setHoverVoltage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const width = 500;
  const height = 256;
  const padding = { top: 15, right: 15, bottom: 30, left: 45 };

  // Generate curve data for each GEVI, preferring custom data
  const getVoltageData = (gevi: any) => {
    const config = gevi.voltage;
    if (config?.custom?.voltage?.length && config?.custom?.deltaF?.length) {
      return config.custom.voltage.map((v: number, i: number) => ({ voltage: v, deltaF: config.custom.deltaF[i] }));
    }
    if (config?.type && config?.slope && config?.polarity) {
      return generateVoltageCurve(config.type, config.slope, config.polarity);
    }
    return generateVoltageCurve('fp');
  };

  // Pre-compute voltage data for all GEVIs
  const allVoltageData = compareGEVIs.map(gevi => ({
    gevi,
    data: getVoltageData(gevi)
  }));

  // Auto-scale X axis from data with padding
  const allVoltages = allVoltageData.flatMap(({ data }) => data.map(d => d.voltage));
  const vDataMin = Math.min(...allVoltages);
  const vDataMax = Math.max(...allVoltages);
  const xPad = Math.max(5, (vDataMax - vDataMin) * 0.05);
  const xRawRange = vDataMax - vDataMin + 2 * xPad;
  const xStep = xRawRange <= 40 ? 10 : xRawRange <= 100 ? 20 : xRawRange <= 200 ? 40 : 50;
  const minV = Math.floor((vDataMin - xPad) / xStep) * xStep;
  const maxV = Math.ceil((vDataMax + xPad) / xStep) * xStep;

  const xTicks: number[] = [];
  for (let v = minV; v <= maxV; v += xStep) {
    xTicks.push(v);
  }
  if (minV < 0 && maxV > 0 && !xTicks.includes(0)) {
    xTicks.push(0);
    xTicks.sort((a, b) => a - b);
  }

  // Auto-scale Y axis from data with 10% padding
  const allDeltaF = allVoltageData.flatMap(({ data }) => data.map(d => d.deltaF));
  const dataMin = Math.min(...allDeltaF);
  const dataMax = Math.max(...allDeltaF);
  const yPad = Math.max(5, (dataMax - dataMin) * 0.1);
  // Round to nearest nice step (multiples of 5, 10, 25, 50...)
  const rawRange = dataMax - dataMin + 2 * yPad;
  const yStep = rawRange <= 20 ? 5 : rawRange <= 50 ? 10 : rawRange <= 100 ? 25 : 50;
  const minDeltaF = Math.floor((dataMin - yPad) / yStep) * yStep;
  const maxDeltaF = Math.ceil((dataMax + yPad) / yStep) * yStep;

  // Generate Y-axis ticks
  const yTicks: number[] = [];
  for (let v = minDeltaF; v <= maxDeltaF; v += yStep) {
    yTicks.push(v);
  }
  // Always include 0 if within range
  if (minDeltaF < 0 && maxDeltaF > 0 && !yTicks.includes(0)) {
    yTicks.push(0);
    yTicks.sort((a, b) => a - b);
  }

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (v: number) => padding.left + ((v - minV) / (maxV - minV)) * chartWidth;
  const yScale = (d: number) => padding.top + chartHeight - ((d - minDeltaF) / (maxDeltaF - minDeltaF)) * chartHeight;

  const createPath = (voltageData: { voltage: number; deltaF: number }[]) => {
    const points = voltageData.map(d => {
      return `${xScale(d.voltage)},${yScale(d.deltaF)}`;
    }).join(' ');
    return `M ${points}`;
  };

  // Find data at hover voltage
  const getDataAtVoltage = (voltage: number) => {
    return allVoltageData.map(({ gevi, data }) => {
      const point = data.find(d => d.voltage === voltage);
      return { gevi, point };
    }).filter(d => d.point);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    const voltage = Math.round(minV + (x / width) * (maxV - minV));
    const snappedVoltage = Math.round(voltage / 5) * 5;

    if (snappedVoltage >= minV && snappedVoltage <= maxV) {
      setHoverVoltage(snappedVoltage);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverVoltage(null);
  }, []);

  const hoverData = hoverVoltage !== null ? getDataAtVoltage(hoverVoltage) : [];

  return (
    <div className="border rounded-lg p-3 bg-surface-low border-ink/10">
      <div
        ref={containerRef}
        className="relative cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ touchAction: 'none' }}>
          {/* Zero line */}
          <line
            x1={padding.left}
            y1={yScale(0)}
            x2={width - padding.right}
            y2={yScale(0)}
            stroke="#d1d5db"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Grid lines */}
          {yTicks.map(v => (
            <line
              key={v}
              x1={padding.left}
              y1={yScale(v)}
              x2={width - padding.right}
              y2={yScale(v)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map(v => (
            <text
              key={v}
              x={padding.left - 8}
              y={yScale(v) + 3}
              textAnchor="end"
              fontSize="8"
              fill="#6b7280"
            >
              {v > 0 ? `+${v}` : v}%
            </text>
          ))}

          {/* X-axis */}
          {xTicks.map(v => (
            <g key={v}>
              <line
                x1={xScale(v)}
                y1={yScale(minDeltaF)}
                x2={xScale(v)}
                y2={yScale(maxDeltaF)}
                stroke="#d1d5db"
                strokeWidth="1"
              />
              <text
                x={xScale(v)}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {v} mV
              </text>
            </g>
          ))}

          {/* Curves for each GEVI */}
          {allVoltageData.map(({ gevi, data }, idx) => (
            <g key={gevi.id}>
              <path
                d={createPath(data)}
                fill="none"
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth="2"
              />
              {/* Data points */}
              {data.map((d, i) => (
                <circle
                  key={i}
                  cx={xScale(d.voltage)}
                  cy={yScale(d.deltaF)}
                  r="2.5"
                  fill={COLORS[idx % COLORS.length]}
                />
              ))}
            </g>
          ))}

          {/* Hover vertical line */}
          {hoverVoltage && (
            <line
              x1={xScale(hoverVoltage)}
              y1={yScale(minDeltaF)}
              x2={xScale(hoverVoltage)}
              y2={yScale(maxDeltaF)}
              stroke="#6b7280"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}

          {/* Hover points */}
          {hoverData.map(({ gevi, point }, idx) => {
            const geviIdx = compareGEVIs.findIndex(g => g.id === gevi.id);
            return (
              <circle
                key={gevi.id}
                cx={xScale(point!.voltage)}
                cy={yScale(point!.deltaF)}
                r="5"
                fill={COLORS[geviIdx % COLORS.length]}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      {/* Readout at the hovered voltage. The selection chips above carry the color → sensor
          mapping for both charts, so there is no separate legend here. */}
      <div className="mt-2 pt-2 border-t border-ink/10 min-h-[1.5rem]">
        {hoverData.length > 0 ? (
          <div className="flex flex-wrap gap-3 justify-center">
            {hoverData.map(({ gevi, point }) => {
              const geviIdx = compareGEVIs.findIndex(g => g.id === gevi.id);
              return (
                <div key={gevi.id} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[geviIdx % COLORS.length] }} />
                  <span className="text-ink/60">
                    {gevi.name}:
                  </span>
                  <span
                    className="font-mono font-semibold"
                    style={{ color: COLORS[geviIdx % COLORS.length] }}
                  >
                    {point!.deltaF > 0 ? '+' : ''}{point!.deltaF.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-xs text-ink/35">hover the plot to read ΔF/F at a voltage</div>
        )}
      </div>
    </div>
  );
}
