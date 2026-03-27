import { useState, useEffect } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BonusBadges } from './BonusBadges';
import { BookOpen, ExternalLink, Plus, X, Sun, Zap, Activity, TrendingUp, Shield, FileText, Dna, ChevronDown, ChevronUp } from 'lucide-react';
import { RainbowText, getGEVIColor } from '../utils';
import { SpectrumViewer, SpectrumData } from '../SpectrumViewer';
import { VoltageCurveViewer } from '../VoltageCurveViewer';
import { GEVILineage } from './GEVILineage';
import { SampleUsageChart } from './SampleUsageChart';

const metrics = [
  { key: 'brightness', name: 'Brightness', icon: Sun },
  { key: 'speed', name: 'Speed', icon: Zap },
  { key: 'sensitivity', name: 'Sensitivity', icon: Activity },
  { key: 'dynamicRange', name: 'Range', icon: TrendingUp },
  { key: 'photostability', name: 'Stable', icon: Shield },
  { key: 'popularity', name: 'Popularity', icon: FileText },
];

interface GEVIDetailProps {
  gevi: any;
  onAddToCompare: (gevi: any) => void;
  compareGEVIs: any[];
  darkMode: boolean;
  onClose: () => void;
  onShowFamilyTree?: () => void;
}

function sourceToUrl(source: string): string | null {
  if (!source) return null;
  if (source.startsWith('doi:')) return `https://doi.org/${source.slice(4)}`;
  if (source.startsWith('http')) return source;
  return null;
}

function SourceLink({ source, darkMode }: { source?: string; darkMode: boolean }) {
  if (!source) return null;
  const url = sourceToUrl(source);
  const label = source.startsWith('doi:') ? source : 'Source';
  if (!url) return <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{source}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`text-[10px] whitespace-nowrap ${darkMode ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}`}>
      {label} <ExternalLink className="w-2.5 h-2.5 inline" />
    </a>
  );
}

