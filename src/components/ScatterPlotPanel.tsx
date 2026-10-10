import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getAllGEVIs, fmtDuration } from '../geviData';
import { getTreeNodeColor } from '../utils';
import type { GEVI } from '../types';
import { ExportSvgButton } from './ExportSvgButton';
import { ScatterExpressionEditor } from './ScatterExpressionEditor';
import { parseExpr, evalExpr, formatExpr, ExprError, type Expr } from '../scatterExpression';

// ── Types ─────────────────────────────────────────────────────────────────────

type AxisKey =
  | 'brightness' | 'tauOn' | 'tauOff' | 'tauSum' | 'dynamicRange' | 'subthreshold'
  | 'sensitivity' | 'apWidth' | 'photostability' | 'papers' | 'year';
/** An axis is either a single metric or a user-typed expression over metrics. */
type AxisSel = AxisKey | 'custom';
type SizeAxis = AxisSel | 'none';
type AxisSlot = 'x' | 'y' | 'size';

type LabelPart = { text: string; sub?: boolean };

interface AxisConfig {
  labelParts: LabelPart[];     // rendered in SVG via <tspan> (for real subscripts)
  labelText: string;           // plain-text form for tooltips / menus
  /** Unit-less symbol used when the metric appears inside a custom expression label. */
  symbolParts: LabelPart[];
  /** Identifier used for this metric in custom expressions. */
  varName: string;
  defaultLog: boolean;
  fmt: (v: number) => string;
}

/** What the chart needs from an axis, whether a single metric or an expression. */
interface ResolvedAxis {
  labelParts: LabelPart[];
  fmt: (v: number) => string;
  get: (gevi: GEVI) => number | null;
  /** Marker-size encoding: τ axes are inverted so faster kinetics → bigger marker. */
  invertSize: boolean;
}

interface CustomAxis { expr: string; label: string }

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
const pctFmt = (v: number) => parseFloat(v.toPrecision(2)).toString() + '%';
const genericFmt = (v: number) => {
  const a = Math.abs(v);
  return a !== 0 && (a < 1e-3 || a >= 1e5) ? v.toExponential(2) : parseFloat(v.toPrecision(3)).toString();
};

// Values are the same per-sensor numbers the database table shows (geviData display*),
// so a metric reads identically here, in the list, and inside an expression.
const AXES: Record<AxisKey, AxisConfig> = {
  brightness:     { labelParts: [{ text: 'B/B' }, { text: 'EGFP', sub: true }], symbolParts: [{ text: 'B/B' }, { text: 'EGFP', sub: true }], labelText: 'B/B_EGFP', varName: 'B', defaultLog: true, fmt: v => v < 0.01 ? v.toExponential(1) : parseFloat(v.toPrecision(2)).toString() + '×' },
  tauOn:          { labelParts: [{ text: 'τ' }, { text: 'on', sub: true }, { text: ' (ms)' }], symbolParts: [{ text: 'τ' }, { text: 'on', sub: true }], labelText: 'τ_on (ms)', varName: 'tau_on', defaultLog: true, fmt: tauFmt },
  tauOff:         { labelParts: [{ text: 'τ' }, { text: 'off', sub: true }, { text: ' (ms)' }], symbolParts: [{ text: 'τ' }, { text: 'off', sub: true }], labelText: 'τ_off (ms)', varName: 'tau_off', defaultLog: true, fmt: tauFmt },
  tauSum:         { labelParts: [{ text: 'τ' }, { text: 'on', sub: true }, { text: '+τ' }, { text: 'off', sub: true }, { text: ' (ms)' }], symbolParts: [{ text: '(τ' }, { text: 'on', sub: true }, { text: '+τ' }, { text: 'off', sub: true }, { text: ')' }], labelText: 'τ_on+τ_off (ms)', varName: 'tau_sum', defaultLog: true, fmt: tauFmt },
  dynamicRange:   { labelParts: [{ text: 'ΔF/F per 100mV' }], symbolParts: [{ text: 'ΔF/F' }, { text: '100mV', sub: true }], labelText: 'ΔF/F per 100mV (%)', varName: 'dff_100mV', defaultLog: false, fmt: v => Math.round(v) + '%' },
  subthreshold:   { labelParts: [{ text: 'ΔF/F per mV' }], symbolParts: [{ text: 'ΔF/F' }, { text: 'mV', sub: true }], labelText: 'ΔF/F per mV (%)', varName: 'dff_mV', defaultLog: false, fmt: pctFmt },
  sensitivity:    { labelParts: [{ text: 'ΔF/F per AP' }], symbolParts: [{ text: 'ΔF/F' }, { text: 'AP', sub: true }], labelText: 'ΔF/F per AP (%)', varName: 'dff_AP', defaultLog: false, fmt: pctFmt },
  apWidth:        { labelParts: [{ text: 'FWHM' }, { text: 'AP', sub: true }, { text: ' (ms)' }], symbolParts: [{ text: 'FWHM' }, { text: 'AP', sub: true }], labelText: 'AP width FWHM (ms)', varName: 'ap_width', defaultLog: false, fmt: tauFmt },
  photostability: { labelParts: [{ text: 't' }, { text: '75%', sub: true }, { text: ' @100mW (s)' }], symbolParts: [{ text: 't' }, { text: '75%', sub: true }], labelText: 't₇₅% @100mW (s)', varName: 't75', defaultLog: true, fmt: fmtDuration },
  papers:         { labelParts: [{ text: 'N' }, { text: 'used', sub: true }], symbolParts: [{ text: 'N' }, { text: 'used', sub: true }], labelText: 'Papers using it (N_used)', varName: 'n_used', defaultLog: false, fmt: v => Math.round(v).toString() },
  year:           { labelParts: [{ text: 'Year' }], symbolParts: [{ text: 'Year' }], labelText: 'Year', varName: 'year', defaultLog: false, fmt: v => Math.round(v).toString() },
};

