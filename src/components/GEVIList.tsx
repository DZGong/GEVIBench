import { ExternalLink, Link, Sun, Zap, Activity, TrendingUp, Shield, FileText } from 'lucide-react';
import { RainbowText, getGEVIColor } from '../utils';
import type { SortConfig, SortField } from '../types';

interface GEVIListProps {
  gevis: any[];
  selectedGEVI: any;
  onSelect: (gevi: any) => void;
  onAddToCompare: (gevi: any) => void;
  compareGEVIs: any[];
  darkMode: boolean;
  compact?: boolean;
  sortConfig: SortConfig;
  onSortChange: (field: SortField) => void;
}

export function GEVIList({ gevis, selectedGEVI, onSelect, onAddToCompare, compareGEVIs, darkMode, compact = false, sortConfig, onSortChange }: GEVIListProps) {
  // Determine the actual field to use for bar display:
  // - For 'year' sorting, show overall score (not year values)
  // - For all other fields, show the selected field's score
  const sortField = sortConfig.field === 'year' ? 'overall' : sortConfig.field;

  // Get max score based on display field
  const maxScore = Math.max(...gevis.map(g => g[sortField] || 0), 1);
  
  return (
    <div className={`border rounded-lg overflow-hidden sticky top-24 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Header with sort dropdown */}
      <div className={`p-3 border-b ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'} flex items-center justify-between gap-2`}>
        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{gevis.length} sensors</span>
        <div className="flex items-center gap-1">
          <select
            value={sortConfig.field}
            onChange={(e) => onSortChange(e.target.value as SortField)}
            className={`text-xs px-2 py-1 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          >
            <option value="overall">Overall</option>
            <option value="brightness">Brightness</option>
            <option value="speed">Speed</option>
            <option value="snr">SNR</option>
            <option value="dynamicRange">Range</option>
            <option value="photostability">Stable</option>
            <option value="paperCount">Papers</option>
            <option value="year">Year</option>
          </select>
          <button
            onClick={() => onSortChange(sortConfig.field)}
            className={`text-xs px-2 py-1 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            title={sortConfig.order === 'desc' ? 'Ascending' : 'Descending'}
          >
            {sortConfig.order === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>
      <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
        {gevis.map((gevi, idx) => {
          const geviColor = getGEVIColor(gevi);
          return (
          <div
            key={gevi.id}
            className={`flex items-start p-3 transition ${
              selectedGEVI?.id === gevi.id
                ? darkMode ? 'bg-gray-700' : 'bg-blue-50'
                : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
            }`}
          >
            <button onClick={() => onSelect(gevi)} className="flex-1 text-left">
              {compact ? (
                /* Compact view - just name, tag, year, score, description */
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{idx + 1}.</span>
                      {geviColor.color === 'rainbow' ? (
                        <RainbowText text={gevi.name} />
                      ) : (
                        <span className="font-semibold text-base" style={{ color: geviColor.color }}>{gevi.name}</span>
                      )}
                      <span className="text-xs px-1.5 py-0.5 bg-blue-900 text-white rounded">{gevi.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{gevi.year}</span>
                      <span className="text-base font-bold text-blue-500">{gevi.overall}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`text-xs flex-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {gevi.description}
                    </div>
                    <a 
                      href={gevi.paperUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={(e) => e.stopPropagation()} 
                      className={`text-xs flex items-center gap-1 whitespace-nowrap ${darkMode ? 'text-blue-400 hover:underline' : 'text-blue-900 hover:underline'}`}
                      title={gevi.paper}
                    >
                      <Link className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                /* Expanded view - full details */
                <div className="space-y-1">
                  {/* Name, tags, and year on same line */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{idx + 1}.</span>
                      {geviColor.color === 'rainbow' ? (
                        <RainbowText text={gevi.name} />
                      ) : (
                        <span className="font-semibold text-base" style={{ color: geviColor.color }}>{gevi.name}</span>
                      )}
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} title="Emission">{geviColor.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-900 text-white rounded">{gevi.category}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{gevi.year}</span>
                  </div>
                  
                  {/* Score bar (flex) + sub-scores + score based on sort */}
                  <div className="flex items-center gap-2">
                    {/* Score bar scaled relative to display field */}
                    <div className="flex-1 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${((gevi[sortField] || 0) / maxScore) * 100}%` }} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5 ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}><Sun className="w-2.5 h-2.5" />{gevi.brightness}</span>
                      <span className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5 ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}><Zap className="w-2.5 h-2.5" />{gevi.speed}</span>
                      <span className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5 ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}><Activity className="w-2.5 h-2.5" />{gevi.snr}</span>
                      <span className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5 ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}><TrendingUp className="w-2.5 h-2.5" />{gevi.dynamicRange}</span>
                      <span className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5 ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}><Shield className="w-2.5 h-2.5" />{gevi.photostability}</span>
                      <span className={`text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5 ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}><FileText className="w-2.5 h-2.5" />{gevi.paperCount || 0}</span>
                      <span className="text-base font-bold text-blue-500 ml-1">{gevi[sortField] || 0}</span>
                    </div>
                  </div>
                  
                  {/* Description + paper link */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`text-xs flex-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {gevi.description}
                    </div>
                    <a 
                      href={gevi.paperUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={(e) => e.stopPropagation()} 
                      className={`text-xs flex items-center gap-1 whitespace-nowrap ${darkMode ? 'text-blue-400 hover:underline' : 'text-blue-900 hover:underline'}`}
                      title={gevi.paper}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {gevi.paper}
                    </a>
                  </div>
                </div>
              )}
            </button>
            
            {/* Compare button - show when not compact */}
            {!compact && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddToCompare(gevi); }}
                disabled={compareGEVIs.find(g => g.id === gevi.id) || compareGEVIs.length >= 5}
                className={`p-1 rounded ml-1 ${
                  compareGEVIs.find(g => g.id === gevi.id)
                    ? 'text-green-500'
                    : darkMode ? 'text-gray-500 hover:text-green-400' : 'text-gray-400 hover:text-green-600'
                }`}
                title="Add to compare"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
          </div>
        );})}
      </div>
    </div>
  );
}
