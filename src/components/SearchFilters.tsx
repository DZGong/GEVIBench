import { Search, ChevronDown } from 'lucide-react';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  totalCount?: number;
  speciesOptions?: { name: string; count: number }[];
  speciesFilter?: string | null;
  setSpeciesFilter?: (v: string | null) => void;
}

export function SearchFilters({
  searchTerm, setSearchTerm, totalCount,
  speciesOptions, speciesFilter, setSpeciesFilter,
}: SearchFiltersProps) {
  const fieldClass =
    'py-2 text-base font-sans rounded-md border-2 border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 shadow-md bg-surface-lowest text-ink transition-colors';

  return (
    <div className="mb-3 flex gap-2">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
        <input
          type="text"
          placeholder={totalCount ? `Search ${totalCount} sensors...` : 'Search sensors...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-8 ${fieldClass}`}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/60"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {speciesOptions && speciesOptions.length > 0 && setSpeciesFilter && (
        <div className="relative flex-shrink-0">
          <select
            value={speciesFilter ?? ''}
            onChange={(e) => setSpeciesFilter(e.target.value || null)}
            aria-label="Filter by species the sensor has been used in"
            title="Species in which the sensor has been used, from the samples of its characterization and research papers. Cell lines (HEK, CHO, PC12...) are not counted."
            className={`appearance-none cursor-pointer pl-3 pr-8 ${fieldClass} ${speciesFilter ? 'border-gold' : ''}`}
          >
            <option value="">All species</option>
            {speciesOptions.map(({ name, count }) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50" />
        </div>
      )}
    </div>
  );
}