const AXIS_KEYS = Object.keys(AXES) as AxisKey[];
const VAR_TO_AXIS = new Map(AXIS_KEYS.map(k => [AXES[k].varName, k]));
const VAR_NAMES = new Set(VAR_TO_AXIS.keys());

const CUSTOM_PRESETS: { name: string; expr: string; label: string }[] = [
  { name: 'SNR proxy (AP)', expr: 'dff_AP * sqrt(B)', label: '' },
  { name: 'SNR proxy (mV)', expr: 'dff_mV * sqrt(B)', label: '' },
  { name: 'Speed (1/τ)', expr: '1000 / tau_sum', label: '' },
];

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

const positive = (v: number | null | undefined) => (v != null && v > 0 ? v : null);

function getRawValue(gevi: GEVI, axis: AxisKey): number | null {
  switch (axis) {
    case 'brightness':     return positive(gevi.bRel);
    case 'tauOn':          return positive(gevi.displayTauOn);
    case 'tauOff':         return positive(gevi.displayTauOff);
    case 'tauSum':         return positive(gevi.displayTauSum);
    case 'dynamicRange':   return positive(gevi.displayDynamicRange);
    case 'subthreshold':   return positive(gevi.displaySubthreshold);
    case 'sensitivity':    return positive(gevi.displaySensitivity);
    case 'apWidth':        return positive(gevi.displayApWidth);
    // 1P t₇₅ scaled to 100 mW/mm² (seconds); 2P/power-only excluded (see geviData).
    case 'photostability': return positive(gevi.displayT75);
    case 'papers':         return gevi.paperCount ?? null;
    case 'year':           return gevi.year ?? null;
    default:               return null;
  }
}

/** Turn a formatted expression (metric names wrapped in \0) into label parts with real subscripts. */
function exprLabelParts(expr: Expr): LabelPart[] {
  const text = formatExpr(expr, name => `\0${name}\0`);
  const parts: LabelPart[] = [];
  text.split('\0').forEach((chunk, i) => {
    if (!chunk) return;
    if (i % 2 === 1) parts.push(...AXES[VAR_TO_AXIS.get(chunk)!].symbolParts);
    else parts.push({ text: chunk });
  });
  return parts;
}

/** `expr` is null when parsing failed; `error`/`pos` then describe why and where. */
type ParsedCustom = { ok: boolean; expr: Expr | null; error: string; pos: number };

function parseCustom(src: string): ParsedCustom {
  try {
    return { ok: true, expr: parseExpr(src, VAR_NAMES), error: '', pos: 0 };
  } catch (e) {
    if (e instanceof ExprError) return { ok: false, expr: null, error: e.message, pos: e.pos };
    throw e;
  }
}

function resolveAxis(sel: AxisSel, custom: CustomAxis, lastGood: Expr | null): ResolvedAxis | null {
  if (sel !== 'custom') {
    const cfg = AXES[sel];
    return { labelParts: cfg.labelParts, fmt: cfg.fmt, get: g => getRawValue(g, sel), invertSize: sel === 'tauOn' || sel === 'tauOff' || sel === 'tauSum' };
  }
  const expr = lastGood;
  if (!expr) return null;
  return {
    labelParts: custom.label.trim() ? [{ text: custom.label.trim() }] : exprLabelParts(expr),
    fmt: genericFmt,
    get: g => evalExpr(expr, name => getRawValue(g, VAR_TO_AXIS.get(name)!)),
    invertSize: false,
  };
}

