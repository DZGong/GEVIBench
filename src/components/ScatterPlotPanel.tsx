import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { getAllGEVIs } from '../geviData';
import { getTreeNodeColor } from '../utils';
import type { GEVI } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type AxisKey = 'brightness' | 'speed' | 'dynamicRange' | 'sensitivity' | 'photostability' | 'popularity' | 'year';
type PointKind = 'normal' | 'tauOn' | 'tauOff';

interface AxisConfig {
  label: string;
  unit: string;
  defaultLog: boolean;
  fmt: (v: number) => string;
}

interface PlotPoint {
  x: number;
  y: number;
  gevi: GEVI;
  kind: PointKind;
}

interface HoverInfo {
  point: PlotPoint;
  cx: number;  // screen x
  cy: number;  // screen y
}

// ── Axis configs ──────────────────────────────────────────────────────────────

const AXES: Record<AxisKey, AxisConfig> = {
  brightness:     { label: 'Brightness',     unit: 'B/B_EGFP',  defaultLog: true,  fmt: v => v < 0.01 ? v.toExponential(1) : parseFloat(v.toPrecision(2)).toString() + '×' },
  speed:          { label: 'Speed (τ)',       unit: 'ms',        defaultLog: true,  fmt: v => (v < 1 ? v.toPrecision(2) : v < 10 ? v.toFixed(1) : Math.round(v).toString()) + ' ms' },
  dynamicRange:   { label: 'Dynamic Range',   unit: '%ΔF/F',     defaultLog: false, fmt: v => Math.round(v) + '%' },
  sensitivity:    { label: 'Sensitivity',     unit: '%/AP',      defaultLog: false, fmt: v => parseFloat(v.toPrecision(2)).toString() + '%' },
  photostability: { label: 'Photostability',  unit: '% remain',  defaultLog: false, fmt: v => Math.round(v) + '%' },
  popularity:     { label: 'Popularity',      unit: 'papers',    defaultLog: false, fmt: v => Math.round(v) + ' papers' },
  year:           { label: 'Year',            unit: '',          defaultLog: false, fmt: v => Math.round(v).toString() },
};

const AXIS_KEYS = Object.keys(AXES) as AxisKey[];

// ── Raw value extraction ──────────────────────────────────────────────────────

function normalizePhotostability(br: number, illumination: string, duration: string): number {
  const f = br / 100;
  const pwrM = illumination.match(/([\d.]+)\s*mW\/mm[²2]/);
  const power = pwrM ? parseFloat(pwrM[1]) : 100;
  let mins = 1;
  const minM = duration.match(/([\d.]+)\s*min/);
  const secM = duration.match(/([\d.]+)\s*s\b/i);
  if (minM) mins = parseFloat(minM[1]);
  else if (secM) mins = parseFloat(secM[1]) / 60;
  return Math.min(100, Math.pow(f, 100 / (mins * power)) * 100);
}

function getRawValue(gevi: GEVI, axis: AxisKey): number | null {
  switch (axis) {
    case 'brightness':
      return gevi.bRel != null && gevi.bRel > 0 ? gevi.bRel : null;
    case 'dynamicRange': {
      if (!gevi.dynamicRangeData?.length) return null;
      return Math.max(...gevi.dynamicRangeData.map(d => Math.abs(d.deltaF)));
    }
    case 'sensitivity': {
      if (!gevi.sensitivityData?.length) return null;
      return Math.max(...gevi.sensitivityData.map(d => Math.abs(d.deltaF)));
    }
    case 'photostability': {
      if (gevi.photostabilityData === 'bioluminescent') return 100;
      if (!Array.isArray(gevi.photostabilityData) || !gevi.photostabilityData.length) return null;
      const parsed = gevi.photostabilityData.map(e => {
        const pwrM = e.illumination.match(/([\d.]+)\s*mW\/mm[²2]/);
        const power = pwrM ? parseFloat(pwrM[1]) : 100;
        let mins = 1;
        const minM = e.duration.match(/([\d.]+)\s*min/);
        const secM = e.duration.match(/([\d.]+)\s*s\b/i);
        if (minM) mins = parseFloat(minM[1]);
        else if (secM) mins = parseFloat(secM[1]) / 60;
        return { e, mins, power };
      });
      parsed.sort((a, b) => Math.abs(a.mins - 1) - Math.abs(b.mins - 1) || Math.abs(a.power - 10) - Math.abs(b.power - 10));
      const { e } = parsed[0];
      return normalizePhotostability(e.brightnessRemaining, e.illumination, e.duration);
    }
    case 'popularity':
      return gevi.paperCount != null ? gevi.paperCount : null;
    case 'year':
      return gevi.year != null ? gevi.year : null;
    default:
      return null;
  }
}

