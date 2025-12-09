/**
 * Composant : ShipmentsFilters
 *
 * Barre de filtres et recherche pour la liste des expéditions
 * Utilise useFilters pour gérer les URL params avec debouncing
 *
 * @module components/lists
 */

'use client';

import { SearchBar } from '@/components/filters/search-bar';
import { FilterBar, type FilterConfig } from '@/components/filters/filter-bar';
import { useFilters } from '@/hooks/use-filters';

/**
 * Configuration des filtres pour les expéditions
 */
const shipmentsFilters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Statut',
    placeholder: 'Tous les statuts',
    options: [
      { value: 'PENDING', label: 'En attente' },
      { value: 'CONFIRMED', label: 'Confirmé' },
      { value: 'IN_TRANSIT', label: 'En transit' },
      { value: 'AT_PORT', label: 'Au port' },
      { value: 'CUSTOMS', label: 'Douane' },
      { value: 'CUSTOMS_CLEARED', label: 'Dédouané' },
      { value: 'OUT_FOR_DELIVERY', label: 'En livraison' },
      { value: 'DELIVERED', label: 'Livré' },
      { value: 'CANCELLED', label: 'Annulé' },
    ],
  },
];

/**
 * Composant de filtres pour les expéditions
 */
export function ShipmentsFilters() {
  const { search, filters, setSearch, setFilter, resetFilters } = useFilters({
    debounceMs: 300,
  });

  const hasActiveFilters = !!search || Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par tracking, origine, destination, client..."
        className="max-w-md"
      />

      {/* Filtres */}
      <FilterBar
        filters={shipmentsFilters}
        values={filters}
        onChange={setFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
