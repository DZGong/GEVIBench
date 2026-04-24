import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getAllGEVIs } from '../geviData';
import { getTreeNodeColor } from '../utils';
import type { GEVI } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type AxisKey = 'brightness' | 'tauOn' | 'tauOff' | 'dynamicRange' | 'sensitivity' | 'photostability' | 'year';
type SizeAxis = AxisKey | 'none';

type LabelPart = { text: string; sub?: boolean };

interface AxisConfig {
  labelParts: LabelPart[];     // rendered in SVG via <tspan> (for real subscripts)
  labelText: string;           // plain-text form for <select> options and tooltips
  defaultLog: boolean;
  fmt: (v: number) => string;
}

interface PlotPoint {
  x: number;
  y: number;
  gevi: GEVI;
}

interface HoverInfo {
  point: PlotPoint;
  cx: number;  // screen x
  cy: number;  // screen y
}

// ── Axis configs ──────────────────────────────────────────────────────────────

const tauFmt = (v: number) => (v < 1 ? v.toPrecision(2) : v < 10 ? v.toFixed(1) : Math.round(v).toString()) + ' ms';

const AXES: Record<AxisKey, AxisConfig> = {
  brightness:     { labelParts: [{ text: 'B/B' }, { text: 'EGFP', sub: true }],                   labelText: 'B/B_EGFP',         defaultLog: true,  fmt: v => v < 0.01 ? v.toExponential(1) : parseFloat(v.toPrecision(2)).toString() + '×' },
  tauOn:          { labelParts: [{ text: 'τ' }, { text: 'on', sub: true }, { text: ' (ms)' }],    labelText: 'τ_on (ms)',        defaultLog: true,  fmt: tauFmt },
  tauOff:         { labelParts: [{ text: 'τ' }, { text: 'off', sub: true }, { text: ' (ms)' }],   labelText: 'τ_off (ms)',       defaultLog: true,  fmt: tauFmt },
  dynamicRange:   { labelParts: [{ text: 'ΔF/F per 100mV' }],                                     labelText: 'ΔF/F per 100mV',   defaultLog: false, fmt: v => Math.round(v) + '%' },
  sensitivity:    { labelParts: [{ text: 'ΔF/F per AP' }],                                        labelText: 'ΔF/F per AP',      defaultLog: false, fmt: v => parseFloat(v.toPrecision(2)).toString() + '%' },
  photostability: { labelParts: [{ text: 'F' }, { text: 'remain', sub: true }, { text: '%' }],    labelText: 'F_remain%',        defaultLog: false, fmt: v => Math.round(v) + '%' },
  year:           { labelParts: [{ text: 'Year' }],                                               labelText: 'Year',             defaultLog: false, fmt: v => Math.round(v).toString() },
};

const AXIS_KEYS = Object.keys(AXES) as AxisKey[];

// Render a subscripted axis label as SVG <tspan>s. `baseline-shift="sub"` keeps
// subscripts correctly positioned even when the parent <text> is rotated (Y axis).
function renderAxisLabel(parts: LabelPart[]) {
  return parts.map((p, i) => (
    <tspan key={i} baselineShift={p.sub ? 'sub' : undefined} fontSize={p.sub ? '80%' : undefined}>
      {p.text}
    </tspan>
  ));
}

// HTML variant of the same label — uses real <sub>, safe inside buttons/menus.
function renderHtmlLabel(parts: LabelPart[]) {
  return parts.map((p, i) => (p.sub ? <sub key={i}>{p.text}</sub> : <span key={i}>{p.text}</span>));
}

