import { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BonusBadges } from './BonusBadges';
import { BookOpen, ExternalLink, Plus, X, Sun, Zap, Activity, TrendingUp, Shield, FileText, Dna, ChevronDown, ChevronUp } from 'lucide-react';
import { RainbowText, getGEVIColor, computeSampleSummary, SAMPLE_CATEGORY_ORDER } from '../utils';
import { SpectrumViewer, SpectrumData } from '../SpectrumViewer';
import { VoltageCurveViewer } from '../VoltageCurveViewer';
import { GEVILineage } from './GEVILineage';
import { getDoiCitationMap } from '../geviData';

function formatRatio(ratio: number): string {
  return parseFloat(ratio.toPrecision(2)).toString();
}

const metrics = [
  { key: 'brightness', name: 'Brightness', icon: Sun },
  { key: 'speed', name: 'Speed', icon: Zap },
  { key: 'dynamicRange', name: 'Dynamic Range', icon: TrendingUp },
  { key: 'sensitivity', name: 'Sensitivity', icon: Activity },
  { key: 'photostability', name: 'Photostability', icon: Shield },
  { key: 'popularity', name: 'Popularity', icon: FileText },
];

interface GEVIDetailProps {
  gevi: any;
  onAddToCompare: (gevi: any) => void;
  compareGEVIs: any[];
  onClose: () => void;
  onShowFamilyTree?: () => void;
  peaceMode?: boolean;
}

