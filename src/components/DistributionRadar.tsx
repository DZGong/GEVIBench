import { useEffect, useMemo, useRef, useState } from 'react';
import type { GEVI } from '../types';
import { getRawEntriesForGEVI, fmtDuration, BIOLUM_RADAR_MARK, type DistributionAxisKey } from '../geviData';

interface DistributionRadarProps {
  gevi?: GEVI;
  // Compare mode: one polygon per GEVI, colored via `colors`. When provided, `gevi` is ignored.
  gevis?: GEVI[];
  colors?: string[];
  compact?: boolean;
  // Enlarges the hexagon and pushes top/bottom labels further vertically
  // (top labels up, bottom labels down) without moving them horizontally,
  // so the polygon takes more of the available area.
  expandHex?: boolean;
}

// ViewBox sized with extra margin around the plot so axis + tick labels never
// press against the container's border.
const VB_W = 600;
const VB_H = 500;
const CX = VB_W / 2;
const CY = VB_H / 2;
const R_OUTER_DEFAULT = 175;
// `expandHex` mode grows the hexagon, but the side labels keep their default
// x position so they don't drift horizontally. 195 is the practical max — at
// this radius, side vertices sit just inside the side labels' starting x so
// the polygon edge doesn't clip into the text.
const R_OUTER_EXPANDED = 195;
const R_INNER = 38;
// Extra vertical shift (in viewBox units) applied to labels in expanded
// mode — top three labels lifted UP, bottom three pushed DOWN. Keeps them
// clear of the enlarged hexagon without moving horizontally.
const EXPANDED_LABEL_YLIFT = 24;

// Fixed absolute-value ticks per axis, ordered [inner, middle, outer] of the
// radar. The three radii (R_INNER, R_MID, R_OUTER) correspond exactly to these
// three tick values, so the hexagonal grid rings align with the tick marks.
//
// For speed axes (τ), inner = slow/large-τ, outer = fast/small-τ. For every
// other axis, inner = weak, outer = strong. This is intentional: outward is
// always "better" so the polygon's overall size reads as relative quality.
type LabelPart = { text: string; sub?: boolean; newline?: boolean };

interface AxisSpec {
  key: DistributionAxisKey;
  // Label parts for SVG rendering — `sub: true` segments become subscripts via <tspan>.
  label: LabelPart[];
  ticks: [number, number, number]; // [inner, middle, outer]
}

const AXES: AxisSpec[] = [
  { key: 'brightness',     label: [{ text: 'B/B' }, { text: 'EGFP', sub: true }],                                                       ticks: [0.1, 1,   10] },
  // Kinetics axis collapses on/off into the per-entry sum (τ_on + τ_off).
  // Inverted: faster (smaller sum) sits on the outer ring.
  { key: 'kinetics',       label: [{ text: 'τ' }, { text: 'on', sub: true }, { text: '+τ' }, { text: 'off', sub: true }, { text: ' (ms)' }], ticks: [100, 10,  1] },
  { key: 'dynamicRange',   label: [{ text: 'ΔF/F%' }, { text: 'per 100mV', newline: true }],                                           ticks: [1,   10,  100] },
  { key: 'subthreshold',   label: [{ text: 'ΔF/F%' }, { text: 'per mV', newline: true }],                                              ticks: [0.01, 0.1, 1] },
  { key: 'sensitivity',    label: [{ text: 'ΔF/F%' }, { text: 'per AP', newline: true }],                                              ticks: [1,   10,  100] },
  // AP width inverted: narrower (smaller-FWHM) optical spike sits on the outer ring.
  { key: 'apWidth',        label: [{ text: 'FWHM' }, { text: 'AP', sub: true }, { text: '(ms)', newline: true }],                       ticks: [10,  3,   1] },
  { key: 'photostability', label: [{ text: 't' }, { text: '75%', sub: true }, { text: ' (s)' }],                                        ticks: [3,   30,  300] },
  // Independent research papers using this sensor — proxy for adoption.
  { key: 'nUsed',          label: [{ text: 'N' }, { text: 'used', sub: true }],                                                         ticks: [1,   10,  100] },
];

function labelToPlainText(parts: LabelPart[]): string {
  return parts.map(p => (p.sub ? `_${p.text}` : p.text)).join(' ');
}

function axisAngle(idx: number, n: number): number {
  return -Math.PI / 2 + (2 * Math.PI * idx) / n;
}

