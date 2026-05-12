import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { getGEVIColor, wavelengthToColor } from '../utils';
import type { SortConfig, SortField } from '../types';

interface GEVIListProps {
  gevis: any[];
  selectedGEVI: any;
  onSelect: (gevi: any) => void;
  onAddToCompare: (gevi: any) => void;
  compareGEVIs: any[];
  compact?: boolean;
  sortConfig: SortConfig;
  onSortChange: (field: SortField) => void;
}

const journalAbbrevs: Record<string, string> = {
  'ACS Chemical Neuroscience': 'ACS Chem. Neurosci.',
  'Advanced Biology': 'Adv. Biol.',
  'Advanced Science': 'Adv. Sci.',
  'European Journal of Neuroscience': 'Eur. J. Neurosci.',
  'Journal of Neuroscience': 'J. Neurosci.',
  'Nature Chemical Biology': 'Nat. Chem. Biol.',
  'Nature Chemistry': 'Nat. Chem.',
  'Nature Communications': 'Nat. Commun.',
  'Nature Methods': 'Nat. Methods',
  'Nature Neuroscience': 'Nat. Neurosci.',
  'PLoS ONE': 'PLoS ONE',
  'Science Advances': 'Sci. Adv.',
  'Scientific Reports': 'Sci. Rep.',
  'J. Neurophysiol.': 'J. Neurophysiol.',
};

function abbreviatePaper(paper: string): string {
  for (const [full, abbrev] of Object.entries(journalAbbrevs)) {
    if (paper.startsWith(full)) return paper.replace(full, abbrev);
  }
  return paper;
}

function fmtTau(v: number): string {
  if (v < 1) return v.toFixed(2);
  if (v < 10) return v.toFixed(1);
  return Math.round(v).toString();
}

type MetricKey = 'brightness' | 'tauOn' | 'tauOff' | 'dynamicRange' | 'sensitivity' | 'photostability';

// invert: true → smaller raw value ranks higher (only τ-based metrics)
const METRICS: { key: MetricKey; sortField: SortField; rawField: keyof any; invert?: boolean; label: string; shortLabel: string; symbol: React.ReactNode; desc: string }[] = [
  { key: 'brightness',    sortField: 'bRel',                 rawField: 'bRel',                label: 'Brightness',    shortLabel: 'B/B_EGFP',    symbol: <>B/B<sub>EGFP</sub></>, desc: 'brightness vs EGFP' },
  { key: 'tauOn',         sortField: 'displayTauOn',         rawField: 'displayTauOn',        invert: true, label: 'τ_on', shortLabel: 'τ_on', symbol: <>τ<sub>on</sub> (ms)</>, desc: 'temperature-preferred activation time constant' },
  { key: 'tauOff',        sortField: 'displayTauOff',        rawField: 'displayTauOff',       invert: true, label: 'τ_off', shortLabel: 'τ_off', symbol: <>τ<sub>off</sub> (ms)</>, desc: 'temperature-preferred decay time constant' },
  { key: 'dynamicRange',  sortField: 'displayDynamicRange',  rawField: 'displayDynamicRange', label: 'Dynamic Range', shortLabel: 'ΔF/F 100mV',  symbol: 'ΔF/F per 100mV', desc: 'median |ΔF/F| across entries' },
  { key: 'sensitivity',   sortField: 'displaySensitivity',   rawField: 'displaySensitivity',  label: 'Sensitivity',   shortLabel: 'ΔF/F AP',     symbol: 'ΔF/F per AP', desc: 'median across entries' },
  { key: 'photostability',sortField: 'displayPhotostab',     rawField: 'displayPhotostab',    label: 'Photostability',shortLabel: 'F_remain%',   symbol: <>F<sub>remain</sub>%</>, desc: '100mW/mm² 1min (normalized)' },
];

