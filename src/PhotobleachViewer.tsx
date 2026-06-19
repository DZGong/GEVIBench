// Photobleaching Viewer Component
// Shows a digitized photobleach decay curve (normalized fluorescence F/F0 vs time)
// with the stored fit overlaid and the model-free t75% metric (time to fall to 75%
// of the initial fluorescence). Mirrors VoltageCurveViewer: SVG chart + a clickable
// source-figure inset (thumbnail → lightbox) + citation. Accepts data as props.

import { useState, useRef, useCallback, useMemo } from 'react';
import { getDoiCitationMap } from './geviData';
import { abbreviateFigure } from './components/SourceCitation';

export interface PhotobleachData {
  modality?: '1P' | '2P';
  illumination?: string;
  intensityMWmm2?: number;      // 1P illumination in mW/mm² (enables linear-dose scaling to 100 mW/mm²)
  t75?: number;                 // seconds
  extrapolated?: boolean;       // true when t75 lies beyond the measured window
  fit?: {
    model?: string;
    a?: number;                 // power-law coeff, or biexponential fast-component fraction
    b?: number;
    tau?: number;               // exponential τ in seconds (mono → F=exp(-t/τ); biexp → fast τ₁)
    tau2?: number;              // biexponential slow τ₂ in seconds
    r2?: number;
  };
  custom?: {
    time: number[];             // seconds
    fluorescence: number[];     // fraction of initial (F/F0)
  };
  source?: string;
  sourceImage?: string;
  sourceFigure?: string;
  note?: string;
}

export interface CompanionCurve {
  name: string;
  fit?: PhotobleachData['fit'];                 // that GEVI's stored fit (drawn as a smooth line)
  points: { time: number; flux: number }[];     // time in seconds, flux = F/F0
}

// Evaluate a stored fit at time ts (seconds) → F/F0, or null if not usable. Shared by
// the primary curve and the companion overlays so every curve renders identically to
// how it draws on its own GEVI page.
function evalFit(fit: PhotobleachData['fit'] | undefined, ts: number): number | null {
  if (!fit) return null;
  if (fit.model === 'power-law' && fit.a != null && fit.b != null) return fit.a * Math.pow(ts, fit.b);
  if (fit.model === 'biexponential' && fit.a != null && fit.tau != null && fit.tau2 != null)
    return fit.a * Math.exp(-ts / fit.tau) + (1 - fit.a) * Math.exp(-ts / fit.tau2);
  // Stretched/compressed exponential F = exp(−(t/τ)^β); β stored in `b`. Falls back to
  // a plain monoexponential below when β is absent.
  if (fit.model === 'stretched-exponential' && fit.tau != null && fit.b != null)
    return Math.exp(-Math.pow(ts / fit.tau, fit.b));
  if ((fit.model === 'monoexponential' || fit.model === 'stretched-exponential') && fit.tau != null)
    return (fit.a ?? 1) * Math.exp(-ts / fit.tau);
  return null;
}

interface PhotobleachViewerProps {
  photobleachData?: PhotobleachData | null;
  geviName?: string;
  // Other GEVIs' bleach curves from the SAME figure, overlaid for comparison.
  // They are drawn as thin colored lines with no t75 marker (only this GEVI's
  // t75 point is marked).
  companions?: CompanionCurve[];
}

// Distinct colors for companion overlay curves (avoid red = primary, blue = t75 marker).
const COMPANION_COLORS = ['#16a34a', '#9333ea', '#ea580c', '#0891b2', '#ca8a04'];

