import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { Trash2, GitCompare, X } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { generateVoltageCurve, GEVI_VOLTAGE } from '../VoltageCurveViewer';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];

interface ComparisonProps {
  compareGEVIs: any[];
  onRemove: (id: string) => void;
  darkMode: boolean;
  showEmpty?: boolean;
  onClose?: () => void;
}

export function ComparisonPanel({ compareGEVIs, onRemove, darkMode, showEmpty = false, onClose }: ComparisonProps) {
  const getCompareRadarData = () => {
    const subjects = ['Bright', 'Speed', 'SNR', 'Range', 'Stable', 'Sub-V'];
    const keys = ['brightness', 'speed', 'snr', 'dynamicRange', 'photostability', 'subthreshold'];

    return subjects.map((subject, idx) => {
      const data: any = { subject };
      compareGEVIs.forEach((gevi, gIdx) => {
        // Use a sanitized key name for the dataKey
        const safeName = gevi.name.replace(/[^a-zA-Z0-9]/g, '');
        data[safeName] = gevi[keys[idx]];
      });
      return data;
    });
  };

  // Show empty state when no GEVIs selected and showEmpty is true
  if (compareGEVIs.length === 0) {
    if (!showEmpty) return null;

    return (
      <div id="compare-panel" className={`border rounded-lg p-4 md:p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <GitCompare className="w-5 h-5" />Compare Sensors (0)
          </h3>
          {onClose && (
            <button onClick={onClose} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className={`flex flex-col items-center justify-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <GitCompare className={`w-12 h-12 mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className="text-center">
            No sensors selected for comparison.
          </p>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Click the <span className="font-semibold">Compare</span> button on any sensor to add it to the comparison.
          </p>
        </div>
      </div>
    );
  }

  // Create a safe name for dataKey
  const getSafeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div id="compare-panel" className={`border rounded-lg p-4 md:p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <GitCompare className="w-5 h-5" />Compare Sensors ({compareGEVIs.length})
        </h3>
        {onClose && (
          <button onClick={onClose} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Selected GEVIs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {compareGEVIs.map((gevi, idx) => (
          <div key={gevi.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{gevi.name}</span>
            <button onClick={() => onRemove(gevi.id)} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Charts side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <div>
          <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Performance Radar</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={getCompareRadarData()}>
                <PolarGrid stroke={darkMode ? "#4b5563" : "#e5e7eb"} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: darkMode ? '#9ca3af' : '#9ca3af', fontSize: 10 }} />
                {compareGEVIs.map((gevi, idx) => (
                  <Radar key={gevi.id} name={gevi.name} dataKey={getSafeName(gevi.name)} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.2} />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* F-V Curve Comparison */}
        <div>
          <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>F-V Curve</h4>
          <FVCurveCompare compareGEVIs={compareGEVIs} COLORS={COLORS} darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}

// F-V Curve Comparison Component
function FVCurveCompare({ compareGEVIs, COLORS, darkMode }: { compareGEVIs: any[]; COLORS: string[]; darkMode: boolean }) {
  const [hoverVoltage, setHoverVoltage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const width = 500;
  const height = 256;
  const padding = { top: 15, right: 15, bottom: 30, left: 45 };

  const minV = -100;
  const maxV = 40;
  const minDeltaF = -50;
  const maxDeltaF = 30;
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

  // Generate curve data for each GEVI
  const getVoltageData = (gevi: any) => {
    const config = GEVI_VOLTAGE[gevi.id];
    if (config) {
      return generateVoltageCurve(config.type, config.slope, config.polarity);
    }
    return generateVoltageCurve('fp');
  };

  // Pre-compute voltage data for all GEVIs
  const allVoltageData = compareGEVIs.map(gevi => ({
    gevi,
    data: getVoltageData(gevi)
  }));

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
    <div className={`border rounded-lg p-3 ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
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
            stroke={darkMode ? '#4b5563' : '#d1d5db'}
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Grid lines */}
          {[-50, -25, 0, 30].map(v => (
            <line
              key={v}
              x1={padding.left}
              y1={yScale(v)}
              x2={width - padding.right}
              y2={yScale(v)}
              stroke={darkMode ? '#374151' : '#e5e7eb'}
              strokeWidth="1"
            />
          ))}

          {/* Y-axis labels */}
          {[-50, -25, 0, 30].map(v => (
            <text
              key={v}
              x={padding.left - 8}
              y={yScale(v) + 3}
              textAnchor="end"
              fontSize="8"
              fill={darkMode ? '#9ca3af' : '#6b7280'}
            >
              {v > 0 ? `+${v}` : v}%
            </text>
          ))}

          {/* X-axis */}
          {[-80, -60, -40, -20, 0, 20].map(v => (
            <g key={v}>
              <line
                x1={xScale(v)}
                y1={yScale(minDeltaF)}
                x2={xScale(v)}
                y2={yScale(maxDeltaF)}
                stroke={darkMode ? '#4b5563' : '#d1d5db'}
                strokeWidth="1"
              />
              <text
                x={xScale(v)}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill={darkMode ? '#9ca3af' : '#6b7280'}
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
              stroke={darkMode ? '#9ca3af' : '#6b7280'}
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

      {/* Legend and Data Readout */}
      <div className="mt-2 pt-2 border-t border-gray-600/30">
        <div className="flex flex-wrap gap-3 justify-center mb-2">
          {compareGEVIs.map((gevi, idx) => (
            <div key={gevi.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{gevi.name}</span>
            </div>
          ))}
        </div>

        {/* Hover data readout */}
        {hoverData.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center">
            {hoverData.map(({ gevi, point }) => {
              const geviIdx = compareGEVIs.findIndex(g => g.id === gevi.id);
              return (
                <div key={gevi.id} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[geviIdx % COLORS.length] }} />
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
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
        )}
      </div>
    </div>
  );
}