// Custom dropdown that supports rich labels (HTML <sub>), since <select><option>
// only accepts plain text. Closes on outside click or Escape.
function LabelDropdown<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; parts: LabelPart[]; suffix?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find(o => o.key === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs border border-ink/20 rounded px-2 py-1 bg-surface-low text-ink focus:outline-none flex items-center gap-1.5"
      >
        <span>{current ? renderHtmlLabel(current.parts) : null}{current?.suffix}</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-surface-lowest border border-ink/20 rounded shadow-md py-1 min-w-full whitespace-nowrap">
          {options.map(o => {
            const selected = o.key === value;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => { onChange(o.key); setOpen(false); }}
                className={`block w-full text-left text-xs px-3 py-1 ${selected ? 'bg-klein/10 text-klein font-medium' : 'text-ink'} hover:bg-klein hover:text-white`}
              >
                {renderHtmlLabel(o.parts)}{o.suffix}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
    case 'tauOn':
      return gevi.displayTauOn != null && gevi.displayTauOn > 0 ? gevi.displayTauOn : null;
    case 'tauOff':
      return gevi.displayTauOff != null && gevi.displayTauOff > 0 ? gevi.displayTauOff : null;
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
    case 'year':
      return gevi.year != null ? gevi.year : null;
    default:
      return null;
  }
}

// Map a raw value to the quantity encoded by marker size (bigger = "better").
// τ axes are inverted so smaller τ → larger marker (faster kinetics).
function sizeEncoded(raw: number | null, axis: AxisKey): number | null {
  if (raw == null || raw <= 0) return null;
  return (axis === 'tauOn' || axis === 'tauOff') ? 1 / raw : raw;
}

function generatePoints(gevis: GEVI[], xAxis: AxisKey, yAxis: AxisKey): PlotPoint[] {
  const pts: PlotPoint[] = [];
  for (const gevi of gevis) {
    const xVal = getRawValue(gevi, xAxis);
    const yVal = getRawValue(gevi, yAxis);
    if (xVal == null || yVal == null) continue;
    pts.push({ x: xVal, y: yVal, gevi });
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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onSelectGEVI: (gevi: GEVI) => void;
}

export function ScatterPlotPanel({ onSelectGEVI }: Props) {
  const gevis = useMemo(() => getAllGEVIs(), []);

  const [xAxis, setXAxis] = useState<AxisKey>('brightness');
  const [yAxis, setYAxis] = useState<AxisKey>('tauOn');
  const [sizeAxis, setSizeAxis] = useState<SizeAxis>('none');
  const [xLog, setXLog] = useState(true);
  const [yLog, setYLog] = useState(true);
  const [sizeLog, setSizeLog] = useState(true);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync log defaults when axis changes
  useEffect(() => { setXLog(AXES[xAxis].defaultLog); }, [xAxis]);
  useEffect(() => { setYLog(AXES[yAxis].defaultLog); }, [yAxis]);
  useEffect(() => { if (sizeAxis !== 'none') setSizeLog(AXES[sizeAxis].defaultLog); }, [sizeAxis]);

  const points = useMemo(() => generatePoints(gevis, xAxis, yAxis), [gevis, xAxis, yAxis]);

  // Size-dimension values: raw (for tooltip display) and encoded (for marker size).
  const sizeRaw = useMemo(() => {
    if (sizeAxis === 'none') return null;
    return points.map(p => getRawValue(p.gevi, sizeAxis));
  }, [points, sizeAxis]);

  const sizeEnc = useMemo(() => {
    if (!sizeRaw || sizeAxis === 'none') return null;
    return sizeRaw.map(v => sizeEncoded(v, sizeAxis));
  }, [sizeRaw, sizeAxis]);

  const { sMin, sMax } = useMemo(() => {
    if (!sizeEnc) return { sMin: 1, sMax: 1 };
    const valid = sizeEnc.filter((v): v is number => v != null && v > 0);
    if (valid.length < 2) return { sMin: 1, sMax: 1 };
    return { sMin: Math.min(...valid), sMax: Math.max(...valid) };
  }, [sizeEnc]);

  const R_MIN = 3, R_MAX = 14, R_DEFAULT = 5;

  const getRadius = useCallback((i: number): number => {
    if (!sizeEnc) return R_DEFAULT;
    const v = sizeEnc[i];
    if (v == null || v <= 0 || sMin === sMax) return v == null ? R_MIN * 0.8 : R_DEFAULT;
    const norm = sizeLog
      ? (Math.log10(v) - Math.log10(sMin)) / (Math.log10(sMax) - Math.log10(sMin))
      : (v - sMin) / (sMax - sMin);
    const n = Math.max(0, Math.min(1, norm));
    return R_MIN + Math.sqrt(n) * (R_MAX - R_MIN);
  }, [sizeEnc, sizeLog, sMin, sMax]);

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

  // SVG mouse: use getScreenCTM to correctly map screen→SVG coords (handles
  // preserveAspectRatio letterboxing, CSS transforms, zoom, etc.)
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());

    // Find nearest dot in SVG space; per-point threshold scales with marker radius.
    let best: PlotPoint | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const { cx, cy } = toSvg(p);
      const dist = (svgPt.x - cx) ** 2 + (svgPt.y - cy) ** 2;
      const r = getRadius(i);
      const threshold = Math.max(144, (r + 4) ** 2);
      if (dist < threshold && dist < bestDist) { bestDist = dist; best = p; }
    }
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHover(best ? { point: best, cx: e.clientX, cy: e.clientY } : null);
  }, [points, toSvg, getRadius]);

  const handleSvgMouseLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setHover(null), 80);
  }, []);

  const xCfg = AXES[xAxis], yCfg = AXES[yAxis];

  return (
    <div className="flex flex-col rounded-lg border-2 p-4 bg-surface-lowest border-gold/40 shadow-md text-ink">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-klein">Performance Scatter</h3>
          <p className="text-xs text-ink mt-0.5">
            Compare GEVI performance metrics on customizable axes with linear or logarithmic scaling.
          </p>
        </div>
        <div className="ml-auto text-xs text-ink/40">{points.length} data points · {gevis.length} GEVIs</div>
      </div>

      {/* Inner container */}
      <div className="border rounded-lg bg-surface-low overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3 border-b border-ink/10">
        {/* X axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink/60 w-5">X</span>
          <LabelDropdown<AxisKey>
            value={xAxis}
            onChange={setXAxis}
            options={AXIS_KEYS.map(k => ({ key: k, parts: AXES[k].labelParts }))}
          />
          <div className="flex rounded overflow-hidden border border-ink/20 text-xs">
            <button onClick={() => setXLog(false)} className={`px-2 py-1 ${!xLog ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Linear</button>
            <button onClick={() => setXLog(true)}  className={`px-2 py-1 ${xLog  ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Log</button>
          </div>
        </div>

        {/* Y axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink/60 w-5">Y</span>
          <LabelDropdown<AxisKey>
            value={yAxis}
            onChange={setYAxis}
            options={AXIS_KEYS.map(k => ({ key: k, parts: AXES[k].labelParts }))}
          />
          <div className="flex rounded overflow-hidden border border-ink/20 text-xs">
            <button onClick={() => setYLog(false)} className={`px-2 py-1 ${!yLog ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Linear</button>
            <button onClick={() => setYLog(true)}  className={`px-2 py-1 ${yLog  ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Log</button>
          </div>
        </div>

        {/* Size axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink/60">Size</span>
          <LabelDropdown<SizeAxis>
            value={sizeAxis}
            onChange={setSizeAxis}
            options={[
              { key: 'none', parts: [{ text: 'None' }] },
              ...AXIS_KEYS.map(k => ({
                key: k as SizeAxis,
                parts: AXES[k].labelParts,
                suffix: (k === 'tauOn' || k === 'tauOff') ? ' (1/τ)' : undefined,
              })),
            ]}
          />
          {sizeAxis !== 'none' && (
            <div className="flex rounded overflow-hidden border border-ink/20 text-xs">
              <button onClick={() => setSizeLog(false)} className={`px-2 py-1 ${!sizeLog ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Linear</button>
              <button onClick={() => setSizeLog(true)}  className={`px-2 py-1 ${sizeLog  ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Log</button>
            </div>
          )}
        </div>

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

          {/* X axis label — baseline lifted so subscripts don't get clipped by the viewBox bottom */}
          <text x={PAD.left + CW / 2} y={H - 14} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
            {renderAxisLabel(xCfg.labelParts)}
          </text>

          {/* Y axis label — rotated */}
          <text
            x={0} y={0}
            transform={`translate(12, ${PAD.top + CH / 2}) rotate(-90)`}
            textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600"
          >
            {renderAxisLabel(yCfg.labelParts)}
          </text>

          {/* Data points */}
          {points.map((p, i) => {
            const { cx, cy } = toSvg(p);
            if (cx < PAD.left - 2 || cx > PAD.left + CW + 2) return null;
            if (cy < PAD.top - 2 || cy > PAD.top + CH + 2) return null;
            const color = getTreeNodeColor(p.gevi);
            const isHov = hover?.point === p;
            const baseR = getRadius(i);
            const r = isHov ? baseR + 2 : baseR;
            const sw = isHov ? 2 : 1.5;
            const noSize = sizeAxis !== 'none' && sizeEnc != null && (sizeEnc[i] == null);
            const opacity = noSize ? 0.35 : 1;
            return (
              <g key={i} opacity={opacity}>
                <CircleMarker cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={sw} />
                <text
                  x={cx + r + 2}
                  y={cy + 2}
                  fontSize={7}
                  fontWeight="600"
                  fill="#374151"
                  stroke="white"
                  strokeWidth={2}
                  paintOrder="stroke"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {p.gevi.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      </div>{/* end inner container */}

      {/* Hover tooltip */}
      {hover && (() => {
        const { point: p, cx: mx, cy: my } = hover;
        const TW = 170, TH = 96, GAP = 12;
        const left = mx + TW + GAP > window.innerWidth ? mx - TW - GAP : mx + GAP;
        const top  = my + TH + GAP > window.innerHeight ? my - TH - GAP : my + GAP;
        const hoverIdx = points.indexOf(p);
        const sizeVal = sizeAxis !== 'none' && sizeRaw ? sizeRaw[hoverIdx] : null;
        return (
          <div
            style={{ position: 'fixed', left, top, width: TW, zIndex: 9999, pointerEvents: 'none' }}
            className="rounded-lg border shadow-ambient px-3 py-2 bg-surface-low border-ink/10"
          >
            <div className="font-bold text-sm mb-1" style={{ color: getTreeNodeColor(p.gevi) }}>
              {p.gevi.name}
            </div>
            <div className="text-[10px] text-ink/70 space-y-0.5">
              <div>{renderHtmlLabel(xCfg.labelParts)}: {xCfg.fmt(p.x)}</div>
              <div>{renderHtmlLabel(yCfg.labelParts)}: {yCfg.fmt(p.y)}</div>
              {sizeAxis !== 'none' && (
                <div>
                  {renderHtmlLabel(AXES[sizeAxis].labelParts)}: {sizeVal != null ? AXES[sizeAxis].fmt(sizeVal) : '—'}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
