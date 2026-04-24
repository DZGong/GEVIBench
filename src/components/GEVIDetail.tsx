import { useState, useRef } from 'react';
import { BonusBadges } from './BonusBadges';
import { BookOpen, ExternalLink, Plus, X, Sun, Zap, Activity, TrendingUp, Shield, Dna, ChevronDown, ChevronUp, StickyNote } from 'lucide-react';
import { SpectrumViewer, SpectrumData } from '../SpectrumViewer';
import { VoltageCurveViewer } from '../VoltageCurveViewer';
import { GEVILineage } from './GEVILineage';
import { DistributionRadar } from './DistributionRadar';
import { getDoiCitationMap } from '../geviData';

function formatRatio(ratio: number): string {
  return parseFloat(ratio.toPrecision(2)).toString();
}

const metrics = [
  { key: 'brightness', name: <>B/B<sub>EGFP</sub></>, icon: Sun },
  { key: 'tauOn', name: <>τ<sub>on</sub> (ms)</>, icon: Zap },
  { key: 'dynamicRange', name: <>ΔF/F per 100mV</>, icon: TrendingUp },
  { key: 'sensitivity', name: <>ΔF/F per AP</>, icon: Activity },
  { key: 'photostability', name: <>F<sub>remain</sub>%</>, icon: Shield },
  { key: 'tauOff', name: <>τ<sub>off</sub> (ms)</>, icon: Zap },
];

interface GEVIDetailProps {
  gevi: any;
  onAddToCompare: (gevi: any) => void;
  compareGEVIs: any[];
  onClose: () => void;
  onShowFamilyTree?: () => void;
}

function sourceToUrl(source: string): string | null {
  if (!source) return null;
  if (source.startsWith('doi:')) return `https://doi.org/${source.slice(4)}`;
  if (source.startsWith('http')) return source;
  return null;
}

function NoteTip({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <span className="group relative inline-flex items-center">
      <StickyNote className="w-3 h-3 text-ink/40 hover:text-ink/70 cursor-help" />
      <span className="pointer-events-none absolute bottom-full right-0 mb-1 hidden group-hover:block z-50 w-56 px-2 py-1 text-[10px] italic text-white bg-ink rounded shadow-md normal-case leading-snug whitespace-normal">
        {note}
      </span>
    </span>
  );
}

function SourceLink({ source }: { source?: string }) {
  if (!source) return null;
  const url = sourceToUrl(source);
  let label = 'Source';
  if (source.startsWith('doi:')) {
    const doi = source.slice(4);
    const citationMap = getDoiCitationMap();
    label = citationMap[doi] || source;
  }
  if (!url) return <span className="text-[10px] text-ink">{source}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] whitespace-nowrap text-klein hover:underline">
      {label} <ExternalLink className="w-2.5 h-2.5 inline" />
    </a>
  );
}

