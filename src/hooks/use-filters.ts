/**
 * Hook : useFilters
 *
 * Hook personnalisé pour gérer les filtres et la recherche avec URL params
 * - Synchronisation automatique avec l'URL
 * - Debouncing pour la recherche
 * - Navigation sans rechargement complet de page
 *
 * @module hooks
 */

'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * Options de configuration du hook
 */
interface UseFiltersOptions {
  /**
   * Délai de debounce pour la recherche en millisecondes
   * @default 300
   */
  debounceMs?: number;
}

/**
 * Valeur de retour du hook
 */
interface UseFiltersReturn {
  /**
   * Valeur actuelle de la recherche
   */
  search: string;

  /**
   * Filtres actifs (clé-valeur)
   */
  filters: Record<string, string>;

  /**
   * Mettre à jour la valeur de recherche
   */
  setSearch: (value: string) => void;

  /**
   * Mettre à jour un filtre spécifique
   */
  setFilter: (key: string, value: string | null) => void;

  /**
   * Réinitialiser tous les filtres
   */
  resetFilters: () => void;

  /**
   * Indique si une navigation est en cours
   */
  isPending: boolean;
}

/**
 * Hook pour gérer les filtres et la recherche avec URL params
 *
 * @example
 * ```tsx
 * function MyList() {
 *   const { search, filters, setSearch, setFilter, resetFilters } = useFilters();
 *
 *   return (
 *     <div>
 *       <input value={search} onChange={(e) => setSearch(e.target.value)} />
 *       <select onChange={(e) => setFilter('status', e.target.value)}>
 *         <option value="">Tous</option>
 *         <option value="active">Actif</option>
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFilters(options: UseFiltersOptions = {}): UseFiltersReturn {
  const { debounceMs = 300 } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // État local pour la recherche (avant debounce)
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');

  // Extraire tous les filtres depuis l'URL
  const filters: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== 'search' && key !== 'page') {
      filters[key] = value;
    }
  });

  /**
   * Construire une nouvelle URL avec les params mis à jour
   */
  const buildUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Appliquer les mises à jour
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Réinitialiser la page à 1 quand on change les filtres
      if (Object.keys(updates).some((key) => key !== 'page')) {
        params.set('page', '1');
      }

      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams]
  );

  /**
   * Mettre à jour la recherche avec debouncing
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchValue !== currentSearch) {
        startTransition(() => {
          router.push(buildUrl({ search: searchValue || null }));
        });
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchValue, debounceMs, buildUrl, router, searchParams]);

  /**
   * Mettre à jour un filtre spécifique
   */
  const setFilter = useCallback(
    (key: string, value: string | null) => {
      startTransition(() => {
        router.push(buildUrl({ [key]: value }));
      });
    },
    [buildUrl, router]
  );

  /**
   * Réinitialiser tous les filtres
   */
  const resetFilters = useCallback(() => {
    startTransition(() => {
      router.push(pathname);
    });
    setSearchValue('');
  }, [pathname, router]);

  return {
    search: searchValue,
    filters,
    setSearch: setSearchValue,
    setFilter,
    resetFilters,
    isPending,
  };
}
