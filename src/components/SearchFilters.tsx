import { Search } from 'lucide-react';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  totalCount?: number;
}

export function SearchFilters({
  searchTerm, setSearchTerm, totalCount,
}: SearchFiltersProps) {
  return (
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
      <input
        type="text"
        placeholder={totalCount ? `Search ${totalCount} sensors...` : 'Search sensors...'}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-8 py-2 text-base font-sans rounded-md border-2 border-gold/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 shadow-md bg-surface-lowest text-ink transition-colors"
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
  );
}