function generatePoints(gevis: GEVI[], xAxis: AxisKey, yAxis: AxisKey): PlotPoint[] {
  const pts: PlotPoint[] = [];
  for (const gevi of gevis) {
    const isXSpeed = xAxis === 'speed';
    const isYSpeed = yAxis === 'speed';

    if (isXSpeed && isYSpeed) {
      // (τ_on, τ_off) as a single point showing kinetics pair
      const on = gevi.displayTauOn, off = gevi.displayTauOff;
      if (on != null && off != null) pts.push({ x: on, y: off, gevi, kind: 'normal' });
    } else if (isXSpeed) {
      const yVal = getRawValue(gevi, yAxis);
      if (yVal == null) continue;
      if (gevi.displayTauOn != null) pts.push({ x: gevi.displayTauOn, y: yVal, gevi, kind: 'tauOn' });
      if (gevi.displayTauOff != null) pts.push({ x: gevi.displayTauOff, y: yVal, gevi, kind: 'tauOff' });
    } else if (isYSpeed) {
      const xVal = getRawValue(gevi, xAxis);
      if (xVal == null) continue;
      if (gevi.displayTauOn != null) pts.push({ x: xVal, y: gevi.displayTauOn, gevi, kind: 'tauOn' });
      if (gevi.displayTauOff != null) pts.push({ x: xVal, y: gevi.displayTauOff, gevi, kind: 'tauOff' });
    } else {
      const xVal = getRawValue(gevi, xAxis);
      const yVal = getRawValue(gevi, yAxis);
      if (xVal == null || yVal == null) continue;
      pts.push({ x: xVal, y: yVal, gevi, kind: 'normal' });
    }
  }
  return pts;
}

// ── Scale & ticks ─────────────────────────────────────────────────────────────

function niceStep(range: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(range)));
  const f = range / exp;
  if (f < 1.5) return exp * 0.2;
  if (f < 3)   return exp * 0.5;
  if (f < 7)   return exp;
  return exp * 2;
}

function linearTicks(min: number, max: number): number[] {
  const step = niceStep(max - min);
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max + step * 1e-6; t += step) ticks.push(parseFloat(t.toPrecision(10)));
  return ticks;
}

function logTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  const lo = Math.floor(Math.log10(min));
  const hi = Math.ceil(Math.log10(max));
  for (let e = lo; e <= hi; e++) {
    for (const m of [1, 2, 5]) {
      const v = m * Math.pow(10, e);
      if (v >= min * 0.99 && v <= max * 1.01) ticks.push(v);
    }
  }
  return ticks;
}

function makeTicks(min: number, max: number, log: boolean): number[] {
  return log ? logTicks(min, max) : linearTicks(min, max);
}

function scaleVal(v: number, min: number, max: number, log: boolean, pixels: number): number {
  const lo = log ? Math.log10(min) : min;
  const hi = log ? Math.log10(max) : max;
  const vv = log ? Math.log10(v) : v;
  return ((vv - lo) / (hi - lo)) * pixels;
}

// ── Chart constants ───────────────────────────────────────────────────────────

