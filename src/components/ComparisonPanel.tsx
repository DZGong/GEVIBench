import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { Trash2, GitCompare } from 'lucide-react';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];

interface ComparisonProps {
  compareGEVIs: any[];
  onRemove: (id: string) => void;
  darkMode: boolean;
}

export function ComparisonPanel({ compareGEVIs, onRemove, darkMode }: ComparisonProps) {
  const getCompareRadarData = () => {
    const subjects = ['Bright', 'Speed', 'SNR', 'Range', 'Stable', 'Sub-V'];
    const keys = ['brightness', 'speed', 'snr', 'dynamicRange', 'photostability', 'subthreshold'];
    
    return subjects.map((subject, idx) => {
      const data: any = { subject };
      compareGEVIs.forEach((gevi, gIdx) => {
        // Use a sanitized key name for the dataKey
        const safeName = gevi.name.replace(/[^a-zA-Z0-9]/g, '');
        data[safeName] = gevi[keys[idx]];
      });
      return data;
    });
  };

  if (compareGEVIs.length === 0) return null;

  // Create a safe name for dataKey
  const getSafeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div className={`border rounded-lg p-4 md:p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <GitCompare className="w-5 h-5" />Compare Sensors ({compareGEVIs.length})
        </h3>
      </div>

      {/* Selected GEVIs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {compareGEVIs.map((gevi, idx) => (
          <div key={gevi.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{gevi.name}</span>
            <button onClick={() => onRemove(gevi.id)} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Radar Chart */}
      <div>
        <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Radar Comparison</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={getCompareRadarData()}>
              <PolarGrid stroke={darkMode ? "#4b5563" : "#e5e7eb"} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: darkMode ? '#d1d5db' : '#374151', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: darkMode ? '#9ca3af' : '#9ca3af', fontSize: 10 }} />
              {compareGEVIs.map((gevi, idx) => (
                <Radar key={gevi.id} name={gevi.name} dataKey={getSafeName(gevi.name)} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.2} />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
