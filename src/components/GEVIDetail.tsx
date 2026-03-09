import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BonusBadges } from './BonusBadges';
import { BookOpen, ExternalLink, Plus, X, Sun, Zap, Activity, TrendingUp, Shield, FileText, Dna } from 'lucide-react';
import { RainbowText, getGEVIColor } from '../utils';
import { SpectrumViewer } from '../SpectrumViewer';
import { VoltageCurveViewer } from '../VoltageCurveViewer';
import { FamilyTree } from '../FamilyTree';

const metrics = [
  { key: 'brightness', name: 'Brightness', icon: Sun },
  { key: 'speed', name: 'Speed', icon: Zap },
  { key: 'snr', name: 'SNR', icon: Activity },
  { key: 'dynamicRange', name: 'Range', icon: TrendingUp },
  { key: 'photostability', name: 'Stable', icon: Shield },
  { key: 'paperCount', name: 'Papers', icon: FileText },
];

interface GEVIDetailProps {
  gevi: any;
  onAddToCompare: (gevi: any) => void;
  compareGEVIs: any[];
  darkMode: boolean;
  onClose: () => void;
  onShowFamilyTree?: () => void;
}

export function GEVIDetail({ gevi, onAddToCompare, compareGEVIs, darkMode, onClose, onShowFamilyTree }: GEVIDetailProps) {
  const getRadarData = () => [
    { subject: 'Bright', value: gevi.brightness, fullMark: 100 },
    { subject: 'Speed', value: gevi.speed, fullMark: 100 },
    { subject: 'SNR', value: gevi.snr, fullMark: 100 },
    { subject: 'Range', value: gevi.dynamicRange, fullMark: 100 },
    { subject: 'Stable', value: gevi.photostability, fullMark: 100 },
    { subject: 'Papers', value: gevi.paperCount ? Math.min(100, gevi.paperCount * 5) : 0, fullMark: 100 },
  ];

  return (
    <div className={`border rounded-lg p-4 md:p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
            {getGEVIColor(gevi).color === 'rainbow' ? (
              <RainbowText text={gevi.name} />
            ) : (
              <span style={{ color: getGEVIColor(gevi).color }}>{gevi.name}</span>
            )}
            <span className={`text-xs ml-2 font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} title="Emission wavelength">
              {getGEVIColor(gevi).label}
            </span>
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
          <div className="text-4xl md:text-5xl font-bold text-blue-400">{gevi.overall}</div>
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
                <div className={`h-full rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-900'}`} style={{ width: `${gevi[metric.key]}%` }} />
              </div>
              <span className={`text-xs md:text-sm font-semibold w-6 md:w-8 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>{gevi[metric.key]}</span>
            </div>
            {/* Show kinetics for Speed metric */}
            {metric.key === 'speed' && gevi.kinetics && (
              <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <span className={darkMode ? 'text-green-400' : 'text-green-600'}>τ_on:</span>
                  <span>{gevi.kinetics.on} ms</span>
                  <span className={darkMode ? 'text-red-400' : 'text-red-600'}>τ_off:</span>
                  <span>{gevi.kinetics.off} ms</span>
                </div>
                <div className="mt-0.5 opacity-70">{gevi.kinetics.temperature}</div>
              </div>
            )}
            {/* Show dynamic range data for Range metric */}
            {metric.key === 'dynamicRange' && gevi.dynamicRangeData && (
              <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <span>ΔF/F:</span>
                  <span className={gevi.dynamicRangeData.sign === 'negative' ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-green-400' : 'text-green-600')}>
                    {gevi.dynamicRangeData.sign === 'negative' ? '-' : '+'}{gevi.dynamicRangeData.deltaF}%
                  </span>
                  <span className="opacity-70">per 100mV</span>
                </div>
              </div>
            )}
            {/* Show photostability data for Stable metric */}
            {metric.key === 'photostability' && gevi.photostabilityData && (
              <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <span>Remaining:</span>
                  <span className={darkMode ? 'text-green-400' : 'text-green-600'}>
                    {gevi.photostabilityData.brightnessRemaining}%
                  </span>
                  <span className="opacity-70">@ {gevi.photostabilityData.illumination}</span>
                </div>
                <div className="opacity-70">{gevi.photostabilityData.duration}</div>
              </div>
            )}
            {/* Show paper count for Papers metric */}
            {metric.key === 'paperCount' && gevi.paperCount && (
              <div className={`mt-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <span>Papers:</span>
                  <span className={darkMode ? 'text-green-400' : 'text-green-600'}>
                    {gevi.paperCount}
                  </span>
                </div>
                <div className="opacity-70">papers using this GEVI</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Radar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6">
        <div className={`border rounded-lg p-4 md:p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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

        {/* Family Tree */}
        <div className={`border rounded-lg p-4 md:p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h4
            className={`text-sm font-semibold mb-3 md:mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Genetic Lineage
          </h4>
          <div
            className={`cursor-pointer ${onShowFamilyTree ? 'hover:ring-2 hover:ring-blue-500/50 rounded-lg -m-2 p-2' : ''}`}
            onClick={onShowFamilyTree}
          >
            <FamilyTree geviId={gevi.id} darkMode={darkMode} />
          </div>
        </div>
      </div>

      {/* Spectrum Viewer */}
      <div className={`border rounded-lg p-4 md:p-6 mt-4 md:mt-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-3 md:mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Emission Spectrum</h4>
        <SpectrumViewer geviId={gevi.id} darkMode={darkMode} />
      </div>

      {/* Voltage Response Curve */}
      <div className={`border rounded-lg p-4 md:p-6 mt-4 md:mt-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h4 className={`text-sm font-semibold mb-3 md:mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>ΔF/F - Voltage Curve</h4>
        <VoltageCurveViewer geviId={gevi.id} darkMode={darkMode} />
      </div>

      {/* Research Papers with Representative Figures */}
      {gevi.researchPapers && gevi.researchPapers.length > 0 && (
        <div className={`border rounded-lg p-4 md:p-6 mt-4 md:mt-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                    {paper.applications && (
                      <div className="flex flex-wrap gap-1 mt-2">
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
