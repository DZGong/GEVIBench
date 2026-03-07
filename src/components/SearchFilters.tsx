import { Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { SortConfig, SortField } from '../types';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  yearFilter: string;
  setYearFilter: (v: string) => void;
  sortConfig: SortConfig;
  onSortChange: (field: SortField) => void;
  categories: string[];
  years: string[];
}

export function SearchFilters({
  searchTerm, setSearchTerm,
  categoryFilter, setCategoryFilter,
  yearFilter, setYearFilter,
  sortConfig, onSortChange,
  categories, years,
}: SearchFiltersProps) {
  const { darkMode } = useTheme();

  return (
    <div className={`border rounded-lg p-3 md:p-4 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search sensors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-sm md:text-base border rounded-md focus:outline-none focus:border-blue-900 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`flex-1 min-w-[120px] px-2 py-2 text-sm border rounded-md ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className={`flex-1 min-w-[100px] px-2 py-2 text-sm border rounded-md ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
          >
            {years.map((year) => (
              <option key={year} value={year}>{year === 'All' ? 'All Years' : year}</option>
            ))}
          </select>
          <select
            value={sortConfig.field}
            onChange={(e) => onSortChange(e.target.value as SortField)}
            className={`flex-1 min-w-[120px] px-2 py-2 text-sm border rounded-md ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
          >
            <option value="overall">Overall</option>
            <option value="brightness">Brightness</option>
            <option value="speed">Speed</option>
            <option value="snr">SNR</option>
            <option value="dynamicRange">Dynamic Range</option>
            <option value="photostability">Photostability</option>
            <option value="paperCount">Papers</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>
    </div>
  );
}
