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
        className="w-full pl-10 pr-8 py-2 text-base font-sans rounded-md focus:outline-none border-b-2 border-ink/10 focus:border-gold bg-surface-lowest text-ink"
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