function polar(angle: number, r: number): [number, number] {
  return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r];
}

// Map a raw value to a radius using log-linear interpolation between
// ticks[0] (inner) and ticks[2] (outer). Inverted axes (ticks[0] > ticks[2])
// fall out naturally without a separate invert flag.
//
// Values below the inner tick clip to R_INNER. Values past the outer tick
// extend proportionally past the outer hexagon (log-extrapolation) up to
// T_OVERSHOOT in t-space, so sensors like ASAP4e with ΔF/F ≈ 180% sit
// visibly outside the "100" ring instead of collapsing onto it.
const T_OVERSHOOT = 1.15;

function makeAxisRadialPosition(rOuter: number) {
  const rMid = (R_INNER + rOuter) / 2;
  return function axisRadialPosition(value: number, ticks: [number, number, number]): number {
    if (!(value > 0)) return R_INNER;
    const logInner = Math.log10(ticks[0]);
    const logOuter = Math.log10(ticks[2]);
    const span = logOuter - logInner;
    if (span === 0) return rMid;
    const t = (Math.log10(value) - logInner) / span;
    const clamped = Math.max(0, Math.min(T_OVERSHOOT, t));
    return R_INNER + clamped * (rOuter - R_INNER);
  };
}

function formatValue(v: number, key: DistributionAxisKey): string {
  if (key === 'brightness') return `${v.toPrecision(2)}× EGFP`;
  if (key === 'tauOn' || key === 'tauOff' || key === 'kinetics' || key === 'apWidth') return `${v.toPrecision(2)} ms`;
  if (key === 'photostability') return v >= BIOLUM_RADAR_MARK ? 'bioluminescent (no photobleaching)' : `${fmtDuration(v)} @100mW/mm²`;
  if (key === 'nUsed') return `${v.toFixed(0)} ${v === 1 ? 'paper' : 'papers'}`;
  if (key === 'subthreshold') return `${v.toPrecision(2)}%/mV`;
  return `${v.toPrecision(2)}%`;
}

function formatTickLabel(v: number): string {
  if (v >= 10) return v.toFixed(0);
  if (v >= 1) return v.toString();
  return v.toString();
}