export function GEVIDetail({ gevi, onAddToCompare, compareGEVIs, darkMode, onClose, onShowFamilyTree }: GEVIDetailProps) {
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>({});
  const toggleMetric = (key: string) => setExpandedMetrics(prev => ({ ...prev, [key]: !prev[key] }));
  useEffect(() => setExpandedMetrics({}), [gevi.id]);

  // Use spectrum data directly from gevi prop
  const spectrumData = gevi.spectrum || null;

  const getRadarData = () => [
    { subject: 'Bright', value: gevi.brightness ?? 0, fullMark: 100 },
    { subject: 'Speed', value: gevi.speed ?? 0, fullMark: 100 },
    { subject: 'Sens', value: gevi.sensitivity ?? 0, fullMark: 100 },
    { subject: 'Range', value: gevi.dynamicRange ?? 0, fullMark: 100 },
    { subject: 'Stable', value: gevi.photostability ?? 0, fullMark: 100 },
    { subject: 'Popularity', value: gevi.popularity ?? 0, fullMark: 100 },
  ];

  return (
    <div className={`border rounded-lg p-4 md:p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-paper border-gray-200'}`}>
      {/* Header with close button */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <button 
            onClick={onClose}
            className={`mb-2 p-1 rounded-md ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            title="Close and return to list"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className={`text-xl md:text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <span style={{ color: getGEVIColor(gevi).color }}>{gevi.name}</span>
          </h3>
          <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{gevi.description}</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-xs px-2 py-1 bg-blue-900 text-white rounded font-medium">{gevi.category}</span>
            <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Published {gevi.year}</span>
          </div>
          <a href={gevi.paperUrl} target="_blank" rel="noopener noreferrer" className={`text-sm flex items-center gap-1 ${darkMode ? 'text-blue-400 hover:underline' : 'text-blue-900 hover:underline'}`}>
            <BookOpen className="w-4 h-4" />{gevi.paper}<ExternalLink className="w-3 h-3" />
          </a>
          {gevi.addgene ? (
            <a href={gevi.addgene.url} target="_blank" rel="noopener noreferrer" className={`text-sm flex items-center gap-1 ${darkMode ? 'text-green-400 hover:underline' : 'text-green-700 hover:underline'}`}>
              <Dna className="w-4 h-4" /> Addgene #{gevi.addgene.id}<ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className={`text-sm flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Dna className="w-4 h-4" /> Addgene: Coming soon
            </span>
          )}
        </div>
        <div className="text-center sm:text-right">
          <div className="text-4xl md:text-5xl font-bold text-blue-400">{gevi.overall ?? 'N/A'}</div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Overall</div>
          <button
            onClick={() => onAddToCompare(gevi)}
            disabled={compareGEVIs.find(g => g.id === gevi.id) || compareGEVIs.length >= 5}
            className={`mt-2 text-xs px-2 py-1 rounded border flex items-center gap-1 mx-auto sm:mx-0 ${
              compareGEVIs.find(g => g.id === gevi.id)
                ? 'text-green-500 border-green-500'
                : darkMode ? 'border-gray-600 text-gray-400 hover:text-green-400' : 'border-gray-300 text-gray-600 hover:text-green-600'
            }`}
          >
            <Plus className="w-3 h-3" /> {compareGEVIs.find(g => g.id === gevi.id) ? 'Added' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        {metrics.map((metric) => (
          <div key={metric.key} className={`rounded-lg p-2 md:p-3 ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <metric.icon className="w-3 h-3" />
              <span className={`text-xs md:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{metric.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-1.5 md:h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                <div className={`h-full rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-900'}`} style={{ width: `${gevi[metric.key] ?? 0}%` }} />
              </div>
              <span className={`text-xs md:text-sm font-semibold w-6 md:w-8 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>{gevi[metric.key] ?? '—'}</span>
            </div>
            {/* Speed */}
            {metric.key === 'speed' && gevi.kinetics?.[0] && (
              <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-green-400' : 'text-green-600'}>τ_on:</span>
                  <span>{gevi.kinetics[0].on} ms</span>
                  <span className={darkMode ? 'text-red-400' : 'text-red-600'}>τ_off:</span>
                  <span>{gevi.kinetics[0].off} ms</span>
                  {gevi.kinetics[0].temperature && (
                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>({gevi.kinetics[0].temperature})</span>
                  )}
                </div>
                <button onClick={() => toggleMetric('speed')} className={`mt-1 flex items-center gap-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
                  {expandedMetrics.speed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {gevi.kinetics.length} {gevi.kinetics.length === 1 ? 'measurement' : 'measurements'}
                </button>
                {expandedMetrics.speed && (
                  <div className={`mt-1.5 pt-1.5 space-y-1 ${darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'}`}>
                    {gevi.kinetics.map((k: any, i: number) => (
                      <div key={i} className={`py-1 ${i < gevi.kinetics.length - 1 ? (darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span>τ_on: {k.on} ms | τ_off: {k.off} ms{k.temperature ? ` (${k.temperature})` : ''}</span>
                          <SourceLink source={k.source} darkMode={darkMode} />
                        </div>
                        {k.note && <div className={`mt-0.5 italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{k.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Sensitivity */}
            {metric.key === 'sensitivity' && gevi.sensitivityData?.[0] && (
              <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <span>ΔF/F per AP:</span>
                  <span className={darkMode ? 'text-green-400' : 'text-green-600'}>
                    {gevi.sensitivityData[0].deltaF}%
                  </span>
                </div>
                <button onClick={() => toggleMetric('sensitivity')} className={`mt-1 flex items-center gap-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
                  {expandedMetrics.sensitivity ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {gevi.sensitivityData.length} {gevi.sensitivityData.length === 1 ? 'measurement' : 'measurements'}
                </button>
                {expandedMetrics.sensitivity && (
                  <div className={`mt-1.5 pt-1.5 space-y-1 ${darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'}`}>
                    {gevi.sensitivityData.map((s: any, i: number) => (
                      <div key={i} className={`py-1 ${i < gevi.sensitivityData.length - 1 ? (darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span>ΔF/F per AP: {s.deltaF}%</span>
                          <SourceLink source={s.source} darkMode={darkMode} />
                        </div>
                        {s.note && <div className={`mt-0.5 italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{s.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Dynamic Range */}
            {metric.key === 'dynamicRange' && gevi.dynamicRangeData?.[0] && (
              <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <span>ΔF/F:</span>
                  <span className={gevi.dynamicRangeData[0].sign === 'negative' ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-green-400' : 'text-green-600')}>
                    {gevi.dynamicRangeData[0].sign === 'negative' ? '-' : '+'}{Math.abs(gevi.dynamicRangeData[0].deltaF)}%
                  </span>
                  <span className="opacity-70">per 100mV</span>
                </div>
                <button onClick={() => toggleMetric('dynamicRange')} className={`mt-1 flex items-center gap-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
                  {expandedMetrics.dynamicRange ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {gevi.dynamicRangeData.length} {gevi.dynamicRangeData.length === 1 ? 'measurement' : 'measurements'}
                </button>
                {expandedMetrics.dynamicRange && (
                  <div className={`mt-1.5 pt-1.5 space-y-1 ${darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'}`}>
                    {gevi.dynamicRangeData.map((d: any, i: number) => (
                      <div key={i} className={`py-1 ${i < gevi.dynamicRangeData.length - 1 ? (darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            <span className={d.sign === 'negative' ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-green-400' : 'text-green-600')}>
                              {d.sign === 'negative' ? '-' : '+'}{Math.abs(d.deltaF)}%
                            </span> per 100mV
                          </span>
                          <SourceLink source={d.source} darkMode={darkMode} />
                        </div>
                        {d.note && <div className={`mt-0.5 italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{d.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Photostability */}
            {metric.key === 'photostability' && gevi.photostabilityData?.[0] && (
              <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <span>Remaining:</span>
                  <span className={darkMode ? 'text-green-400' : 'text-green-600'}>
                    {gevi.photostabilityData[0].brightnessRemaining}%
                  </span>
                  <span className="opacity-70">@ {gevi.photostabilityData[0].illumination}</span>
                </div>
                <div className="opacity-70">{gevi.photostabilityData[0].duration}</div>
                <button onClick={() => toggleMetric('photostability')} className={`mt-1 flex items-center gap-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
                  {expandedMetrics.photostability ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {gevi.photostabilityData.length} {gevi.photostabilityData.length === 1 ? 'measurement' : 'measurements'}
                </button>
                {expandedMetrics.photostability && (
                  <div className={`mt-1.5 pt-1.5 space-y-1 ${darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'}`}>
                    {gevi.photostabilityData.map((p: any, i: number) => (
                      <div key={i} className={`py-1 ${i < gevi.photostabilityData.length - 1 ? (darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span>{p.brightnessRemaining}% remaining @ {p.illumination}, {p.duration}</span>
                          <SourceLink source={p.source} darkMode={darkMode} />
                        </div>
                        {p.note && <div className={`mt-0.5 italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{p.note}</div>}
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
                <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="flex items-center gap-2">
                    <span>B_rel:</span>
                    <span className={darkMode ? 'text-green-400' : 'text-green-600'}>
                      {display.ratio}×
                    </span>
                    <span className="opacity-70">vs {display.reference}</span>
                  </div>
                  <button onClick={() => toggleMetric('brightness')} className={`mt-1 flex items-center gap-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
                    {expandedMetrics.brightness ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {gevi.brightnessData!.length} {gevi.brightnessData!.length === 1 ? 'comparison' : 'comparisons'}
                  </button>
                  {expandedMetrics.brightness && (
                    <div className={`mt-1.5 pt-1.5 space-y-1 ${darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'}`}>
                      {gevi.brightnessData!.map((b: any, i: number) => (
                        <div key={i} className={`py-1 ${i < gevi.brightnessData!.length - 1 ? (darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{b.ratio}× vs {b.reference}</span>
                            <SourceLink source={b.source} darkMode={darkMode} />
                          </div>
                          {b.note && <div className={`mt-0.5 italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{b.note}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Popularity */}
            {metric.key === 'popularity' && gevi.paperCount !== undefined && (
              <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <span>Independent papers:</span>
                  <span className={darkMode ? 'text-green-400' : 'text-green-600'}>
                    {gevi.paperCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Radar Chart + Sample Usage | Lineage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6">
        {/* Left column: radar on top, sample chart below */}
        <div className="flex flex-col gap-4">
          <div className={`border rounded-lg p-4 md:p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-paper border-gray-200'}`}>
            <h4 className={`text-sm font-semibold mb-3 md:mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Performance Profile</h4>
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={getRadarData()}>
                  <PolarGrid stroke={darkMode ? "#4b5563" : "#e5e7eb"} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: darkMode ? '#9ca3af' : '#9ca3af', fontSize: 9 }} />
                  <Radar name={gevi.name} dataKey="value" stroke={darkMode ? "#60a5fa" : "#1e40af"} fill={darkMode ? "#60a5fa" : "#1e40af"} fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4">
              <BonusBadges gevi={gevi} size="md" />
            </div>
          </div>

          {/* Sample Usage Chart */}
          {gevi.researchPapers?.length > 0 && (
            <div className={`border rounded-lg p-4 md:p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-paper border-gray-200'}`}>
              <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Sample Usage</h4>
              <SampleUsageChart mode="single" gevi={gevi} darkMode={darkMode} />
            </div>
          )}
        </div>

        {/* Right column: Genetic Lineage */}
        <div
          className={`cursor-pointer ${onShowFamilyTree ? 'hover:ring-2 hover:ring-blue-500/50 rounded-lg' : ''}`}
          onClick={onShowFamilyTree}
        >
          <GEVILineage gevi={gevi} darkMode={darkMode} />
        </div>
      </div>

      {/* Spectrum Viewer */}
      <div className={`border rounded-lg p-4 md:p-6 mt-4 md:mt-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-paper border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-3 md:mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Emission Spectrum</h4>
        <SpectrumViewer spectrumData={spectrumData} geviName={gevi.name} darkMode={darkMode} />
      </div>

      {/* Voltage Response Curve */}
      <div className={`border rounded-lg p-4 md:p-6 mt-4 md:mt-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-paper border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-3 md:mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>ΔF/F - Voltage Curve</h4>
        <VoltageCurveViewer voltageData={gevi.voltage || null} geviName={gevi.name} darkMode={darkMode} />
      </div>

      {/* Research Papers with Representative Figures */}
      {gevi.researchPapers && gevi.researchPapers.length > 0 && (
        <div className={`border rounded-lg p-4 md:p-6 mt-4 md:mt-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-paper border-gray-200'}`}>
          <h4 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <BookOpen className="w-4 h-4" />Research Papers Using {gevi.name}
          </h4>
          <div className="space-y-4">
            {gevi.researchPapers.map((paper: any, idx: number) => (
              <div key={idx} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <div className="flex gap-4">
                  {/* Representative figure placeholder */}
                  <div className={`w-24 h-24 flex-shrink-0 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} flex items-center justify-center`}>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fig</span>
                  </div>
                  <div className="flex-1">
                    <a href={paper.url} target="_blank" rel="noopener noreferrer" className={`text-sm font-medium ${darkMode ? 'text-blue-400 hover:underline' : 'text-blue-900 hover:underline'}`}>
                      {paper.title}
                    </a>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {paper.authors} • <span className="font-medium">{paper.journal}</span>{paper.year && ` • ${paper.year}`}
                    </div>
                    {paper.sample && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {paper.sample.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean).map((tag: string, i: number) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-50 text-teal-700'}`}>{tag}</span>
                        ))}
                      </div>
                    )}
                    {paper.applications && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {paper.applications.map((app: string, i: number) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{app}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