function useIsNarrow(breakpoint = 768) {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setNarrow(e.matches);
    setNarrow(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return narrow;
}

function getMetricValue(gevi: any, key: MetricKey, _dimBase: string): React.ReactNode {
  switch (key) {
    case 'brightness':
      return gevi.bRel != null ? `${gevi.bRel.toFixed(2)}×` : '—';
    case 'tauOn':
      return gevi.displayTauOn != null ? fmtTau(gevi.displayTauOn) : '—';
    case 'tauOff':
      return gevi.displayTauOff != null ? fmtTau(gevi.displayTauOff) : '—';
    case 'dynamicRange': {
      const dr = gevi.dynamicRangeData?.[0];
      return dr ? `${dr.deltaF > 0 ? '+' : ''}${dr.deltaF}%` : '—';
    }
    case 'sensitivity': {
      const sens = gevi.sensitivityData?.[0];
      return sens ? `${sens.deltaF}%` : '—';
    }
    case 'photostability':
      return gevi.displayPhotostab != null ? `${Math.round(gevi.displayPhotostab)}%` : '—';
  }
}

function hasMetricValue(gevi: any, key: MetricKey): boolean {
  switch (key) {
    case 'brightness': return gevi.bRel != null;
    case 'tauOn': return gevi.displayTauOn != null;
    case 'tauOff': return gevi.displayTauOff != null;
    case 'dynamicRange': return !!gevi.dynamicRangeData?.[0];
    case 'sensitivity': return !!gevi.sensitivityData?.[0];
    case 'photostability': return gevi.displayPhotostab != null;
  }
}

function extractYear(paper: string): string {
  const match = paper.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : '';
}

// Cell content for the λ ex/em column. Chemogenetic GEVIs depend on a dye/HaloTag
// partner whose spectrum doesn't characterize the sensor itself, so they show
// "Chemogenetic" instead of the raw peaks (the detail-page spectrum panel still
// renders the underlying FP/opsin peaks).
function WavelengthCellContent({ gevi }: { gevi: any }) {
  if (gevi.voltage?.type === 'chemi') {
    return <span className="text-ink/60 italic whitespace-nowrap">Chemogenetic</span>;
  }
  const peakEx = gevi.spectrum?.peakEx;
  const peakEm = gevi.spectrum?.peakEm;
  if (peakEx == null || peakEm == null) return <>—</>;
  return (
    <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: wavelengthToColor(peakEx) }} aria-hidden="true" />
      {peakEx}/{peakEm}
      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: wavelengthToColor(peakEm) }} aria-hidden="true" />
    </span>
  );
}

function hasWavelengthValue(gevi: any): boolean {
  if (gevi.voltage?.type === 'chemi') return true; // shown as "Chemogenetic"
  return gevi.spectrum?.peakEx != null && gevi.spectrum?.peakEm != null;
}