export function DistributionRadar({ gevi, gevis, colors, compact = false, expandHex = false }: DistributionRadarProps) {
  const FONT_AXIS = compact ? 21 : 26;
  const FONT_SUB = compact ? 14 : 18;
  const FONT_TICK = compact ? 14 : 18;
  const R_OUTER = expandHex ? R_OUTER_EXPANDED : R_OUTER_DEFAULT;
  const R_MID = (R_INNER + R_OUTER) / 2;
  const axisRadialPosition = useMemo(() => makeAxisRadialPosition(R_OUTER), [R_OUTER]);
  const [hover, setHover] = useState<{ axisIdx: number; key: DistributionAxisKey; value: number; label: string; name?: string; color?: string } | null>(null);

  const n = AXES.length;

  const compareMode = Array.isArray(gevis) && gevis.length > 0;
  const singleGEVI = compareMode ? null : gevi ?? null;

  const currentEntries = useMemo(
    () => (singleGEVI ? AXES.map(axis => getRawEntriesForGEVI(singleGEVI, axis.key)) : []),
    [singleGEVI]
  );

  const currentMedians = useMemo(
    () =>
      currentEntries.map(entries => {
        if (entries.length === 0) return null;
        const sorted = [...entries].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }),
    [currentEntries]
  );

  const compareMedians = useMemo(() => {
    if (!compareMode) return [];
    return gevis!.map(g =>
      AXES.map(axis => {
        const entries = getRawEntriesForGEVI(g, axis.key);
        if (entries.length === 0) return null;
        const sorted = [...entries].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      })
    );
  }, [compareMode, gevis]);

  // Animation: grow-from-center + fade-in whenever the displayed GEVI(s) change.
  const animKey = compareMode ? gevis!.map(g => g.id).join(',') : singleGEVI?.id ?? '';
  const [animT, setAnimT] = useState(1);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!animKey) return;
    setAnimT(0);
    const start = performance.now();
    const dur = 600;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setAnimT(eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [animKey]);

  // Three grid rings at the tick radii — aligned with every axis's tick marks.
  const gridRadii = [R_INNER, R_MID, R_OUTER];
  const dataTransform = `translate(${CX} ${CY}) scale(${animT}) translate(${-CX} ${-CY})`;

  return (
    <div className="relative w-full h-full">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" overflow="visible">
        {/* Hexagonal grid rings — aligned with the three ticks on each spoke */}
        {gridRadii.map(r => {
          const pts = AXES.map((_, i) => polar(axisAngle(i, n), r).join(',')).join(' ');
          return (
            <polygon
              key={r}
              points={pts}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.18}
              strokeWidth={0.75}
            />
          );
        })}

        {/* Axis spokes + per-axis label — spokes run from the center to R_OUTER.
            Subscripted label parts are rendered inline with <tspan> and a dy shift. */}
        {AXES.map((axis, i) => {
          const angle = axisAngle(i, n);
          const [x2, y2] = polar(angle, R_OUTER);
          // Push straight-down axis labels farther out so they clear the outer
          // tick value that sits just above them along the same vertical line.
          // In expanded mode the polygon is already larger, and the bottom
          // axis carries a multi-line label that would overflow the viewBox
          // at +42, so use the standard +24 there.
          const radialOffset = Math.sin(angle) > 0.7 && !expandHex ? 42 : 24;
          // Decouple label x from y in expanded mode: x is computed against the
          // DEFAULT outer radius so labels don't drift horizontally when the
          // hexagon enlarges; y uses the (larger) actual radius plus a vertical
          // lift so top/bottom *side* labels step out of the hexagon's way.
          // Vertical axes (|sin| > 0.7) get no extra lift — they're already at
          // the vertical extreme and any extra shift clips against the
          // viewBox (visible when the container's aspect matches viewBox
          // exactly, as in the GEVI detail panel).
          const lx = CX + Math.cos(angle) * (R_OUTER_DEFAULT + radialOffset);
          const sinA = Math.sin(angle);
          const yLift = expandHex && Math.abs(sinA) <= 0.7
            ? (sinA < 0 ? -EXPANDED_LABEL_YLIFT : EXPANDED_LABEL_YLIFT)
            : 0;
          const ly = CY + sinA * (R_OUTER + radialOffset) + yLift;
          const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
          return (
            <g key={axis.key}>
              <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={0.2} strokeWidth={0.75} />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={FONT_AXIS}
                fontWeight={500}
                fill="currentColor"
                fillOpacity={0.75}
              >
                {axis.label.map((p, pi) => {
                  const prev = axis.label[pi - 1];
                  if (p.newline) {
                    return (
                      <tspan key={pi} x={lx} dy={FONT_AXIS * 1.15} fontSize={p.sub ? FONT_SUB : FONT_AXIS}>
                        {p.text}
                      </tspan>
                    );
                  }
                  const dy = p.sub && !prev?.sub ? 6 : !p.sub && prev?.sub ? -6 : 0;
                  return (
                    <tspan key={pi} dy={dy} fontSize={p.sub ? FONT_SUB : FONT_AXIS}>
                      {p.text}
                    </tspan>
                  );
                })}
              </text>
            </g>
          );
        })}

        {/* Raw-value tick labels — three per spoke, at each grid ring */}
        {AXES.map((axis, i) => {
          const angle = axisAngle(i, n);
          const perp = angle + Math.PI / 2;
          return (
            <g key={`ticks-${axis.key}`}>
              {axis.ticks.map((value, tIdx) => {
                const r = gridRadii[tIdx];
                const [tx, ty] = polar(angle, r);
                const labelOffset = 11;
                const [lx, ly] = [tx + Math.cos(perp) * labelOffset, ty + Math.sin(perp) * labelOffset];
                return (
                  <text
                    key={`${axis.key}-${value}`}
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={FONT_TICK}
                    fill="currentColor"
                    fillOpacity={0.6}
                  >
                    {formatTickLabel(value)}
                  </text>
                );
              })}
            </g>
          );
        })}

        {/* Single-GEVI mode: polygon through medians + stars for every raw entry */}
        {!compareMode && singleGEVI && (() => {
          const vertices = currentMedians.map((v, i) => {
            if (v === null) return null;
            const r = axisRadialPosition(v, AXES[i].ticks);
            return polar(axisAngle(i, n), r);
          });
          const fillPts = vertices
            .map((v, i) => v ?? polar(axisAngle(i, n), R_INNER))
            .map(p => p.join(','))
            .join(' ');
          return (
            <g transform={dataTransform} style={{ opacity: animT }}>
              <polygon
                points={fillPts}
                fill="#1e40af"
                fillOpacity={0.12}
                stroke="none"
              />
              {vertices.map((v, i) => {
                const next = vertices[(i + 1) % n];
                if (!v || !next) {
                  const a = v ?? polar(axisAngle(i, n), R_INNER);
                  const b = next ?? polar(axisAngle((i + 1) % n, n), R_INNER);
                  return (
                    <line
                      key={`e-${i}`}
                      x1={a[0]}
                      y1={a[1]}
                      x2={b[0]}
                      y2={b[1]}
                      stroke="#1e40af"
                      strokeOpacity={0.4}
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                    />
                  );
                }
                return (
                  <line
                    key={`e-${i}`}
                    x1={v[0]}
                    y1={v[1]}
                    x2={next[0]}
                    y2={next[1]}
                    stroke="#1e40af"
                    strokeOpacity={0.85}
                    strokeWidth={1.75}
                  />
                );
              })}
              {AXES.map((axis, i) => {
                const angle = axisAngle(i, n);
                const entries = currentEntries[i];
                return (
                  <g key={`stars-${axis.key}`}>
                    {entries.map((v, eIdx) => {
                      const r = axisRadialPosition(v, axis.ticks);
                      const [cx, cy] = polar(angle, r);
                      return (
                        <g
                          key={eIdx}
                          onMouseEnter={() =>
                            setHover({ axisIdx: i, key: axis.key, value: v, label: labelToPlainText(axis.label) })
                          }
                          onMouseLeave={() => setHover(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <circle cx={cx} cy={cy} r={4} fill="#1e40af" stroke="white" strokeWidth={1.2} />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* Compare mode: one polygon per GEVI using medians, in each GEVI's color */}
        {compareMode && (
          <g transform={dataTransform} style={{ opacity: animT }}>
            {gevis!.map((g, gIdx) => {
              const color = (colors && colors[gIdx]) || '#1e40af';
              const medians = compareMedians[gIdx];
              const vertices = medians.map((v, i) => {
                if (v === null) return null;
                const r = axisRadialPosition(v, AXES[i].ticks);
                return polar(axisAngle(i, n), r);
              });
              const fillPts = vertices
                .map((v, i) => v ?? polar(axisAngle(i, n), R_INNER))
                .map(p => p.join(','))
                .join(' ');
              return (
                <g key={`cmp-${g.id}`}>
                  <polygon
                    points={fillPts}
                    fill={color}
                    fillOpacity={0.08}
                    stroke="none"
                  />
                  {vertices.map((v, i) => {
                    const next = vertices[(i + 1) % n];
                    const missing = !v || !next;
                    const a = v ?? polar(axisAngle(i, n), R_INNER);
                    const b = next ?? polar(axisAngle((i + 1) % n, n), R_INNER);
                    return (
                      <line
                        key={`e-${g.id}-${i}`}
                        x1={a[0]}
                        y1={a[1]}
                        x2={b[0]}
                        y2={b[1]}
                        stroke={color}
                        strokeOpacity={missing ? 0.4 : 0.9}
                        strokeDasharray={missing ? '3 3' : undefined}
                        strokeWidth={missing ? 1.5 : 1.75}
                      />
                    );
                  })}
                  {vertices.map((v, i) => {
                    if (!v) return null;
                    return (
                      <g
                        key={`pt-${g.id}-${i}`}
                        onMouseEnter={() =>
                          setHover({
                            axisIdx: i,
                            key: AXES[i].key,
                            value: medians[i]!,
                            label: labelToPlainText(AXES[i].label),
                            name: g.name,
                            color,
                          })
                        }
                        onMouseLeave={() => setHover(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle cx={v[0]} cy={v[1]} r={3.5} fill={color} stroke="white" strokeWidth={1.2} />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        )}

        {/* Hover tooltip */}
        {hover && (() => {
          const angle = axisAngle(hover.axisIdx, n);
          const r = axisRadialPosition(hover.value, AXES[hover.axisIdx].ticks);
          const [cx, cy] = polar(angle, r);
          const prefix = hover.name ? `${hover.name} · ` : '';
          const text = `${prefix}${hover.label}: ${formatValue(hover.value, hover.key)}`;
          return (
            <g>
              <rect
                x={cx + 8}
                y={cy - 12}
                width={text.length * 6.2 + 10}
                height={20}
                rx={4}
                fill="#111827"
                fillOpacity={0.92}
              />
              <text
                x={cx + 13}
                y={cy + 2}
                fontSize={11}
                fill="white"
              >
                {text}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
