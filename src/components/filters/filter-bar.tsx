/**
 * Composant : FilterBar
 *
 * Barre de filtres réutilisable avec :
 * - Filtres par sélection (statut, catégorie, etc.)
 * - Bouton de réinitialisation
 * - Badge de compteur de filtres actifs
 * - Layout responsive
 *
 * @module components/filters
 */

'use client';

import { X, Sliders } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

/**
 * Configuration d'un filtre
 */
export interface FilterConfig {
  /**
   * Clé du filtre (utilisée dans l'URL)
   */
  key: string;

  /**
   * Label affiché pour le filtre
   */
  label: string;

  /**
   * Options disponibles pour ce filtre
   */
  options: Array<{
    value: string;
    label: string;
  }>;

  /**
   * Placeholder quand aucune option sélectionnée
   * @default "Tous"
   */
  placeholder?: string;
}

/**
 * Props du composant FilterBar
 */
interface FilterBarProps {
  /**
   * Configuration des filtres à afficher
   */
  filters: FilterConfig[];

  /**
   * Valeurs actuelles des filtres
   */
  values: Record<string, string>;

  /**
   * Callback appelé quand un filtre change
   */
  onChange: (key: string, value: string | null) => void;

  /**
   * Callback pour réinitialiser tous les filtres
   */
  onReset: () => void;

  /**
   * Indique si des filtres sont actifs
   */
  hasActiveFilters?: boolean;
}

/**
 * Barre de filtres multi-critères
 */
export function FilterBar({
  filters,
  values,
  onChange,
  onReset,
  hasActiveFilters = false,
}: FilterBarProps) {
  // Compter le nombre de filtres actifs
  const activeFiltersCount = Object.values(values).filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Icône et titre */}
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sliders className="h-4 w-4" />
        <span>Filtres</span>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="h-5 min-w-5 px-1">
            {activeFiltersCount}
          </Badge>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={values[filter.key] || '__all__'}
            onValueChange={(value) => onChange(filter.key, value === '__all__' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={filter.placeholder || 'Tous'} />
            </SelectTrigger>
            <SelectContent>
              {/* Option "Tous" pour désélectionner - utilise '__all__' au lieu de '' */}
              <SelectItem value="__all__">
                {filter.placeholder || 'Tous'}
              </SelectItem>

              {/* Options du filtre */}
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* Bouton de réinitialisation */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-9"
        >
          <X className="mr-2 h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