const W = 700, H = 420;
const PAD = { top: 20, right: 24, bottom: 52, left: 72 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

// ── Marker renderers ──────────────────────────────────────────────────────────

function CircleMarker({ cx, cy, r, fill, stroke, strokeWidth }: { cx: number; cy: number; r: number; fill: string; stroke: string; strokeWidth: number }) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function DiamondMarker({ cx, cy, r, fill, stroke, strokeWidth }: { cx: number; cy: number; r: number; fill: string; stroke: string; strokeWidth: number }) {
  const d = r * 1.3;
  return <path d={`M${cx},${cy - d} L${cx + d},${cy} L${cx},${cy + d} L${cx - d},${cy} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onSelectGEVI: (gevi: GEVI) => void;
  onClose: () => void;
  peaceMode?: boolean;
}

export function ScatterPlotPanel({ onSelectGEVI, onClose, peaceMode = false }: Props) {
  const gevis = useMemo(() => getAllGEVIs(), []);

  const [xAxis, setXAxis] = useState<AxisKey>('brightness');
  const [yAxis, setYAxis] = useState<AxisKey>('speed');
  const [xLog, setXLog] = useState(true);
  const [yLog, setYLog] = useState(true);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync log defaults when axis changes
  useEffect(() => { setXLog(AXES[xAxis].defaultLog); }, [xAxis]);
  useEffect(() => { setYLog(AXES[yAxis].defaultLog); }, [yAxis]);

  const points = useMemo(() => generatePoints(gevis, xAxis, yAxis), [gevis, xAxis, yAxis]);

  // Axis ranges with padding
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (!points.length) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    const xs = points.map(p => p.x).filter(v => v > 0 || !xLog);
    const ys = points.map(p => p.y).filter(v => v > 0 || !yLog);
    const rawXMin = Math.min(...xs), rawXMax = Math.max(...xs);
    const rawYMin = Math.min(...ys), rawYMax = Math.max(...ys);

    const padAxis = (min: number, max: number, log: boolean) => {
      if (log) {
        const lo = Math.log10(min), hi = Math.log10(max);
        const pad = (hi - lo) * 0.12 || 0.5;
        return { min: Math.pow(10, lo - pad), max: Math.pow(10, hi + pad) };
      }
      const pad = (max - min) * 0.1 || 1;
      return { min: min - pad, max: max + pad };
    };

    const { min: xMin, max: xMax } = padAxis(rawXMin, rawXMax, xLog);
    const { min: yMin, max: yMax } = padAxis(rawYMin, rawYMax, yLog);
    return { xMin, xMax, yMin, yMax };
  }, [points, xLog, yLog]);

  const toSvg = useCallback((p: PlotPoint) => {
    const cx = PAD.left + scaleVal(p.x, xMin, xMax, xLog, CW);
    const cy = PAD.top + CH - scaleVal(p.y, yMin, yMax, yLog, CH);
    return { cx, cy };
  }, [xMin, xMax, xLog, yMin, yMax, yLog]);

  const xTicks = useMemo(() => makeTicks(xMin, xMax, xLog), [xMin, xMax, xLog]);
  const yTicks = useMemo(() => makeTicks(yMin, yMax, yLog), [yMin, yMax, yLog]);

  const showSpeedLegend = xAxis === 'speed' || yAxis === 'speed';
  const isSpeedVsSpeed = xAxis === 'speed' && yAxis === 'speed';

  // SVG mouse: find nearest point within 20px
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    let best: PlotPoint | null = null;
    let bestDist = 400;
    for (const p of points) {
      const { cx, cy } = toSvg(p);
      const dist = (mx - cx) ** 2 + (my - cy) ** 2;
      if (dist < bestDist) { bestDist = dist; best = p; }
    }
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHover(best ? { point: best, cx: e.clientX, cy: e.clientY } : null);
  }, [points, toSvg]);

  const handleSvgMouseLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setHover(null), 80);
  }, []);

  const xCfg = AXES[xAxis], yCfg = AXES[yAxis];

  return (
    <div className="flex flex-col bg-surface-lowest text-ink">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b flex-shrink-0 border-ink/10">
        <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-low text-ink/50">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-ink">Performance Scatter</h3>
        <div className="ml-auto text-xs text-ink/40">{points.length} data points · {gevis.length} GEVIs</div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3 border-b border-ink/10">
        {/* X axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink/60 w-5">X</span>
          <select
            value={xAxis}
            onChange={e => setXAxis(e.target.value as AxisKey)}
            className="text-xs border border-ink/20 rounded px-2 py-1 bg-surface-low text-ink focus:outline-none"
          >
            {AXIS_KEYS.map(k => <option key={k} value={k}>{AXES[k].label}</option>)}
          </select>
          <div className="flex rounded overflow-hidden border border-ink/20 text-xs">
            <button onClick={() => setXLog(false)} className={`px-2 py-1 ${!xLog ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Linear</button>
            <button onClick={() => setXLog(true)}  className={`px-2 py-1 ${xLog  ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Log</button>
          </div>
        </div>

        {/* Y axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink/60 w-5">Y</span>
          <select
            value={yAxis}
            onChange={e => setYAxis(e.target.value as AxisKey)}
            className="text-xs border border-ink/20 rounded px-2 py-1 bg-surface-low text-ink focus:outline-none"
          >
            {AXIS_KEYS.map(k => <option key={k} value={k}>{AXES[k].label}</option>)}
          </select>
          <div className="flex rounded overflow-hidden border border-ink/20 text-xs">
            <button onClick={() => setYLog(false)} className={`px-2 py-1 ${!yLog ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Linear</button>
            <button onClick={() => setYLog(true)}  className={`px-2 py-1 ${yLog  ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Log</button>
          </div>
        </div>

        {/* Speed legend */}
        {showSpeedLegend && !isSpeedVsSpeed && (
          <div className="flex items-center gap-3 text-xs text-ink/60">
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#6b7280" /></svg>
              τ<sub>on</sub>
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12"><path d="M6,1 L11,6 L6,11 L1,6 Z" fill="#6b7280" /></svg>
              τ<sub>off</sub>
            </span>
          </div>
        )}
        {isSpeedVsSpeed && (
          <span className="text-xs text-ink/50 italic">X = τ<sub>on</sub>, Y = τ<sub>off</sub></span>
        )}
      </div>

      {/* Chart */}
      <div className="px-4 py-3 overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full block"
          style={{ maxHeight: '60vh', cursor: 'crosshair' }}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
        >
          {/* Grid lines */}
          {xTicks.map(v => {
            const x = PAD.left + scaleVal(v, xMin, xMax, xLog, CW);
            return (
              <line key={`xg-${v}`} x1={x} y1={PAD.top} x2={x} y2={PAD.top + CH}
                stroke="#e5e7eb" strokeWidth="1" />
            );
          })}
          {yTicks.map(v => {
            const y = PAD.top + CH - scaleVal(v, yMin, yMax, yLog, CH);
            return (
              <line key={`yg-${v}`} x1={PAD.left} y1={y} x2={PAD.left + CW} y2={y}
                stroke="#e5e7eb" strokeWidth="1" />
            );
          })}

          {/* Axes border */}
          <rect x={PAD.left} y={PAD.top} width={CW} height={CH} fill="none" stroke="#d1d5db" strokeWidth="1" />

          {/* X ticks & labels */}
          {xTicks.map(v => {
            const x = PAD.left + scaleVal(v, xMin, xMax, xLog, CW);
            return (
              <g key={`xt-${v}`}>
                <line x1={x} y1={PAD.top + CH} x2={x} y2={PAD.top + CH + 4} stroke="#9ca3af" strokeWidth="1" />
                <text x={x} y={PAD.top + CH + 15} textAnchor="middle" fontSize="10" fill="#6b7280">
                  {xCfg.fmt(v).replace(/\s.*/, '')}
                </text>
              </g>
            );
          })}

          {/* Y ticks & labels */}
          {yTicks.map(v => {
            const y = PAD.top + CH - scaleVal(v, yMin, yMax, yLog, CH);
            return (
              <g key={`yt-${v}`}>
                <line x1={PAD.left - 4} y1={y} x2={PAD.left} y2={y} stroke="#9ca3af" strokeWidth="1" />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
                  {yCfg.fmt(v).replace(/\s.*/, '')}
                </text>
              </g>
            );
          })}

          {/* X axis label */}
          <text x={PAD.left + CW / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
            {xCfg.label}{xCfg.unit ? ` (${xCfg.unit})` : ''}
          </text>

          {/* Y axis label — rotated */}
          <text
            x={0} y={0}
            transform={`translate(12, ${PAD.top + CH / 2}) rotate(-90)`}
            textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600"
          >
            {yCfg.label}{yCfg.unit ? ` (${yCfg.unit})` : ''}
          </text>

          {/* Data points */}
          {points.map((p, i) => {
            const { cx, cy } = toSvg(p);
            if (cx < PAD.left - 2 || cx > PAD.left + CW + 2) return null;
            if (cy < PAD.top - 2 || cy > PAD.top + CH + 2) return null;
            const color = getTreeNodeColor(p.gevi);
            const isHov = hover?.point === p;
            const r = isHov ? 7 : 5;
            const sw = isHov ? 2 : 1.5;
            const stroke = isHov ? '#fff' : '#fff';
            return p.kind === 'tauOff'
              ? <DiamondMarker key={i} cx={cx} cy={cy} r={r} fill={color} stroke={stroke} strokeWidth={sw} />
              : <CircleMarker  key={i} cx={cx} cy={cy} r={r} fill={color} stroke={stroke} strokeWidth={sw} />;
          })}
        </svg>
      </div>

      {/* Hover tooltip */}
      {hover && (() => {
        const { point: p, cx: mx, cy: my } = hover;
        const TW = 160, TH = 80, GAP = 12;
        const left = mx + TW + GAP > window.innerWidth ? mx - TW - GAP : mx + GAP;
        const top  = my + TH + GAP > window.innerHeight ? my - TH - GAP : my + GAP;
        const kindLabel = p.kind === 'tauOn' ? ' (τ_on)' : p.kind === 'tauOff' ? ' (τ_off)' : '';
        return (
          <div
            style={{ position: 'fixed', left, top, width: TW, zIndex: 9999, pointerEvents: 'none' }}
            className="rounded-lg border shadow-ambient px-3 py-2 bg-surface-low border-ink/10"
          >
            <div className="font-bold text-sm mb-1" style={{ color: getTreeNodeColor(p.gevi) }}>
              {p.gevi.name}{kindLabel}
            </div>
            <div className="text-[10px] text-ink/70 space-y-0.5">
              <div>{xCfg.label}: {xCfg.fmt(p.x)}</div>
              <div>{yCfg.label}: {yCfg.fmt(p.y)}</div>
            </div>
            {!peaceMode && p.gevi.overall != null && (
              <div className="text-[10px] text-ink/40 mt-1">Overall: {p.gevi.overall}</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
