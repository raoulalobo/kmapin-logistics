/**
 * Composant : StandardModal
 *
 * Composant modal standardisé pour toute l'application avec :
 * - Recherche intégrée
 * - Filtrage par catégorie
 * - Tri personnalisable
 * - Sélection simple ou multiple
 * - Groupement optionnel par catégorie
 * - Optimisations de performance (mémorisation)
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchBar } from '@/components/filters/search-bar';
import { StandardModalItemComponent } from './standard-modal-item';
import { StandardModalFooter } from './standard-modal-footer';
import type { StandardModalProps } from './standard-modal-types';
import { cn } from '@/lib/utils';

/**
 * Map des classes Tailwind pour les largeurs maximales
 * Utilisé pour configurer la taille de la modale
 */
const MAX_WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
} as const;

/**
 * Composant StandardModal
 *
 * Modal réutilisable pour sélectionner des items avec recherche,
 * filtres et tri intégrés.
 *
 * @template T - Type des données associées aux items
 *
 * @example
 * ```tsx
 * <StandardModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Sélectionner des permissions"
 *   description="Choisissez les permissions à accorder"
 *   items={permissionItems}
 *   selectedIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   selectionMode="multiple"
 *   filters={{
 *     searchEnabled: true,
 *     searchPlaceholder: 'Rechercher...',
 *     filterOptions: [
 *       { label: 'Opérations', value: 'operations' },
 *     ],
 *     sortOptions: [
 *       {
 *         label: 'Alphabétique',
 *         value: 'alpha',
 *         sortFn: (a, b) => a.label.localeCompare(b.label),
 *       },
 *     ],
 *   }}
 *   groupByCategory={true}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export function StandardModal<T = any>({
  open,
  onOpenChange,
  title,
  description,
  items,
  selectionMode = 'multiple',
  selectedIds,
  onSelectionChange,
  filters,
  onSubmit,
  addNew,
  labels,
  isLoading = false,
  maxWidth = '2xl',
  maxHeight = '90vh',
  groupByCategory = false,
}: StandardModalProps<T>) {
  // ========================================
  // État local pour recherche, filtre et tri
  // ========================================

  /** Requête de recherche */
  const [searchQuery, setSearchQuery] = useState('');

  /** Valeur du filtre par catégorie (défaut: 'all') */
  const [filterValue, setFilterValue] = useState<string>('all');

  /** Valeur du tri sélectionné */
  const [sortValue, setSortValue] = useState<string>(
    filters?.sortOptions?.[0]?.value || 'default'
  );

  // ========================================
  // Filtrage et tri mémorisés (performance)
  // ========================================

  /**
   * Items filtrés et triés
   * Recalculé uniquement quand items, searchQuery, filterValue ou sortValue changent
   */
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // 1. Filtrage par recherche (si activé)
    if (searchQuery && filters?.searchEnabled) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    // 2. Filtrage par catégorie (si sélectionnée)
    if (filterValue !== 'all') {
      result = result.filter((item) => item.category === filterValue);
    }

    // 3. Tri (si option de tri sélectionnée)
    const sortOption = filters?.sortOptions?.find(
      (opt) => opt.value === sortValue
    );
    if (sortOption?.sortFn) {
      result.sort(sortOption.sortFn);
    }

    return result;
  }, [items, searchQuery, filterValue, sortValue, filters]);

  /**
   * Items groupés par catégorie
   * Recalculé uniquement quand filteredAndSortedItems ou groupByCategory changent
   */
  const groupedItems = useMemo(() => {
    // Si pas de groupement, retourner un seul groupe par défaut
    if (!groupByCategory) {
      return { default: filteredAndSortedItems };
    }

    // Grouper les items par catégorie
    return filteredAndSortedItems.reduce((acc, item) => {
      const category = item.category || 'Autres';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof filteredAndSortedItems>);
  }, [filteredAndSortedItems, groupByCategory]);

  // ========================================
  // Gestion de la sélection
  // ========================================

  /**
   * Gère le toggle d'un item
   * Mode single : remplace la sélection
   * Mode multiple : ajoute/retire de la sélection
   */
  const handleToggle = useCallback(
    (id: string) => {
      if (selectionMode === 'single') {
        // Mode single : sélectionner uniquement cet item
        onSelectionChange?.([id]);
      } else {
        // Mode multiple : toggle dans la liste
        const newSelection = selectedIds.includes(id)
          ? selectedIds.filter((selectedId) => selectedId !== id)
          : [...selectedIds, id];
        onSelectionChange?.(newSelection);
      }
    },
    [selectionMode, selectedIds, onSelectionChange]
  );

  /**
   * Gère la soumission de la modale
   * Appelle onSubmit avec les IDs sélectionnés
   */
  const handleSubmit = useCallback(() => {
    onSubmit?.(selectedIds);
  }, [onSubmit, selectedIds]);

  // ========================================
  // Rendu du composant
  // ========================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Largeur maximale configurable
          MAX_WIDTH_CLASSES[maxWidth],
          // Scroll natif (pas de ScrollArea pour éviter les bugs d'overlays)
          'overflow-y-auto'
        )}
        style={{ maxHeight }}
      >
        {/* En-tête : Titre + Description */}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Barre de recherche (si activée) */}
        {filters?.searchEnabled && (
          <div className="pt-2">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={filters.searchPlaceholder || 'Rechercher...'}
            />
          </div>
        )}

        {/* Filtres et tri */}
        {(filters?.filterOptions || filters?.sortOptions) && (
          <div className="flex gap-2 pt-2">
            {/* Dropdown de filtre par catégorie */}
            {filters?.filterOptions && filters.filterOptions.length > 0 && (
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue
                    placeholder={filters.filterLabel || 'Filtrer'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {filters.filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Dropdown de tri */}
            {filters?.sortOptions && filters.sortOptions.length > 0 && (
              <Select value={sortValue} onValueChange={setSortValue}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={filters.sortLabel || 'Trier'} />
                </SelectTrigger>
                <SelectContent>
                  {filters.sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Liste des items (scrollable) */}
        <div className="space-y-2 pr-2 pt-4">
          {/* État vide : Aucun élément trouvé */}
          {filteredAndSortedItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Aucun élément trouvé
            </p>
          ) : groupByCategory ? (
            // Affichage groupé par catégorie
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="space-y-2">
                {/* Titre de la catégorie */}
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 pt-2">
                  {category}
                </h4>

                {/* Items de la catégorie */}
                {categoryItems.map((item) => (
                  <StandardModalItemComponent
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            ))
          ) : (
            // Affichage linéaire sans groupement
            filteredAndSortedItems.map((item) => (
              <StandardModalItemComponent
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onToggle={handleToggle}
              />
            ))
          )}
        </div>

        {/* Footer : Boutons d'action */}
        <StandardModalFooter
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          addNew={addNew}
          labels={labels}
          isLoading={isLoading}
          isSubmitDisabled={selectedIds.length === 0}
        />
      </DialogContent>
    </Dialog>
  );
}
