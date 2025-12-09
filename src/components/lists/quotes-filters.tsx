/**
 * Composant : QuotesFilters
 *
 * Barre de filtres et recherche pour la liste des devis
 * Utilise useFilters pour gérer les URL params avec debouncing
 *
 * @module components/lists
 */

'use client';

import { SearchBar } from '@/components/filters/search-bar';
import { FilterBar, type FilterConfig } from '@/components/filters/filter-bar';
import { useFilters } from '@/hooks/use-filters';

/**
 * Configuration des filtres pour les devis
 */
const quotesFilters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Statut',
    placeholder: 'Tous les statuts',
    options: [
      { value: 'DRAFT', label: 'Brouillon' },
      { value: 'SENT', label: 'Envoyé' },
      { value: 'ACCEPTED', label: 'Accepté' },
      { value: 'REJECTED', label: 'Rejeté' },
      { value: 'EXPIRED', label: 'Expiré' },
    ],
  },
];

/**
 * Composant de filtres pour les devis
 */
export function QuotesFilters() {
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
        placeholder="Rechercher par numéro, origine, destination, client..."
        className="max-w-md"
      />

      {/* Filtres */}
      <FilterBar
        filters={quotesFilters}
        values={filters}
        onChange={setFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
