import { useMemo, useCallback } from 'react';
import type { GEVI, SortField, SortConfig } from '../types';
import { DEFAULT_SORT, DEFAULT_CATEGORY, DEFAULT_YEAR } from '../constants';

interface UseGEVIFilterOptions {
  gevis: GEVI[];
  searchTerm: string;
  categoryFilter: string;
  yearFilter: string;
  sortConfig: SortConfig;
}

interface UseGEVIFilterReturn {
  filteredGEVIs: GEVI[];
  categories: string[];
  years: string[];
  toggleSortOrder: () => void;
  setSortField: (field: SortField) => void;
}

export function useGEVIFilter({
  gevis,
  searchTerm,
  categoryFilter,
  yearFilter,
  sortConfig,
}: UseGEVIFilterOptions): UseGEVIFilterReturn {
  // Extract unique categories and years
  const categories = useMemo(() => {
    const unique = new Set(gevis.map(g => g.category));
    return [DEFAULT_CATEGORY, ...Array.from(unique).sort()];
  }, [gevis]);

  const years = useMemo(() => {
    const unique = new Set(gevis.map(g => g.year).sort((a, b) => a - b));
    return [DEFAULT_YEAR, ...Array.from(unique).map(String)];
  }, [gevis]);

  // Filter and sort GEVIs
  const filteredGEVIs = useMemo(() => {
    return gevis
      .filter(g => {
        const matchesSearch =
          g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === DEFAULT_CATEGORY || g.category === categoryFilter;
        const matchesYear = yearFilter === DEFAULT_YEAR || g.year === parseInt(yearFilter, 10);
        return matchesSearch && matchesCategory && matchesYear;
      })
      .sort((a, b) => {
        const { field, order } = sortConfig;
        const multiplier = order === 'asc' ? 1 : -1;

        if (field === 'year') {
          return (a.year - b.year) * multiplier;
        }

        const aVal = a[field] || 0;
        const bVal = b[field] || 0;
        return (aVal - bVal) * multiplier;
      });
  }, [gevis, searchTerm, categoryFilter, yearFilter, sortConfig]);

  const toggleSortOrder = useCallback(() => {
    // This will be handled by the parent component
  }, []);

  const setSortField = useCallback((_field: SortField) => {
    // This will be handled by the parent component
  }, []);

  return {
    filteredGEVIs,
    categories,
    years,
    toggleSortOrder,
    setSortField,
  };
}