function SortHeader({ symbol, desc, field, sortConfig, onSort, className = '' }: {
  symbol: React.ReactNode;
  desc: string;
  field: SortField;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sortConfig.field === field;
  return (
    <th
      className={`px-2 py-2 font-medium font-sans cursor-pointer select-none hover:text-klein transition-colors whitespace-nowrap relative group ${
        active ? 'text-klein' : 'text-ink'
      } ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-0.5 justify-center" style={{ fontSize: '14px' }}>
        {symbol}
        {active && (
          <span style={{ fontSize: '12px' }}>
            {sortConfig.order === 'desc' ? '▼' : '▲'}
          </span>
        )}
      </div>
      {desc && (
        <div
          style={{ fontSize: '10px' }}
          className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 px-2 py-1 rounded shadow-ambient whitespace-nowrap z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-surface-lowest text-ink/60"
        >
          {desc}
        </div>
      )}
    </th>
  );
}

export function GEVIList({ gevis, selectedGEVI, onSelect, onAddToCompare, compareGEVIs, compact = false, sortConfig, onSortChange }: GEVIListProps) {
  const thBase = 'font-medium text-ink font-sans';
  const cellBase = 'text-ink/80';
  const dimBase = 'text-ink/40';
  const isNarrow = useIsNarrow();
  const [narrowIdx, setNarrowIdx] = useState(0);
  const NARROW_OPTIONS = useMemo(() => {
    const metricOptions = METRICS.map(m => ({ key: m.key as string, sortField: m.sortField, shortLabel: m.shortLabel }));
    const yearOpt = { key: 'year', sortField: 'year' as SortField, shortLabel: 'Year' };
    const wavelengthOpt = { key: 'wavelength', sortField: 'peakEx' as SortField, shortLabel: 'λ ex/em' };
    return [yearOpt, wavelengthOpt, ...metricOptions];
  }, []);
  const currentNarrow = NARROW_OPTIONS[narrowIdx];

  // Compute top-3 GEVI IDs per raw metric (include ties at the 3rd-place value).
  // invert=true metrics (τ-based) rank smaller values higher.
  const top3PerMetric = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    for (const m of METRICS) {
      const dir = m.invert ? 1 : -1;
      const sorted = [...gevis]
        .filter(g => g[m.rawField] != null)
        .sort((a, b) => ((a[m.rawField] as number) - (b[m.rawField] as number)) * dir);
      if (sorted.length < 3) {
        result[m.key] = new Set(sorted.map(g => g.id));
      } else {
        const cutoff = sorted[2][m.rawField] as number;
        result[m.key] = new Set(
          sorted.filter(g => m.invert ? (g[m.rawField] as number) <= cutoff : (g[m.rawField] as number) >= cutoff).map(g => g.id)
        );
      }
    }
    return result;
  }, [gevis]);

  const groupCls = (gevi: any) =>
    `cursor-pointer transition-colors group border-b border-surface ${
      selectedGEVI?.id === gevi.id
        ? 'bg-surface-low'
        : '[&:hover]:bg-surface-low'
    }`;

  return (
    <div className="rounded-lg overflow-hidden bg-surface-lowest shadow-ambient">
      <div className="overflow-x-auto">
        {gevis.length === 0 ? (
          <div className="p-8 text-center text-ink/40">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm font-medium">No sensors match</div>
          </div>
        ) : (compact || isNarrow) ? (
          /* Narrow / mobile view — single swipeable metric column */
          <table className="w-full border-collapse" style={{ fontSize: '14px' }}>
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-surface">
                <th className={`pl-2 pr-2 py-2 text-center ${thBase} w-12`} style={{ fontSize: '14px' }}>#</th>
                <th className={`pl-1 pr-0 py-2 text-left ${thBase}`} style={{ fontSize: '14px', width: '1%', whiteSpace: 'nowrap' }}>Sensor ({gevis.length})</th>
                <th className="px-1 py-2" style={{ minWidth: '150px' }}>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setNarrowIdx((narrowIdx - 1 + NARROW_OPTIONS.length) % NARROW_OPTIONS.length)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-ink/10 text-ink/50"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSortChange(currentNarrow.sortField)}
                      style={{ minWidth: '100px' }}
                      className={`text-center cursor-pointer select-none hover:text-klein transition-colors whitespace-nowrap ${
                        sortConfig.field === currentNarrow.sortField ? 'text-klein font-medium' : 'text-ink font-medium'
                      }`}
                    >
                      <span style={{ fontSize: '14px' }}>
                        {currentNarrow.key === 'year'
                          ? 'Year'
                          : currentNarrow.key === 'wavelength'
                          ? <>λ<sub>ex</sub>/λ<sub>em</sub> (nm)</>
                          : METRICS.find(m => m.key === currentNarrow.key)?.symbol ?? currentNarrow.shortLabel}
                      </span>
                      {sortConfig.field === currentNarrow.sortField && (
                        <span style={{ fontSize: '12px' }} className="ml-0.5">
                          {sortConfig.order === 'desc' ? '▼' : '▲'}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setNarrowIdx((narrowIdx + 1) % NARROW_OPTIONS.length)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-ink/10 text-ink/50"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {NARROW_OPTIONS.map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block w-1 h-1 rounded-full ${i === narrowIdx ? 'bg-klein' : 'bg-ink/20'}`}
                      />
                    ))}
                  </div>
                </th>
              </tr>
            </thead>
            {gevis.map((gevi: any, idx: number) => {
              const geviColor = getGEVIColor(gevi);
              const isYear = currentNarrow.key === 'year';
              const isWavelength = currentNarrow.key === 'wavelength';
              const hasVal = isYear || (isWavelength ? hasWavelengthValue(gevi) : hasMetricValue(gevi, currentNarrow.key as MetricKey));
              return (
                <tbody key={gevi.id} data-gevi-id={gevi.id} onClick={() => onSelect(gevi)} className={groupCls(gevi)}>
                  <tr>
                    <td className={`pl-2 pr-2 pt-3 pb-0 text-center w-12 tabular-nums ${dimBase}`} rowSpan={2} style={{ fontSize: '16px', verticalAlign: 'middle' }}>{sortConfig.field === 'year' || gevi[sortConfig.field] != null ? idx + 1 : '-'}</td>
                    <td className="pl-1 pr-0 pt-3 pb-0" style={{ width: '1%', whiteSpace: 'nowrap' }}>
                      <span className="font-semibold text-ink">{gevi.name}</span>
                      <a
                        href={gevi.paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 whitespace-nowrap text-klein hover:underline ml-1.5"
                        title={gevi.paper}
                        style={{ fontSize: '12px' }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {extractYear(gevi.paper)}
                      </a>
                    </td>
                    {isYear ? (
                      <td className={`px-1 pt-3 pb-0 text-center tabular-nums ${dimBase}`} style={{ fontSize: '16px' }}>
                        {gevi.year}
                      </td>
                    ) : isWavelength ? (
                      <td className={`px-1 pt-3 pb-0 text-center tabular-nums ${hasVal ? cellBase : dimBase}`} style={{ fontSize: '14px' }}>
                        <WavelengthCellContent gevi={gevi} />
                      </td>
                    ) : (() => {
                      const isTop3 = top3PerMetric[currentNarrow.key]?.has(gevi.id);
                      return (
                        <td className={`px-1 pt-3 pb-0 text-center tabular-nums ${hasVal ? cellBase : dimBase}`} style={{ fontSize: '14px' }}>
                          {isTop3 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#FF91AF30' }}>
                              {getMetricValue(gevi, currentNarrow.key as MetricKey, dimBase)}
                            </span>
                          ) : getMetricValue(gevi, currentNarrow.key as MetricKey, dimBase)}
                        </td>
                      );
                    })()}
                  </tr>
                  <tr>
                    <td colSpan={2} className="pl-1 pr-2 pt-0.5 pb-3 text-ink font-sans" style={{ fontSize: '12px', lineHeight: '1.3' }}>
                      {gevi.description}
                    </td>
                  </tr>
                </tbody>
              );
            })}
          </table>
        ) : (
          /* Full tabular view — wide screens */
          <table className="w-full border-collapse" style={{ fontSize: '14px' }}>
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-surface">
                <th className={`pl-2 pr-4 py-2 text-center ${thBase} w-16`} style={{ fontSize: '14px' }}>#</th>
                <th className={`px-1 py-2 text-left ${thBase}`} style={{ fontSize: '14px' }}>Sensor ({gevis.length})</th>
                <SortHeader symbol={<>λ<sub>ex</sub>/λ<sub>em</sub> (nm)</>} desc="peak excitation / emission wavelengths" field="peakEx" sortConfig={sortConfig} onSort={onSortChange} />
                <th className="w-6"></th>
                {METRICS.map(m => (
                  <SortHeader key={m.key} symbol={m.symbol} desc={m.desc} field={m.sortField} sortConfig={sortConfig} onSort={onSortChange} />
                ))}
                <th className="w-4"></th>
                <SortHeader symbol="Year" desc="" field="year" sortConfig={sortConfig} onSort={onSortChange} />
                <th className="w-8"></th>
              </tr>
            </thead>
            {gevis.map((gevi: any, idx: number) => {
              const geviColor = getGEVIColor(gevi);
              return (
                <tbody key={gevi.id} data-gevi-id={gevi.id} onClick={() => onSelect(gevi)} className={groupCls(gevi)}>
                  <tr>
                    <td className={`pl-2 pr-4 pt-3 pb-0 text-center w-16 tabular-nums ${dimBase}`} rowSpan={2} style={{ fontSize: '16px', verticalAlign: 'middle' }}>{sortConfig.field === 'year' || gevi[sortConfig.field] != null ? idx + 1 : '-'}</td>
                    <td className="px-1 pt-3 pb-0">
                      <span className="font-semibold whitespace-nowrap text-ink">{gevi.name}</span>
                      <a
                        href={gevi.paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-klein hover:underline ml-2"
                        title={gevi.paper}
                        style={{ fontSize: '12px' }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span><span className="italic">{abbreviatePaper(gevi.paper).replace(/\s*\d{4}$/, '')}</span> {extractYear(gevi.paper)}</span>
                      </a>
                    </td>
                    <td className={`px-1 pt-3 pb-0 text-center tabular-nums ${hasWavelengthValue(gevi) ? cellBase : dimBase}`} style={{ fontSize: '14px' }}>
                      <WavelengthCellContent gevi={gevi} />
                    </td>
                    <td className="w-6"></td>
                    {METRICS.map(m => {
                      const isTop3 = top3PerMetric[m.key]?.has(gevi.id);
                      return (
                        <td key={m.key} className={`px-1 pt-3 pb-0 text-center tabular-nums ${hasMetricValue(gevi, m.key) ? cellBase : dimBase}`} style={{ fontSize: '14px' }}>
                          {isTop3 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#FF91AF30' }}>
                              {getMetricValue(gevi, m.key, dimBase)}
                            </span>
                          ) : getMetricValue(gevi, m.key, dimBase)}
                        </td>
                      );
                    })}
                    <td className="w-4"></td>
                    <td className={`px-2 pt-3 pb-0 text-center tabular-nums ${dimBase}`} rowSpan={2} style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                      {gevi.year}
                    </td>
                    <td className="px-1 pt-3 pb-0 text-center" rowSpan={2} style={{ verticalAlign: 'middle' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToCompare(gevi); }}
                        disabled={!!compareGEVIs.find((g: any) => g.id === gevi.id) || compareGEVIs.length >= 5}
                        className={`${
                          compareGEVIs.find((g: any) => g.id === gevi.id)
                            ? 'text-green-500'
                            : 'text-ink/40 hover:text-green-600'
                        }`}
                        title="Add to compare"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={9} className="px-1 pt-0.5 pb-3 text-ink font-sans" style={{ fontSize: '12px', lineHeight: '1.3' }}>
                      {gevi.description}
                    </td>
                    <td className="w-4"></td>
                  </tr>
                </tbody>
              );
            })}
          </table>
        )}
      </div>
    </div>
  );
}