export function GEVIDetail({ gevi, onAddToCompare, compareGEVIs, onClose, onShowFamilyTree }: GEVIDetailProps) {
  const [papersExpanded, setPapersExpanded] = useState(false);
  const papersRef = useRef<HTMLDivElement>(null);

  // Use spectrum data directly from gevi prop
  const spectrumData = gevi.spectrum || null;

  return (
    <div className="rounded-lg p-4 md:p-6 mb-6 bg-surface-lowest shadow-ambient">
      {/* Close button */}
      <button
        onClick={onClose}
        className="mb-2 p-1 rounded-md hover:bg-surface-low text-ink/50"
        title="Close and return to list"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header: name + info left, score right */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-xl md:text-2xl font-semibold mb-1 text-ink flex items-baseline gap-2">
            <span className="text-ink">{gevi.name}</span>
            {gevi.lastUpdated && (
              <span className="text-xs font-normal text-ink/40">Updated {gevi.lastUpdated}</span>
            )}
          </h3>
          <p className="text-sm mb-2 text-ink font-sans">{gevi.description}</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-xs px-2 py-1 bg-klein text-white rounded font-medium">{gevi.category}</span>
            <BonusBadges gevi={gevi} variant="pill" />
          </div>
          <a href={gevi.paperUrl} target="_blank" rel="noopener noreferrer" className="text-sm inline-flex items-center gap-1 text-klein hover:underline">
            <BookOpen className="w-4 h-4" />{gevi.paper}<ExternalLink className="w-3 h-3" />
          </a>
          <br />
          {gevi.addgene ? (
            <a href={gevi.addgene.url} target="_blank" rel="noopener noreferrer" className="text-sm inline-flex items-center gap-1 text-green-700 hover:underline">
              <Dna className="w-4 h-4" /> Addgene #{gevi.addgene.id}<ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-sm inline-flex items-center gap-1 text-ink/40">
              <Dna className="w-4 h-4" /> Addgene: Coming soon
            </span>
          )}
        </div>
        <div className="text-center sm:text-right">
          <button
            onClick={() => onAddToCompare(gevi)}
            disabled={compareGEVIs.find(g => g.id === gevi.id) || compareGEVIs.length >= 5}
            className={`mt-2 text-xs px-2 py-1 rounded border flex items-center gap-1 mx-auto sm:mx-0 ${
              compareGEVIs.find(g => g.id === gevi.id)
                ? 'text-green-500 border-green-500'
                : 'border-ink/15 text-ink/60 hover:text-gold hover:border-gold'
            }`}
          >
            <Plus className="w-3 h-3" /> {compareGEVIs.find(g => g.id === gevi.id) ? 'Added' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-lg p-2 md:p-3 bg-surface-low">
            <div className="flex items-center gap-1.5 mb-1.5">
              <metric.icon className="w-3 h-3" />
              <span className="text-xs md:text-sm font-medium text-ink">{metric.name}</span>
            </div>
            {/* τ_on */}
            {metric.key === 'tauOn' && gevi.kinetics?.length > 0 && (
              <div className="mt-2 text-[10px] space-y-1">
                {gevi.kinetics.map((k: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.kinetics.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink"><span className="font-semibold">{k.on} ms</span>{k.temperature ? ` (${k.temperature})` : ''}</span>
                      <span className="flex items-center gap-1.5">
                        <NoteTip note={k.note} />
                        <SourceLink source={k.source} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* τ_off */}
            {metric.key === 'tauOff' && gevi.kinetics?.length > 0 && (
              <div className="mt-2 text-[10px] space-y-1">
                {gevi.kinetics.map((k: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.kinetics.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink"><span className="font-semibold">{k.off} ms</span>{k.temperature ? ` (${k.temperature})` : ''}</span>
                      <span className="flex items-center gap-1.5">
                        <NoteTip note={k.note} />
                        <SourceLink source={k.source} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Sensitivity */}
            {metric.key === 'sensitivity' && gevi.sensitivityData?.length > 0 && (
              <div className="mt-2 text-[10px] space-y-1">
                {gevi.sensitivityData.map((s: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.sensitivityData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink">ΔF/F<sub>AP</sub>: <span className="font-semibold">{s.deltaF}%</span></span>
                      <span className="flex items-center gap-1.5">
                        <NoteTip note={s.note} />
                        <SourceLink source={s.source} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Dynamic Range */}
            {metric.key === 'dynamicRange' && gevi.dynamicRangeData?.length > 0 && (
              <div className="mt-2 text-[10px] space-y-1">
                {gevi.dynamicRangeData.map((d: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.dynamicRangeData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <span className={`font-semibold ${d.sign === 'negative' ? 'text-red-600' : 'text-green-600'}`}>
                          {d.sign === 'negative' ? '-' : '+'}{Math.abs(d.deltaF)}%
                        </span> <span className="text-ink">per 100mV</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <NoteTip note={d.note} />
                        <SourceLink source={d.source} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Photostability */}
            {metric.key === 'photostability' && gevi.photostabilityData === 'bioluminescent' && (
              <div className="mt-2 text-[10px] text-ink">
                <div className="flex items-center gap-2">
                  <span>Bioluminescent — no photobleaching</span>
                </div>
              </div>
            )}
            {metric.key === 'photostability' && Array.isArray(gevi.photostabilityData) && gevi.photostabilityData.length > 0 && (
              <div className="mt-2 text-[10px] space-y-1">
                {gevi.photostabilityData.map((p: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.photostabilityData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink">F<sub>remain</sub>: <span className="font-semibold">{p.brightnessRemaining}%</span> @ {p.illumination}, {p.duration}</span>
                      <span className="flex items-center gap-1.5">
                        <NoteTip note={p.note} />
                        <SourceLink source={p.source} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Brightness */}
            {metric.key === 'brightness' && gevi.brightnessData && gevi.brightnessData.length > 0 && (
              <div className="mt-2 text-[10px] space-y-1">
                {gevi.brightnessData.map((b: any, i: number) => (
                  <div key={i} className={`py-1 ${i < gevi.brightnessData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink"><span className="font-semibold">{formatRatio(b.ratio)}×</span> vs {b.reference}</span>
                      <span className="flex items-center gap-1.5">
                        <NoteTip note={b.note} />
                        <SourceLink source={b.source} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Radar Chart + Sample Usage | Lineage */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mt-6">
        {/* Left column: radar on top, sample chart below */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <div className="border rounded-lg p-4 md:p-6 bg-surface-low border-ink/10">
            <h4 className="text-sm font-semibold mb-3 md:mb-4 text-ink">Performance Profile</h4>
            <div className="w-full aspect-[6/5]">
              <DistributionRadar gevi={gevi} />
            </div>
          </div>

          {/* Spectrum Viewer */}
          <div>
            <SpectrumViewer spectrumData={spectrumData} geviName={gevi.name} />
          </div>
        </div>

        {/* Right column: Genetic Lineage */}
        <div
          className={`flex-shrink-0 cursor-pointer ${onShowFamilyTree ? 'hover:ring-2 hover:ring-blue-500/50 rounded-lg' : ''}`}
          onClick={onShowFamilyTree}
        >
          <GEVILineage gevi={gevi} />
        </div>
      </div>

      {/* Voltage Response Curve */}
      <div className="border rounded-lg p-4 md:p-6 mt-4 md:mt-6 bg-surface-low border-ink/10">
        <h4 className="text-sm font-semibold mb-3 md:mb-4 text-ink">ΔF/F - Voltage Curve</h4>
        <VoltageCurveViewer voltageData={gevi.voltage || null} geviName={gevi.name} />
      </div>

      {/* Research Papers with Representative Figures */}
      {gevi.researchPapers && gevi.researchPapers.length > 0 && (
        <div ref={papersRef} className="border rounded-lg p-4 md:p-6 mt-4 md:mt-6 bg-surface-low border-ink/10">
          <button
            onClick={() => setPapersExpanded(!papersExpanded)}
            className="w-full text-sm font-semibold flex items-center gap-2 text-ink hover:text-ink transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Research Papers Using {gevi.name}
            <span className="text-xs font-normal text-ink ml-1">({gevi.researchPapers.length})</span>
            <span className="ml-auto">
              {papersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>
          {papersExpanded && <div className="space-y-4 mt-4">
            {gevi.researchPapers.map((paper: any, idx: number) => (
              <div key={idx} className="p-3 rounded-lg bg-surface-low">
                <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium text-klein hover:underline">
                  {paper.title}
                </a>
                <div className="text-xs mt-1 text-ink">
                  {paper.authors} • <span className="font-medium italic">{paper.journal}</span>{paper.year && ` • ${paper.year}`}
                </div>
                {paper.sample && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {paper.sample.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean).map((tag: string, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-ink" style={{ backgroundColor: '#FF91AF30' }}>{tag}</span>
                    ))}
                  </div>
                )}
                {paper.applications && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {paper.applications.map((app: string, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded text-ink" style={{ backgroundColor: '#FF91AF30' }}>{app}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>}
        </div>
      )}
    </div>
  );
}