// Map a raw value to the quantity encoded by marker size (bigger = "better").
function sizeEncoded(raw: number | null, invert: boolean): number | null {
  if (raw == null || raw <= 0) return null;
  return invert ? 1 / raw : raw;
}

/** Points with both coordinates; values that a log axis cannot show (≤ 0) are dropped. */
function generatePoints(gevis: GEVI[], xa: ResolvedAxis, ya: ResolvedAxis, xLog: boolean, yLog: boolean) {
  const pts: PlotPoint[] = [];
  let hiddenByLog = 0;
  for (const gevi of gevis) {
    const x = xa.get(gevi);
    const y = ya.get(gevi);
    if (x == null || y == null) continue;
    if ((xLog && x <= 0) || (yLog && y <= 0)) { hiddenByLog++; continue; }
    pts.push({ x, y, gevi });
  }
  return { pts, hiddenByLog };
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

// ── Custom-axis persistence ───────────────────────────────────────────────────

const CUSTOM_STORAGE_KEY = 'gevibench.scatterCustomAxes';
const DEFAULT_CUSTOM: Record<AxisSlot, CustomAxis> = {
  x: { expr: 'B', label: '' },
  y: { expr: 'dff_AP * sqrt(B)', label: '' },
  size: { expr: '1000 / tau_sum', label: '' },
};

function loadCustomAxes(): Record<AxisSlot, CustomAxis> {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      const out = { ...DEFAULT_CUSTOM };
      for (const slot of ['x', 'y', 'size'] as AxisSlot[]) {
        const v = saved[slot];
        if (v && typeof v.expr === 'string') out[slot] = { expr: v.expr, label: typeof v.label === 'string' ? v.label : '' };
      }
      return out;
    }
  } catch { /* ignore */ }
  return DEFAULT_CUSTOM;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onSelectGEVI: (gevi: GEVI) => void;
}

