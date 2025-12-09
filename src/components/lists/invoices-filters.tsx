/**
 * Composant : InvoicesFilters
 *
 * Barre de filtres et recherche pour la liste des factures
 * Utilise useFilters pour gérer les URL params avec debouncing
 *
 * @module components/lists
 */

'use client';

import { SearchBar } from '@/components/filters/search-bar';
import { FilterBar, type FilterConfig } from '@/components/filters/filter-bar';
import { useFilters } from '@/hooks/use-filters';

/**
 * Configuration des filtres pour les factures
 */
const invoicesFilters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Statut',
    placeholder: 'Tous les statuts',
    options: [
      { value: 'DRAFT', label: 'Brouillon' },
      { value: 'SENT', label: 'Envoyée' },
      { value: 'VIEWED', label: 'Vue' },
      { value: 'PAID', label: 'Payée' },
      { value: 'OVERDUE', label: 'En retard' },
      { value: 'CANCELLED', label: 'Annulée' },
    ],
  },
];

/**
 * Composant de filtres pour les factures
 */
export function InvoicesFilters() {
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
        placeholder="Rechercher par numéro de facture, client..."
        className="max-w-md"
      />

      {/* Filtres */}
      <FilterBar
        filters={invoicesFilters}
        values={filters}
        onChange={setFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