// Format a time in seconds for display: seconds (<2 min), minutes (<6 h), else hours.
function fmtTime(s: number): string {
  if (s < 120) return `${Math.round(s)} s`;
  if (s < 21600) return `${(s / 60).toFixed(1)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}

export function PhotobleachViewer({ photobleachData, geviName, companions }: PhotobleachViewerProps) {
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [insetExpanded, setInsetExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const custom = photobleachData?.custom;
  const fit = photobleachData?.fit;

  // Companion curves (other GEVIs from the same figure). Each carries that GEVI's stored
  // fit + digitized points + the measured time span, so we draw it as a smooth fit line
  // (identical to its own page) rather than a jagged polyline.
  const companionCurves = useMemo(() => {
    return (companions ?? [])
      .filter(c => c.points?.length)
      .map((c, i) => ({
        name: c.name,
        color: COMPANION_COLORS[i % COMPANION_COLORS.length],
        fit: c.fit,
        pts: c.points.map(p => ({ tMin: p.time / 60, flux: p.flux })),
        tStartS: c.points[0].time,
        tEndS: c.points[c.points.length - 1].time,
      }));
  }, [companions]);

  // Digitized points as {tMin, flux}
  const points = useMemo(() => {
    if (!custom?.time?.length || !custom?.fluorescence?.length) return null;
    return custom.time.map((t, i) => ({ tMin: t / 60, flux: custom.fluorescence[i] }));
  }, [custom]);

  // Evaluate the stored fit at time ts (seconds) → F/F0, or null if no usable fit.
  const fitF = (ts: number): number | null => evalFit(fit, ts);

  const t75Min = photobleachData?.t75 != null ? photobleachData.t75 / 60 : null;
  const extrapolated = !!photobleachData?.extrapolated;

  // Chart geometry
  const width = 600;
  const height = 280;
  const padding = { top: 25, right: 25, bottom: 40, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const companionFlux = companionCurves.flatMap(c => c.pts.map(p => p.flux));
  const companionMaxMin = companionCurves.flatMap(c => c.pts.map(p => p.tMin));
  const allFlux = [...(points ? points.map(p => p.flux) : []), ...companionFlux];
  const dataMaxMin = Math.max(points ? Math.max(...points.map(p => p.tMin)) : 10, ...companionMaxMin, 0);
  const xMin = 0;
  // When the fit is extrapolated past the data (t75 beyond the recording), extend the
  // x-axis to include t75 so its marker is visible; otherwise stop just past the data.
  const xMaxRaw = extrapolated && t75Min != null ? Math.max(dataMaxMin, t75Min) : dataMaxMin;
  const niceCeil = (v: number) =>
    v <= 6 ? Math.ceil(v) : v <= 20 ? Math.ceil(v / 5) * 5 : v <= 60 ? Math.ceil(v / 10) * 10 : Math.ceil(v / 30) * 30;
  const xMax = niceCeil(xMaxRaw);
  // Y axis: a little headroom above 1.0 baseline down to below the minimum.
  const yMin = Math.min(0.5, Math.floor((Math.min(...allFlux, 0.75) - 0.05) * 10) / 10);
  const yMax = 1.0;

  const xScale = (tMin: number) => padding.left + ((tMin - xMin) / (xMax - xMin)) * chartWidth;
  const yScale = (f: number) => padding.top + chartHeight - ((f - yMin) / (yMax - yMin)) * chartHeight;

  // Fit curve, split into the in-data portion (solid) and the extrapolated tail (dashed).
  const fitPaths = (() => {
    if (!custom?.time?.length || fitF(custom.time[0]) == null) return null;
    const tStartS = custom.time[0];
    const dataEndS = custom.time[custom.time.length - 1];
    const tEndS = extrapolated && photobleachData?.t75 != null ? Math.max(dataEndS, photobleachData.t75) : dataEndS;
    const n = 120;
    const solid: string[] = [];
    const dashed: string[] = [];
    for (let i = 0; i <= n; i++) {
      const ts = tStartS + (i / n) * (tEndS - tStartS);
      const f = fitF(ts);
      if (f == null) continue;
      const pt = `${xScale(ts / 60)},${yScale(f)}`;
      if (ts <= dataEndS + 1e-6) solid.push(pt);
      if (ts >= dataEndS - 1e-6) dashed.push(pt);
    }
    return { solid: solid.length ? 'M ' + solid.join(' ') : '', dashed: dashed.length > 1 ? 'M ' + dashed.join(' ') : '' };
  })();

  const xTicks = (() => {
    const step = xMax <= 6 ? 1 : xMax <= 20 ? 5 : xMax <= 60 ? 10 : 30;
    const t: number[] = [];
    for (let v = 0; v <= xMax + 1e-6; v += step) t.push(v);
    return t;
  })();
  const yTicks = (() => {
    const t: number[] = [];
    for (let v = yMax; v >= yMin - 1e-6; v -= 0.1) t.push(Math.round(v * 100) / 100);
    return t;
  })();

  const hoverData = useMemo(() => {
    if (hoverT == null || !points) return null;
    return points.reduce((closest, p) =>
      !closest || Math.abs(p.tMin - hoverT) < Math.abs(closest.tMin - hoverT) ? p : closest,
      null as { tMin: number; flux: number } | null);
  }, [hoverT, points]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !points) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverT(xMin + (x / rect.width) * (xMax - xMin));
  }, [points, xMin, xMax]);

  const primaryColor = '#dc2626'; // red — the VADER1 / red-GEVI bleach trace

  if (!points) {
    return (
      <div className="border rounded-lg p-4 bg-surface-low border-ink/10">
        <div className="text-xs text-ink">No photobleaching curve data available</div>
      </div>
    );
  }

  // Fallback poly-line connecting the data points (used only when there's no usable fit).
  const pointsPath = 'M ' + points.map(p => `${xScale(p.tMin)},${yScale(p.flux)}`).join(' ');

  return (
    <div className="border rounded-lg p-4 bg-surface-low border-ink/10">
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverT(null)}
        className="relative cursor-crosshair bg-surface-low rounded"
      >
        <svg className="w-full block" viewBox={`0 0 ${width} ${height}`}>
          {/* Horizontal grid lines */}
          {yTicks.map(v => (
            <line key={`g-${v}`} x1={padding.left} y1={yScale(v)} x2={width - padding.right} y2={yScale(v)} stroke="#e5e7eb" strokeWidth="1" />
          ))}
          {/* X-axis labels (minutes) */}
          {xTicks.map(v => (
            <text key={`x-${v}`} x={xScale(v)} y={height - 10} textAnchor="middle" fontSize="11" fill="#1c1c19">{v}</text>
          ))}
          {/* Y-axis labels (F/F0) */}
          {yTicks.map(v => (
            <text key={`y-${v}`} x={padding.left - 8} y={yScale(v) + 4} textAnchor="end" fontSize="11" fill="#1c1c19">{v.toFixed(1)}</text>
          ))}

          {/* 75% threshold line */}
          <line x1={padding.left} y1={yScale(0.75)} x2={width - padding.right} y2={yScale(0.75)} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4" />
          <text x={width - padding.right - 2} y={yScale(0.75) - 4} textAnchor="end" fontSize="10" fill="#6b7280">75%</text>

          {/* Rapid-phase guide: from (t=0, F=1.0) to the first measured point — shown
              faintly so the F0=1.0 origin is explicit. Only when data starts after t=0. */}
          {points[0].tMin > 0.1 && (
            <>
              <line
                x1={xScale(0)} y1={yScale(1.0)}
                x2={xScale(points[0].tMin)} y2={yScale(points[0].flux)}
                stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="2 3"
              />
              <circle cx={xScale(0)} cy={yScale(1.0)} r="3" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
            </>
          )}

          {/* Companion curves from the same figure (other GEVIs) — drawn from each GEVI's
              stored fit (smooth, identical to its own page); falls back to a polyline only
              if that GEVI has no fit. Thin colored lines, no t75 marker, under the primary. */}
          {companionCurves.map((c, ci) => {
            let path: string[];
            if (c.fit && evalFit(c.fit, Math.max(c.tStartS, 1e-6)) != null) {
              path = [];
              const n = 90;
              for (let i = 0; i <= n; i++) {
                const ts = c.tStartS + (i / n) * (c.tEndS - c.tStartS);
                const f = evalFit(c.fit, ts);
                if (f == null) continue;
                const tMin = ts / 60;
                if (tMin >= xMin && tMin <= xMax) path.push(`${xScale(tMin)},${yScale(f)}`);
              }
            } else {
              path = c.pts.filter(p => p.tMin >= xMin && p.tMin <= xMax).map(p => `${xScale(p.tMin)},${yScale(p.flux)}`);
            }
            if (path.length < 2) return null;
            return (
              <path key={`comp-${ci}`} d={'M ' + path.join(' ')} fill="none" stroke={c.color} strokeWidth="1.8" opacity="0.8" />
            );
          })}

          {/* Fitted decay curve: solid over the measured data, dashed where extrapolated */}
          {fitPaths ? (
            <>
              {fitPaths.solid && <path d={fitPaths.solid} fill="none" stroke={primaryColor} strokeWidth="2" />}
              {fitPaths.dashed && <path d={fitPaths.dashed} fill="none" stroke={primaryColor} strokeWidth="2" strokeDasharray="5 4" opacity="0.8" />}
            </>
          ) : (
            <path d={pointsPath} fill="none" stroke={primaryColor} strokeWidth="2" />
          )}

          {/* t75% marker */}
          {t75Min != null && t75Min >= xMin && t75Min <= xMax && (
            <>
              <line x1={xScale(t75Min)} y1={yScale(0.75)} x2={xScale(t75Min)} y2={padding.top + chartHeight} stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx={xScale(t75Min)} cy={yScale(0.75)} r="4" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
              <text x={xScale(t75Min)} y={padding.top + 10} textAnchor={t75Min > xMax * 0.85 ? 'end' : 'middle'} fontSize="9" fill="#2563eb">
                t₇₅{extrapolated ? ' (extrap.)' : ''}
              </text>
            </>
          )}

          {/* Digitized data points */}
          {points.map((p, i) => (
            <circle key={i} cx={xScale(p.tMin)} cy={yScale(p.flux)} r="3.5" fill={primaryColor} stroke="#fff" strokeWidth="1.2" />
          ))}

          {/* Hover point */}
          {hoverData && (
            <circle cx={xScale(hoverData.tMin)} cy={yScale(hoverData.flux)} r="6" fill={primaryColor} stroke="white" strokeWidth="2" />
          )}
        </svg>

        {/* Source figure inset (top-right) */}
        {photobleachData?.sourceImage && (
          <button
            onClick={() => setInsetExpanded(true)}
            className="absolute border border-ink/20 rounded shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden"
            title={`View source: ${photobleachData.sourceFigure || 'Original figure'}`}
            style={{ width: '20%', aspectRatio: '1/1', right: '1%', top: '4%' }}
          >
            <img src={photobleachData.sourceImage} alt="Source figure" className="w-full h-full object-cover" />
          </button>
        )}

        {/* Hover tooltip */}
        {hoverData && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs bg-surface-low text-ink shadow" style={{ pointerEvents: 'none' }}>
            {hoverData.tMin.toFixed(1)} min | {(hoverData.flux * 100).toFixed(1)}% F₀
          </div>
        )}
      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-1 text-xs">
        <span className="text-ink">Time (min)</span>
        <span className="text-ink">Normalized fluorescence (F/F₀)</span>
      </div>

      {/* Legend — only when companion curves from the same figure are overlaid.
          Only this GEVI (primary) carries the t₇₅% marker. */}
      {companionCurves.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] text-ink/80">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-0.5" style={{ backgroundColor: primaryColor }} />
            <span className="font-semibold">{geviName || 'This GEVI'}</span>
            <span className="text-ink/40">(t₇₅% marked)</span>
          </span>
          {companionCurves.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-0.5" style={{ backgroundColor: c.color }} />
              {c.name}
            </span>
          ))}
        </div>
      )}

      {/* Metric summary */}
      <div className="mt-2 text-xs text-ink">
        <span className="font-semibold text-klein">t₇₅% ≈ {photobleachData?.t75 != null ? fmtTime(photobleachData.t75) : '—'}</span>
        {extrapolated && <span className="ml-1 text-[10px] font-semibold text-amber-600">(extrapolated)</span>}
        {photobleachData?.illumination && <span className="text-ink/70"> @ {photobleachData.illumination}</span>}
        {photobleachData?.modality && (
          <span className="ml-1 align-middle text-[9px] px-1 py-0.5 rounded bg-ink/10 text-ink/70 font-semibold">{photobleachData.modality}</span>
        )}
      </div>
      {/* Linear-dose scaling to the 100 mW/mm² reference — 1P only (2P stands alone). */}
      {photobleachData?.modality === '1P' && photobleachData?.intensityMWmm2 != null && photobleachData?.t75 != null && (() => {
        const REF = 100; // mW/mm²
        const scaled = photobleachData.t75 * (photobleachData.intensityMWmm2 / REF);
        const scaledStr = scaled < 10 ? `${scaled.toFixed(1)} s` : fmtTime(scaled);
        const factor = REF / photobleachData.intensityMWmm2;
        return (
          <div className="mt-0.5 text-[10px] text-ink/70">
            Scaled to 100 mW/mm² (linear dose, 1P): <span className="font-semibold text-klein">t₇₅% ≈ {scaledStr}</span>
            <span className="text-ink/40"> · {Math.round(factor).toLocaleString()}× more intense; assumes dose-linear bleaching</span>
          </div>
        );
      })()}
      {fit && (
        <div className="mt-0.5 text-[10px] text-ink/60">
          Fit: {fit.model === 'power-law' && fit.a != null && fit.b != null
            ? <>F(t) = {fit.a.toFixed(2)}·t<sup>{fit.b.toFixed(3)}</sup> (t in s)</>
            : fit.model === 'biexponential' && fit.a != null && fit.tau != null && fit.tau2 != null
            ? <>bi-exponential (τ<sub>fast</sub> ≈ {fmtTime(fit.tau)}, τ<sub>slow</sub> ≈ {fmtTime(fit.tau2)}){extrapolated ? ', extrapolated beyond data' : ''}</>
            : fit.model === 'stretched-exponential' && fit.tau != null && fit.b != null
            ? <>F(t) = exp(−(t/{fmtTime(fit.tau)})<sup>{fit.b.toFixed(2)}</sup>){extrapolated ? ', extrapolated beyond data' : ''}</>
            : (fit.model === 'monoexponential' || fit.model === 'stretched-exponential') && fit.tau != null
            ? <>F(t) = {fit.a != null && fit.a !== 1 ? `${fit.a.toFixed(2)}·` : ''}exp(−t/{fmtTime(fit.tau)}){extrapolated ? ', extrapolated beyond data' : ''}</>
            : fit.model}
          {fit.r2 != null && <span> · R² = {fit.r2.toFixed(2)}</span>}
        </div>
      )}

      {/* Source */}
      {photobleachData?.source && (() => {
        const source = photobleachData.source!;
        const doi = source.startsWith('doi:') ? source.slice(4) : null;
        const citationMap = getDoiCitationMap();
        const label = doi ? (citationMap[doi] || source) : source;
        const url = doi ? `https://doi.org/${doi}` : null;
        return (
          <div className="mt-1 text-[10px] text-ink/50">
            Source:{' '}
            {url
              ? <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline text-klein">{label}</a>
              : <span>{label}</span>}
            {photobleachData.sourceFigure && <span> — {abbreviateFigure(photobleachData.sourceFigure)}</span>}
          </div>
        );
      })()}

      {/* Expanded lightbox */}
      {insetExpanded && photobleachData?.sourceImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setInsetExpanded(false)}>
          <div className="relative max-w-lg" onClick={e => e.stopPropagation()}>
            <img src={photobleachData.sourceImage} alt={`Source: ${photobleachData.sourceFigure || 'Original figure'}`} className="rounded-lg shadow-xl max-h-[80vh]" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-3 py-1.5 rounded-b-lg">
              {photobleachData.sourceFigure ? abbreviateFigure(photobleachData.sourceFigure) : 'Source figure'}
            </div>
            <button onClick={() => setInsetExpanded(false)} className="absolute -top-2 -right-2 w-6 h-6 bg-white text-black rounded-full text-xs font-bold shadow flex items-center justify-center">×</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Concise label for a curve in the gallery tab bar. Prefer the paper citation (e.g.
// "Land 2026") — cleaner and more meaningful than 1P/2P; the modality/illumination are
// already shown inside the panel. Falls back to modality + illumination, then figure.
function curveLabel(pb: PhotobleachData): string {
  const doi = pb.source?.startsWith('doi:') ? pb.source.slice(4) : null;
  const cite = doi ? getDoiCitationMap()[doi] : undefined;
  if (cite) return cite;
  const parts: string[] = [];
  if (pb.modality) parts.push(pb.modality);
  if (pb.illumination) {
    const illum = pb.illumination.replace(/\s*\((?:1P|2P)\)\s*$/i, '').trim();
    if (illum) parts.push(illum);
  }
  if (!parts.length && pb.sourceFigure) parts.push(abbreviateFigure(pb.sourceFigure));
  return parts.join(' · ') || 'Curve';
}

export interface PhotobleachGalleryEntry {
  data: PhotobleachData;
  companions?: CompanionCurve[];
}

// A swipeable gallery of full-size photobleach curves (used when a GEVI has more than one
// bleach curve, e.g. measured under different illumination / in different papers). Each
// curve renders full width; navigate with the arrows, dots, or a touch swipe.
export function PhotobleachGallery({ entries, geviName }: { entries: PhotobleachGalleryEntry[]; geviName?: string }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (!entries.length) return null;
  const n = entries.length;
  const i = Math.min(idx, n - 1);
  const cur = entries[i];

  if (n === 1) {
    return <PhotobleachViewer photobleachData={cur.data} geviName={geviName} companions={cur.companions} />;
  }

  const go = (d: number) => setIdx(p => (((p + d) % n) + n) % n);

  return (
    <div>
      {/* Tab bar — names each curve so it's obvious there are multiple measurements to
          switch between (not just one chart). Also swipeable on touch. */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink/40 mr-0.5">
          <SwitchIcon /> {n} curves —
        </span>
        {entries.map((e, di) => (
          <button
            key={di}
            onClick={() => setIdx(di)}
            aria-current={di === i ? 'true' : undefined}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              di === i
                ? 'bg-klein text-white border-klein shadow-sm'
                : 'bg-surface-low text-ink/70 border-ink/25 hover:border-ink/50 hover:text-ink'
            }`}
          >
            {curveLabel(e.data)}
          </button>
        ))}
      </div>

      {/* Swipeable full-size curve. key=i resets the viewer's hover/inset state on switch. */}
      <div
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchStartX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
      >
        <PhotobleachViewer key={i} photobleachData={cur.data} geviName={geviName} companions={cur.companions} />
      </div>

      {/* "Tap a tab or swipe" hint */}
      <div className="text-center text-[10px] text-ink/40 mt-1.5">Tap a label or swipe to compare conditions</div>
    </div>
  );
}

// Small two-arrows "switch" glyph for the gallery tab bar.
function SwitchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export default PhotobleachViewer;
