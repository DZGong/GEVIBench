// Interactive Voltage Curve Viewer Component
// Shows deltaF/F response vs membrane potential
// Real-time mouse tracking with instant updates

import { useState, useRef, useCallback } from 'react';

interface VoltagePoint {
  voltage: number;  // mV
  deltaF: number;  // % deltaF/F
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

// GEVI voltage response configurations
export const GEVI_VOLTAGE: Record<string, { type: 'opsin' | 'fp' | 'fret' | 'red' | 'chemi'; slope: number; polarity: 'positive' | 'negative'; name: string }> = {
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
  'ace2n': { type: 'opsin', slope: 18, polarity: 'positive', name: 'Ace2N' },
  'ace2n4aa': { type: 'opsin', slope: 16, polarity: 'positive', name: 'Ace2N-4AA' },
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
  'asap4': { type: 'fp', slope: 20, polarity: 'negative', name: 'ASAP4' },
  'asap4s': { type: 'fp', slope: 22, polarity: 'negative', name: 'ASAP4s' },
  'asap5': { type: 'fp', slope: 14, polarity: 'negative', name: 'ASAP5' },
  'jedi1p': { type: 'fp', slope: 10, polarity: 'positive', name: 'JEDI-1P' },
  'jedi2p': { type: 'fp', slope: 12, polarity: 'positive', name: 'JEDI-2P' },
  'restus': { type: 'fp', slope: 15, polarity: 'positive', name: 'rEstus' },
  'arclight': { type: 'fp', slope: 20, polarity: 'negative', name: 'ArcLight' },
  'arclightd': { type: 'fp', slope: 18, polarity: 'negative', name: 'ArcLight-D' },
  'bongwoori': { type: 'fp', slope: 12, polarity: 'negative', name: 'Bongwoori' },
  'marina': { type: 'fp', slope: 8, polarity: 'positive', name: 'Marina' },
  'dragon': { type: 'fp', slope: 10, polarity: 'positive', name: 'Dragon' },
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
};

interface VoltageCurveViewerProps {
  geviId: string;
  darkMode?: boolean;
}

export function VoltageCurveViewer({ geviId, darkMode = false }: VoltageCurveViewerProps) {
  const [hoverVoltage, setHoverVoltage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const config = GEVI_VOLTAGE[geviId];

  // Generate voltage curve data
  const voltageData = config ? generateVoltageCurve(config.type, config.slope, config.polarity) : generateVoltageCurve('fp');

  // Find values at hover voltage
  const hoverData = voltageData.find(d => d.voltage === hoverVoltage) || null;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !voltageData) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Map x position to voltage (-100 to +40 mV range)
    const minV = -100;
    const maxV = 40;
    const voltage = Math.round(minV + (x / width) * (maxV - minV));

    // Snap to nearest data point
    const snappedVoltage = Math.round(voltage / 5) * 5;

    if (snappedVoltage >= minV && snappedVoltage <= maxV) {
      setHoverVoltage(snappedVoltage);
    }
  }, [voltageData]);

  const handleMouseLeave = useCallback(() => {
    setHoverVoltage(null);
  }, []);

  // Chart dimensions
  const width = 500;
  const height = 180;
  const padding = { top: 15, right: 15, bottom: 25, left: 45 };

  const minV = -100;
  const maxV = 40;
  const minDeltaF = -50;
  const maxDeltaF = 30;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (v: number) => padding.left + ((v - minV) / (maxV - minV)) * chartWidth;
  const yScale = (d: number) => padding.top + chartHeight - ((d - minDeltaF) / (maxDeltaF - minDeltaF)) * chartHeight;

  // Create smooth path
  const createPath = () => {
    const points = voltageData.map(d => {
      return `${xScale(d.voltage)},${yScale(d.deltaF)}`;
    }).join(' ');
    return `M ${points}`;
  };

  // Get color based on polarity
  const getResponseColor = (deltaF: number) => {
    if (deltaF > 0) return darkMode ? '#22c55e' : '#16a34a'; // green for positive
    if (deltaF < 0) return darkMode ? '#ef4444' : '#dc2626'; // red for negative
    return darkMode ? '#9ca3af' : '#6b7280'; // gray for zero
  };

  // Calculate sensitivity (% deltaF per 100mV)
  const sensitivity = config ? Math.abs(config.slope) : 15;

  return (
    <div className={`border rounded-lg p-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Voltage Response
        </h4>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {config?.name || 'Generic'}
        </span>
      </div>

      {/* Voltage curve display */}
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

          {/* Zero line label */}
          <text
            x={padding.left - 8}
            y={yScale(0) + 3}
            textAnchor="end"
            fontSize="8"
            fill={darkMode ? '#9ca3af' : '#6b7280'}
          >
            0%
          </text>

          {/* Curve line */}
          <path
            d={createPath()}
            fill="none"
            stroke={darkMode ? '#3b82f6' : '#2563eb'}
            strokeWidth="2"
          />

          {/* Data points */}
          {voltageData.map((d, i) => (
            <circle
              key={i}
              cx={xScale(d.voltage)}
              cy={yScale(d.deltaF)}
              r="3"
              fill={darkMode ? '#3b82f6' : '#2563eb'}
            />
          ))}

          {/* Hover point */}
          {hoverData && (
            <g>
              <circle
                cx={xScale(hoverData.voltage)}
                cy={yScale(hoverData.deltaF)}
                r="5"
                fill={getResponseColor(hoverData.deltaF)}
                stroke="white"
                strokeWidth="2"
              />
              <line
                x1={xScale(hoverData.voltage)}
                y1={yScale(minDeltaF)}
                x2={xScale(hoverData.voltage)}
                y2={yScale(maxDeltaF)}
                stroke={getResponseColor(hoverData.deltaF)}
                strokeWidth="1"
                strokeOpacity={0.5}
              />
            </g>
          )}
        </svg>

        {/* Hover info overlay */}
        <div
          className="absolute pointer-events-none transition-opacity duration-75"
          style={{
            left: hoverVoltage ? `${((hoverVoltage - minV) / (maxV - minV)) * 100}%` : '0%',
            top: '0',
            transform: 'translateX(-50%)',
            opacity: hoverVoltage ? 1 : 0,
          }}
        >
          <div className="flex flex-col items-center">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: hoverData ? getResponseColor(hoverData.deltaF) : 'transparent' }}
            />
          </div>
        </div>
      </div>

      {/* Data readout */}
      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Sensitivity:</span>
            <span className={`font-mono font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              ~{sensitivity}%/100mV
            </span>
          </div>

          {hoverData && (
            <div className="flex items-center gap-3">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {hoverData.voltage} mV:
              </span>
              <span
                className="font-mono font-semibold"
                style={{ color: getResponseColor(hoverData.deltaF) }}
              >
                {hoverData.deltaF > 0 ? '+' : ''}{hoverData.deltaF.toFixed(1)}% ΔF/F
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Range:</span>
            <span className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              -100 to +40 mV
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoltageCurveViewer;