export function ScatterPlotPanel({ onSelectGEVI }: Props) {
  const gevis = useMemo(() => getAllGEVIs(), []);

  const [xAxis, setXAxis] = useState<AxisSel>('brightness');
  const [yAxis, setYAxis] = useState<AxisSel>('tauOn');
  const [sizeAxis, setSizeAxis] = useState<SizeAxis>('none');
  const [custom, setCustom] = useState<Record<AxisSlot, CustomAxis>>(loadCustomAxes);
  useEffect(() => {
    try { localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(custom)); } catch { /* ignore */ }
  }, [custom]);
  const setCustomSlot = (slot: AxisSlot, patch: Partial<CustomAxis>) =>
    setCustom(c => ({ ...c, [slot]: { ...c[slot], ...patch } }));
  const [xLog, setXLog] = useState(true);
  const [yLog, setYLog] = useState(true);
  const [sizeLog, setSizeLog] = useState(true);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync log defaults when axis changes (custom expressions start on log: most are
  // products/ratios of positive metrics spanning decades).
  const defaultLog = (sel: AxisSel) => (sel === 'custom' ? true : AXES[sel].defaultLog);
  useEffect(() => { setXLog(defaultLog(xAxis)); }, [xAxis]);
  useEffect(() => { setYLog(defaultLog(yAxis)); }, [yAxis]);
  useEffect(() => { if (sizeAxis !== 'none') setSizeLog(defaultLog(sizeAxis)); }, [sizeAxis]);

  // Parse each custom expression; while one is mid-edit and invalid, the chart keeps
  // plotting the last expression that parsed so it doesn't blank out on every keystroke.
  const parsed = useMemo(() => ({
    x: parseCustom(custom.x.expr), y: parseCustom(custom.y.expr), size: parseCustom(custom.size.expr),
  }), [custom]);
  const lastGood = useRef<Record<AxisSlot, Expr | null>>({ x: null, y: null, size: null });
  for (const slot of ['x', 'y', 'size'] as AxisSlot[]) {
    const r = parsed[slot];
    if (r.expr) lastGood.current[slot] = r.expr;
  }

  const xa = useMemo(() => resolveAxis(xAxis, custom.x, lastGood.current.x), [xAxis, custom.x, parsed.x]);
  const ya = useMemo(() => resolveAxis(yAxis, custom.y, lastGood.current.y), [yAxis, custom.y, parsed.y]);
  const sa = useMemo(() => (sizeAxis === 'none' ? null : resolveAxis(sizeAxis, custom.size, lastGood.current.size)), [sizeAxis, custom.size, parsed.size]);

  const { pts: points, hiddenByLog } = useMemo(
    () => (xa && ya ? generatePoints(gevis, xa, ya, xLog, yLog) : { pts: [], hiddenByLog: 0 }),
    [gevis, xa, ya, xLog, yLog],
  );

  // Size-dimension values: raw (for tooltip display) and encoded (for marker size).
  const sizeRaw = useMemo(() => (sa ? points.map(p => sa.get(p.gevi)) : null), [points, sa]);

  const sizeEnc = useMemo(() => {
    if (!sizeRaw || !sa) return null;
    return sizeRaw.map(v => sizeEncoded(v, sa.invertSize));
  }, [sizeRaw, sa]);

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

  const EMPTY_AXIS: ResolvedAxis = { labelParts: [{ text: '—' }], fmt: genericFmt, get: () => null, invertSize: false };
  const xCfg = xa ?? EMPTY_AXIS, yCfg = ya ?? EMPTY_AXIS;

  const axisOptions = [
    ...AXIS_KEYS.map(k => ({ key: k as AxisSel, parts: AXES[k].labelParts })),
    { key: 'custom' as AxisSel, parts: [{ text: 'ƒ  Custom expression…' }] },
  ];
  const customSlots = ([['x', xAxis], ['y', yAxis], ['size', sizeAxis]] as [AxisSlot, SizeAxis][])
    .filter(([, sel]) => sel === 'custom')
    .map(([slot]) => slot);
  const fileKey = (sel: SizeAxis) => (sel === 'custom' ? 'custom' : sel);

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
        <div className="ml-auto text-xs text-ink/40 text-right">
          {points.length} data points · {gevis.length} GEVIs
          {hiddenByLog > 0 && <div>{hiddenByLog} hidden (≤ 0 on a log axis)</div>}
        </div>
        <ExportSvgButton getSvg={() => svgRef.current} filename={`gevi-scatter-${fileKey(xAxis)}-vs-${fileKey(yAxis)}.svg`} />
      </div>

      {/* Inner container */}
      <div className="border rounded-lg bg-surface-low overflow-hidden">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3 border-b border-ink/10">
        {/* X axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink/60 w-5">X</span>
          <LabelDropdown<AxisSel>
            value={xAxis}
            onChange={setXAxis}
            options={axisOptions}
          />
          <div className="flex rounded overflow-hidden border border-ink/20 text-xs">
            <button onClick={() => setXLog(false)} className={`px-2 py-1 ${!xLog ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Linear</button>
            <button onClick={() => setXLog(true)}  className={`px-2 py-1 ${xLog  ? 'bg-klein text-white' : 'bg-surface-low text-ink/60 hover:bg-surface'}`}>Log</button>
          </div>
        </div>

        {/* Y axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink/60 w-5">Y</span>
          <LabelDropdown<AxisSel>
            value={yAxis}
            onChange={setYAxis}
            options={axisOptions}
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
                suffix: (k === 'tauOn' || k === 'tauOff' || k === 'tauSum') ? ' (1/τ)' : undefined,
              })),
              { key: 'custom' as SizeAxis, parts: [{ text: 'ƒ  Custom expression…' }] },
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

      {/* Expression editors for the axes set to "Custom expression" */}
      {customSlots.map(slot => {
        const r = parsed[slot];
        const expr = r.expr;
        const nWithValue = expr ? gevis.filter(g => evalExpr(expr, name => getRawValue(g, VAR_TO_AXIS.get(name)!)) != null).length : 0;
        return (
          <ScatterExpressionEditor
            key={slot}
            slotLabel={slot === 'size' ? 'Size' : slot.toUpperCase()}
            value={custom[slot].expr}
            label={custom[slot].label}
            onChange={expr => setCustomSlot(slot, { expr })}
            onLabelChange={label => setCustomSlot(slot, { label })}
            metrics={AXIS_KEYS.map(k => ({ varName: AXES[k].varName, parts: AXES[k].symbolParts, description: AXES[k].labelText }))}
            presets={CUSTOM_PRESETS}
            status={r.ok
              ? { ok: true, message: `${nWithValue} of ${gevis.length} GEVIs have every metric used` }
              : { ok: false, message: r.error, pos: r.pos }}
            renderLabel={renderHtmlLabel}
          />
        );
      })}

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
        const sizeVal = sizeRaw ? sizeRaw[hoverIdx] : null;
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
              {sa && (
                <div>
                  {renderHtmlLabel(sa.labelParts)}: {sizeVal != null ? sa.fmt(sizeVal) : '—'}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