function sourceToUrl(source: string): string | null {
  if (!source) return null;
  if (source.startsWith('doi:')) return `https://doi.org/${source.slice(4)}`;
  if (source.startsWith('http')) return source;
  return null;
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

export function GEVIDetail({ gevi, onAddToCompare, compareGEVIs, onClose, onShowFamilyTree, peaceMode = false }: GEVIDetailProps) {
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>({});
  const [papersExpanded, setPapersExpanded] = useState(false);
  const papersRef = useRef<HTMLDivElement>(null);
  const toggleMetric = (key: string) => setExpandedMetrics(prev => ({ ...prev, [key]: !prev[key] }));
  useEffect(() => setExpandedMetrics({}), [gevi.id]);

  // Use spectrum data directly from gevi prop
  const spectrumData = gevi.spectrum || null;

  const getRadarData = () => [
    { subject: 'Brightness', value: gevi.brightness ?? 0, fullMark: 100 },
    { subject: 'Speed', value: gevi.speed ?? 0, fullMark: 100 },
    { subject: 'Dyn. Range', value: gevi.dynamicRange ?? 0, fullMark: 100 },
    { subject: 'Sensitivity', value: gevi.sensitivity ?? 0, fullMark: 100 },
    { subject: 'Photostab.', value: gevi.photostability ?? 0, fullMark: 100 },
    { subject: 'Popularity', value: gevi.popularity ?? 0, fullMark: 100 },
  ];

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
            <span className="text-xs px-2 py-1 rounded text-ink" style={{ backgroundColor: '#FF91AF30' }}>Published {gevi.year}</span>
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
          {!peaceMode && (
            <>
              <div className="text-4xl md:text-5xl font-bold text-klein">{gevi.overall ?? 'N/A'}</div>
              <div className="text-sm text-ink">Overall</div>
            </>
          )}
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
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 md:h-2 rounded-full overflow-hidden bg-ink/10">
                <div className="h-full rounded-full bg-gold" style={{ width: `${gevi[metric.key] ?? 0}%` }} />
              </div>
              <span className="text-xs md:text-sm font-semibold w-6 md:w-8 text-right text-ink">{gevi[metric.key] ?? '—'}</span>
            </div>
            {/* Speed */}
            {metric.key === 'speed' && gevi.kinetics?.[0] && (
              <div className="mt-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-ink">τ<sub>on</sub>/τ<sub>off</sub>:</span>
                  <span className="text-ink font-semibold">{gevi.kinetics[0].on}/{gevi.kinetics[0].off} ms</span>
                  {gevi.kinetics[0].temperature && (
                    <span className="text-ink">({gevi.kinetics[0].temperature})</span>
                  )}
                </div>
                <button onClick={() => toggleMetric('speed')} className="mt-1 flex items-center gap-1 text-klein hover:underline">
                  {expandedMetrics.speed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {gevi.kinetics.length} {gevi.kinetics.length === 1 ? 'measurement' : 'measurements'}
                </button>
                {expandedMetrics.speed && (
                  <div className="mt-1.5 pt-1.5 space-y-1 border-t border-ink/15">
                    {gevi.kinetics.map((k: any, i: number) => (
                      <div key={i} className={`py-1 ${i < gevi.kinetics.length - 1 ? 'border-b border-ink/10' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span>τ<sub>on</sub>/τ<sub>off</sub>: {k.on}/{k.off} ms{k.temperature ? ` (${k.temperature})` : ''}</span>
                          <SourceLink source={k.source} />
                        </div>
                        {k.note && <div className="mt-0.5 italic text-ink">{k.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Sensitivity */}
            {metric.key === 'sensitivity' && gevi.sensitivityData?.[0] && (
              <div className="mt-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-ink">ΔF/F<sub>AP</sub>:</span>
                  <span className="text-ink font-semibold">
                    {gevi.sensitivityData[0].deltaF}%
                  </span>
                </div>
                <button onClick={() => toggleMetric('sensitivity')} className="mt-1 flex items-center gap-1 text-klein hover:underline">
                  {expandedMetrics.sensitivity ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {gevi.sensitivityData.length} {gevi.sensitivityData.length === 1 ? 'measurement' : 'measurements'}
                </button>
                {expandedMetrics.sensitivity && (
                  <div className="mt-1.5 pt-1.5 space-y-1 border-t border-ink/15">
                    {gevi.sensitivityData.map((s: any, i: number) => (
                      <div key={i} className={`py-1 ${i < gevi.sensitivityData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span>ΔF/F<sub>AP</sub>: {s.deltaF}%</span>
                          <SourceLink source={s.source} />
                        </div>
                        {s.note && <div className="mt-0.5 italic text-ink">{s.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Dynamic Range */}
            {metric.key === 'dynamicRange' && gevi.dynamicRangeData?.[0] && (
              <div className="mt-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-ink">ΔF/F:</span>
                  <span className="text-ink font-semibold">
                    {gevi.dynamicRangeData[0].sign === 'negative' ? '-' : '+'}{Math.abs(gevi.dynamicRangeData[0].deltaF)}%
                  </span>
                  <span className="text-ink">per 100mV</span>
                </div>
                <button onClick={() => toggleMetric('dynamicRange')} className="mt-1 flex items-center gap-1 text-klein hover:underline">
                  {expandedMetrics.dynamicRange ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {gevi.dynamicRangeData.length} {gevi.dynamicRangeData.length === 1 ? 'measurement' : 'measurements'}
                </button>
                {expandedMetrics.dynamicRange && (
                  <div className="mt-1.5 pt-1.5 space-y-1 border-t border-ink/15">
                    {gevi.dynamicRangeData.map((d: any, i: number) => (
                      <div key={i} className={`py-1 ${i < gevi.dynamicRangeData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            <span className={d.sign === 'negative' ? 'text-red-600' : 'text-green-600'}>
                              {d.sign === 'negative' ? '-' : '+'}{Math.abs(d.deltaF)}%
                            </span> per 100mV
                          </span>
                          <SourceLink source={d.source} />
                        </div>
                        {d.note && <div className="mt-0.5 italic text-ink">{d.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
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
            {metric.key === 'photostability' && Array.isArray(gevi.photostabilityData) && gevi.photostabilityData?.[0] && (
              <div className="mt-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-ink">F<sub>remain</sub>:</span>
                  <span className="text-ink font-semibold">
                    {gevi.photostabilityData[0].brightnessRemaining}%
                  </span>
                  <span className="text-ink">@ {gevi.photostabilityData[0].illumination}</span>
                </div>
                <div className="text-ink">{gevi.photostabilityData[0].duration}</div>
                <button onClick={() => toggleMetric('photostability')} className="mt-1 flex items-center gap-1 text-klein hover:underline">
                  {expandedMetrics.photostability ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {gevi.photostabilityData.length} {gevi.photostabilityData.length === 1 ? 'measurement' : 'measurements'}
                </button>
                {expandedMetrics.photostability && (
                  <div className="mt-1.5 pt-1.5 space-y-1 border-t border-ink/15">
                    {gevi.photostabilityData.map((p: any, i: number) => (
                      <div key={i} className={`py-1 ${i < gevi.photostabilityData.length - 1 ? 'border-b border-ink/10' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span>F<sub>remain</sub>: {p.brightnessRemaining}% @ {p.illumination}, {p.duration}</span>
                          <SourceLink source={p.source} />
                        </div>
                        {p.note && <div className="mt-0.5 italic text-ink">{p.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Brightness */}
            {metric.key === 'brightness' && gevi.brightnessData && gevi.brightnessData.length > 0 && (() => {
              const egfpEntry = gevi.brightnessData!.find((d: any) => d.reference === 'EGFP');
              const display = egfpEntry ?? gevi.brightnessData![0];
              return (
                <div className="mt-2 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-ink">B/B<sub>EGFP</sub>:</span>
                    <span className="text-ink font-semibold">
                      {formatRatio(display.ratio)}×
                    </span>
                    <span className="text-ink">vs {display.reference}</span>
                  </div>
                  <button onClick={() => toggleMetric('brightness')} className="mt-1 flex items-center gap-1 text-klein hover:underline">
                    {expandedMetrics.brightness ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {gevi.brightnessData!.length} {gevi.brightnessData!.length === 1 ? 'comparison' : 'comparisons'}
                  </button>
                  {expandedMetrics.brightness && (
                    <div className="mt-1.5 pt-1.5 space-y-1 border-t border-ink/15">
                      {gevi.brightnessData!.map((b: any, i: number) => (
                        <div key={i} className={`py-1 ${i < gevi.brightnessData!.length - 1 ? 'border-b border-ink/10' : ''}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{formatRatio(b.ratio)}× vs {b.reference}</span>
                            <SourceLink source={b.source} />
                          </div>
                          {b.note && <div className="mt-0.5 italic text-ink">{b.note}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Popularity */}
            {metric.key === 'popularity' && gevi.paperCount !== undefined && (() => {
              const sampleSummary = computeSampleSummary(gevi.researchPapers);
              const sampleEntries = SAMPLE_CATEGORY_ORDER
                .filter(cat => sampleSummary[cat] > 0)
                .map(cat => ({ category: cat, count: sampleSummary[cat] }));
              const totalMeasurements = sampleEntries.reduce((s, e) => s + e.count, 0);
              return (
                <div className="mt-2 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-ink">N<sub>paper</sub>:</span>
                    <span className="text-ink font-semibold">
                      {gevi.paperCount}
                    </span>
                  </div>
                  {totalMeasurements > 0 && (
                    <>
                      <button onClick={() => toggleMetric('popularity')} className="mt-1 flex items-center gap-1 text-klein hover:underline">
                        {expandedMetrics.popularity ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Sampled in {totalMeasurements} {totalMeasurements === 1 ? 'measurement' : 'measurements'}
                      </button>
                      {expandedMetrics.popularity && (
                        <div className="mt-1.5 pt-1.5 space-y-1 border-t border-ink/15">
                          {sampleEntries.map((e, i) => (
                            <div key={e.category} className={`flex items-center justify-between py-0.5 ${i < sampleEntries.length - 1 ? 'border-b border-ink/10' : ''}`}>
                              <span className="text-ink">{e.category}</span>
                              <span className="text-ink font-semibold">{e.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Radar Chart + Sample Usage | Lineage */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mt-6">
        {/* Left column: radar on top, sample chart below */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <div className="border rounded-lg p-4 md:p-6 bg-surface-low border-ink/10">
            <h4 className="text-sm font-semibold mb-3 md:mb-4 text-ink">Performance Profile</h4>
            <div className="flex items-center gap-4">
              <div className="h-48 md:h-64 flex-1 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={getRadarData()}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 9 }} />
                    <Radar name={gevi.name} dataKey="value" stroke="#1e40af" fill="#1e40af" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <BonusBadges gevi={gevi} size="md" vertical />
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
