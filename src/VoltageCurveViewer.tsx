// Interactive Voltage Curve Viewer Component - Pure Function
// Shows deltaF/F response vs membrane potential
// Real-time mouse tracking with instant updates
// Accepts voltage data as props - no internal GEVI lookup

import { useState, useRef, useCallback, useMemo } from 'react';

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

export interface VoltageData {
  config?: VoltageConfig;
  custom?: VoltageCustom;
}

interface VoltageCurveViewerProps {
  voltageData?: VoltageData | null;
  geviName?: string;
  darkMode?: boolean;
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

export function VoltageCurveViewer({ voltageData, geviName, darkMode = false }: VoltageCurveViewerProps) {
  const [hoverVoltage, setHoverVoltage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Support both formats:
  // 1. { config: {...}, custom: {...} } - legacy
  // 2. { type, slope, polarity, name, custom: {...} } - GEVI format
  const voltageConfig = voltageData?.config || voltageData;
  const voltageCustom = voltageData?.custom;

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

  const config = voltageConfig;

  // Dynamic voltage range based on actual data
  const dataMinV = computedVoltage ? Math.min(...computedVoltage.map(d => d.voltage)) : -100;
  const dataMaxV = computedVoltage ? Math.max(...computedVoltage.map(d => d.voltage)) : 40;

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

  const minV = dataMinV;
  const maxV = dataMaxV;
  const rawMinDeltaF = computedVoltage ? Math.min(...computedVoltage.map(d => d.deltaF)) : -50;
  const rawMaxDeltaF = computedVoltage ? Math.max(...computedVoltage.map(d => d.deltaF)) : 30;
  const deltaFPad = Math.max(5, (rawMaxDeltaF - rawMinDeltaF) * 0.1);
  const minDeltaF = Math.floor(rawMinDeltaF - deltaFPad);
  const maxDeltaF = Math.ceil(rawMaxDeltaF + deltaFPad);
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

  // Get color based on polarity
  const getResponseColor = (deltaF: number) => {
    if (deltaF > 0) return darkMode ? '#22c55e' : '#16a34a'; // green for positive
    if (deltaF < 0) return darkMode ? '#ef4444' : '#dc2626'; // red for negative
    return darkMode ? '#9ca3af' : '#6b7280'; // gray for zero
  };

  // Calculate sensitivity (% deltaF per 100mV)
  const sensitivity = config ? Math.abs(config.slope) : 15;

  if (!config || !computedVoltage) {
    return (
      <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No voltage curve data available
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative h-64 cursor-crosshair ${darkMode ? 'bg-gray-900' : 'bg-white'} rounded`}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Grid lines - dynamic Y ticks */}
          {Array.from({ length: 6 }, (_, i) => Math.round(minDeltaF + (i / 5) * (maxDeltaF - minDeltaF))).map(v => (
            <line
              key={`grid-${v}`}
              x1={padding.left}
              y1={yScale(v)}
              x2={width - padding.right}
              y2={yScale(v)}
              stroke={darkMode ? '#374151' : '#e5e7eb'}
              strokeWidth="1"
            />
          ))}
          {/* X-axis labels - dynamic based on voltage range */}
          {Array.from({ length: 7 }, (_, i) => Math.round(minV + (i / 6) * (maxV - minV))).map(v => (
            <text
              key={`x-${v}`}
              x={xScale(v)}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fill={darkMode ? '#9ca3af' : '#6b7280'}
            >
              {v}
            </text>
          ))}
          {/* Y-axis labels - dynamic */}
          {Array.from({ length: 6 }, (_, i) => Math.round(minDeltaF + (i / 5) * (maxDeltaF - minDeltaF))).map(v => (
            <text
              key={`y-${v}`}
              x={padding.left - 8}
              y={yScale(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill={darkMode ? '#9ca3af' : '#6b7280'}
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
              stroke={darkMode ? '#6b7280' : '#9ca3af'}
              strokeWidth="1"
              strokeDasharray="4"
            />
          )}
          {/* Voltage curve */}
          <path
            d={createPath()}
            fill="none"
            stroke={config.polarity === 'positive' ? (darkMode ? '#3b82f6' : '#2563eb') : (darkMode ? '#ef4444' : '#dc2626')}
            strokeWidth="2"
          />
          {/* Data points */}
          {computedVoltage && computedVoltage.map((d, i) => (
            <circle
              key={i}
              cx={xScale(d.voltage)}
              cy={yScale(d.deltaF)}
              r="4"
              fill={config.polarity === 'positive' ? (darkMode ? '#3b82f6' : '#2563eb') : (darkMode ? '#ef4444' : '#dc2626')}
              stroke={darkMode ? '#1f2937' : '#ffffff'}
              strokeWidth="1.5"
            />
          ))}
          {/* Hover point */}
          {hoverData && (
            <circle
              cx={xScale(hoverData.voltage)}
              cy={yScale(hoverData.deltaF)}
              r="6"
              fill={getResponseColor(hoverData.deltaF)}
              stroke="white"
              strokeWidth="2"
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
            {hoverData.voltage}mV | {hoverData.deltaF.toFixed(2)}% ΔF/F
          </div>
        )}
      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-1 text-xs">
        <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Membrane Potential (mV)</span>
        <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>ΔF/F (%)</span>
      </div>

      {/* Sensitivity */}
      <div className={`mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        Sensitivity: ~{sensitivity}% per 100mV | Response: {config.polarity === 'positive' ? 'Positive (↑ depolarization = ↑ fluorescence)' : 'Negative (↑ depolarization = ↓ fluorescence)'}
      </div>
    </div>
  );
}

export default VoltageCurveViewer;
