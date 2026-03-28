import { Search } from 'lucide-react';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}

export function SearchFilters({
  searchTerm, setSearchTerm,
}: SearchFiltersProps) {
  return (
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="Search sensors..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-8 py-2 text-base border rounded-md focus:outline-none focus:border-blue-900 bg-paper-light border-gray-300 text-gray-900"
      />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
