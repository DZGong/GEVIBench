import { useState, useEffect } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { getGEVIColor } from '../utils';
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

type MetricKey = 'brightness' | 'speed' | 'dynamicRange' | 'sensitivity' | 'photostability' | 'popularity';

const METRICS: { key: MetricKey; sortField: SortField; label: string; shortLabel: string; symbol: React.ReactNode; desc: string }[] = [
  { key: 'brightness', sortField: 'brightness', label: 'Brightness', shortLabel: 'B/B_EGFP', symbol: <>B/B<sub>EGFP</sub></>, desc: 'brightness vs EGFP' },
  { key: 'speed', sortField: 'speed', label: 'Kinetics', shortLabel: 'τ_on/τ_off', symbol: <>τ<sub>on</sub>/τ<sub>off</sub> (ms)</>, desc: '' },
  { key: 'dynamicRange', sortField: 'dynamicRange', label: 'Dynamic Range', shortLabel: 'ΔF/F 100mV', symbol: 'ΔF/F per 100mV', desc: '' },
  { key: 'sensitivity', sortField: 'sensitivity', label: 'Sensitivity', shortLabel: 'ΔF/F AP', symbol: 'ΔF/F per AP', desc: '' },
  { key: 'photostability', sortField: 'photostability', label: 'Photostability', shortLabel: 'F_remain%', symbol: <>F<sub>remain</sub>%</>, desc: '100mW/mm² 1min illumination' },
  { key: 'popularity', sortField: 'popularity', label: 'Papers', shortLabel: 'Paper#', symbol: 'Paper#', desc: '' },
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

function getMetricValue(gevi: any, key: MetricKey, dimBase: string): React.ReactNode {
  switch (key) {
    case 'brightness':
      return gevi.bRel != null ? `${gevi.bRel.toFixed(2)}×` : '—';
    case 'speed':
      return gevi.displayTauOn != null
        ? <span>{fmtTau(gevi.displayTauOn)}<span className={dimBase}>/</span>{fmtTau(gevi.displayTauOff)}</span>
        : '—';
    case 'dynamicRange': {
      const dr = gevi.dynamicRangeData?.[0];
      return dr ? `${dr.deltaF > 0 ? '+' : ''}${dr.deltaF}%` : '—';
    }
    case 'sensitivity': {
      const sens = gevi.sensitivityData?.[0];
      return sens ? `${sens.deltaF}%` : '—';
    }
    case 'photostability':
      return gevi.photostability != null ? `${gevi.photostability}%` : '—';
    case 'popularity':
      return gevi.paperCount || 0;
  }
}

function hasMetricValue(gevi: any, key: MetricKey): boolean {
  switch (key) {
    case 'brightness': return gevi.bRel != null;
    case 'speed': return gevi.displayTauOn != null;
    case 'dynamicRange': return !!gevi.dynamicRangeData?.[0];
    case 'sensitivity': return !!gevi.sensitivityData?.[0];
    case 'photostability': return gevi.photostability != null;
    case 'popularity': return true;
  }
}

function extractYear(paper: string): string {
  const match = paper.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : '';
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
      className={`px-2 py-2 font-medium cursor-pointer select-none hover:text-blue-400 transition-colors whitespace-nowrap relative group ${
        active ? 'text-blue-500' : 'text-gray-500'
      } ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-0.5 justify-center" style={{ fontSize: '14px' }}>
        {symbol}
        <span style={{ fontSize: '10px' }}>
          {active ? (sortConfig.order === 'desc' ? '▼' : '▲') : '⇅'}
        </span>
      </div>
      {desc && (
        <div
          style={{ fontSize: '10px' }}
          className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-600 border border-gray-200"
        >
          {desc}
        </div>
      )}
    </th>
  );
}

export function GEVIList({ gevis, selectedGEVI, onSelect, onAddToCompare, compareGEVIs, compact = false, sortConfig, onSortChange }: GEVIListProps) {
  const thBase = 'font-medium text-gray-500';
  const cellBase = 'text-gray-700';
  const dimBase = 'text-gray-400';
  const isNarrow = useIsNarrow();
  const [metricIdx, setMetricIdx] = useState(0);
  const currentMetric = METRICS[metricIdx];

  const rowCls = (gevi: any) =>
    `cursor-pointer border-b transition-colors ${
      selectedGEVI?.id === gevi.id
        ? 'bg-blue-50'
        : 'hover:bg-gray-50'
    } border-gray-100`;

  return (
    <div className="border rounded-lg overflow-hidden sticky top-24 bg-paper border-gray-200">
      <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
        {gevis.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm font-medium">No sensors match</div>
          </div>
        ) : compact ? (
          /* Compact table — name + score only */
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-paper">
              <tr className="border-b border-gray-200">
                <th className={`px-2 py-1.5 text-left ${thBase}`} style={{ fontSize: '14px' }}>#</th>
                <th className={`px-2 py-1.5 text-left ${thBase}`} style={{ fontSize: '14px' }}>Sensor</th>
                <SortHeader symbol="Score" desc="" field="overall" sortConfig={sortConfig} onSort={onSortChange} />
              </tr>
            </thead>
            <tbody>
              {gevis.map((gevi: any, idx: number) => {
                const geviColor = getGEVIColor(gevi);
                return (
                  <tr key={gevi.id} onClick={() => onSelect(gevi)} className={rowCls(gevi)}>
                    <td className={`px-2 py-1.5 ${dimBase}`}>{idx + 1}</td>
                    <td className="px-2 py-1.5">
                      <span className="font-semibold" style={{ color: geviColor.color }}>{gevi.name}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold text-blue-500">{gevi.overall ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : isNarrow ? (
          /* Narrow / mobile view — single swipeable metric column */
          <table className="w-full border-collapse" style={{ fontSize: '14px' }}>
            <thead className="sticky top-0 z-10 bg-paper">
              <tr className="border-b border-gray-200">
                <th className={`pl-2 pr-2 py-2 text-center ${thBase} w-12`} style={{ fontSize: '14px' }}>Rank</th>
                <th className={`pl-1 pr-0 py-2 text-left ${thBase}`} style={{ fontSize: '14px', width: '1%', whiteSpace: 'nowrap' }}>Sensor ({gevis.length})</th>
                <th className="px-1 py-2" style={{ minWidth: '80px' }}>
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      onClick={() => setMetricIdx((metricIdx - 1 + METRICS.length) % METRICS.length)}
                      className="p-0.5 rounded hover:bg-gray-600/30 text-gray-500"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSortChange(currentMetric.sortField)}
                      className={`text-center cursor-pointer select-none hover:text-blue-400 transition-colors whitespace-nowrap ${
                        sortConfig.field === currentMetric.sortField ? 'text-blue-500 font-medium' : 'text-gray-500 font-medium'
                      }`}
                    >
                      <span style={{ fontSize: '14px' }}>{currentMetric.shortLabel}</span>
                      <span style={{ fontSize: '10px' }} className="ml-0.5">
                        {sortConfig.field === currentMetric.sortField ? (sortConfig.order === 'desc' ? '▼' : '▲') : '⇅'}
                      </span>
                    </button>
                    <button
                      onClick={() => setMetricIdx((metricIdx + 1) % METRICS.length)}
                      className="p-0.5 rounded hover:bg-gray-600/30 text-gray-500"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {METRICS.map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block w-1 h-1 rounded-full ${i === metricIdx ? 'bg-blue-500' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                </th>
                <SortHeader symbol="Score" desc="" field="overall" sortConfig={sortConfig} onSort={onSortChange} />
                <th className={`px-1 py-2 text-center ${thBase}`} style={{ fontSize: '14px' }}>Link</th>
              </tr>
            </thead>
            <tbody>
              {gevis.map((gevi: any, idx: number) => {
                const geviColor = getGEVIColor(gevi);
                const hasVal = hasMetricValue(gevi, currentMetric.key);
                return (
                  <tr key={gevi.id} onClick={() => onSelect(gevi)} className={rowCls(gevi)}>
                    <td className={`pl-2 pr-2 py-2.5 text-center w-12 ${dimBase}`}>{idx + 1}</td>
                    <td className="pl-1 pr-0 py-2.5" style={{ width: '1%', whiteSpace: 'nowrap' }}>
                      <span className="font-semibold" style={{ color: geviColor.color }}>{gevi.name}</span>
                    </td>
                    <td className={`px-1 py-2.5 text-center tabular-nums ${hasVal ? cellBase : dimBase}`} style={{ fontSize: '12px' }}>
                      {getMetricValue(gevi, currentMetric.key, dimBase)}
                    </td>
                    <td className="px-1 py-2.5 text-center font-bold text-blue-500 tabular-nums">
                      {gevi.overall ?? '—'}
                    </td>
                    <td className="px-1 py-2.5 text-center" style={{ fontSize: '12px' }}>
                      <a
                        href={gevi.paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 whitespace-nowrap text-blue-900 hover:underline"
                        title={gevi.paper}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {extractYear(gevi.paper)}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Full tabular view — wide screens */
          <table className="w-full border-collapse" style={{ fontSize: '14px' }}>
            <thead className="sticky top-0 z-10 bg-paper">
              <tr className="border-b border-gray-200">
                <th className={`pl-2 pr-4 py-2 text-center ${thBase} w-16`} style={{ fontSize: '14px' }}>Rank</th>
                <th className={`px-1 py-2 text-left ${thBase}`} style={{ fontSize: '14px' }}>Sensor ({gevis.length})</th>
                {METRICS.map(m => (
                  <SortHeader key={m.key} symbol={m.symbol} desc={m.desc} field={m.sortField} sortConfig={sortConfig} onSort={onSortChange} />
                ))}
                <th className="w-6"></th>
                <SortHeader symbol="Score" desc="" field="overall" sortConfig={sortConfig} onSort={onSortChange} />
                <th className={`px-1 py-2 text-center ${thBase}`} style={{ fontSize: '14px' }}>Link</th>
              </tr>
            </thead>
            <tbody>
              {gevis.map((gevi: any, idx: number) => {
                const geviColor = getGEVIColor(gevi);
                return (
                  <tr key={gevi.id} onClick={() => onSelect(gevi)} className={rowCls(gevi)}>
                    <td className={`pl-2 pr-4 py-2.5 text-center w-16 ${dimBase}`}>{idx + 1}</td>
                    <td className="px-1 py-2.5">
                      <span className="font-semibold whitespace-nowrap" style={{ color: geviColor.color }}>{gevi.name}</span>
                    </td>
                    {METRICS.map(m => (
                      <td key={m.key} className={`px-1 py-2.5 text-center tabular-nums ${hasMetricValue(gevi, m.key) ? cellBase : dimBase}`} style={{ fontSize: '12px' }}>
                        {getMetricValue(gevi, m.key, dimBase)}
                      </td>
                    ))}
                    <td className="w-6"></td>
                    <td className="px-1 py-2.5 text-center font-bold text-blue-500 tabular-nums">
                      {gevi.overall ?? '—'}
                    </td>
                    <td className="px-1 py-2.5 text-right" style={{ fontSize: '12px' }}>
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={gevi.paperUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 whitespace-nowrap text-blue-900 hover:underline"
                          title={gevi.paper}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {abbreviatePaper(gevi.paper)}
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); onAddToCompare(gevi); }}
                          disabled={!!compareGEVIs.find((g: any) => g.id === gevi.id) || compareGEVIs.length >= 5}
                          className={`${
                            compareGEVIs.find((g: any) => g.id === gevi.id)
                              ? 'text-green-500'
                              : 'text-gray-400 hover:text-green-600'
                          }`}
                          title="Add to compare"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
