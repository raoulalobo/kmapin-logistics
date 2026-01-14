/**
 * Hook React Query - useCountries
 *
 * Hook personnalisé pour récupérer la liste des pays actifs avec cache intelligent.
 * Utilise TanStack Query pour optimiser les performances et éviter les appels répétés.
 *
 * @module modules/countries/hooks
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { listCountries } from '../actions/country.actions';

/**
 * Type pour un pays (simplifié pour les formulaires)
 */
export type Country = {
  id: string;
  code: string; // Code ISO (ex: "FR", "DE")
  name: string; // Nom en français
};

/**
 * Hook pour récupérer la liste des pays actifs
 *
 * Utilise React Query pour gérer le cache et la synchronisation.
 * Les données sont mises en cache pendant 5 minutes (staleTime) pour
 * éviter les appels répétés à la base de données.
 *
 * **Configuration du cache** :
 * - staleTime: 5 minutes (les pays changent rarement)
 * - cacheTime: 10 minutes (garde en cache même si non utilisé)
 * - refetchOnWindowFocus: false (pas besoin de recharger au focus)
 *
 * **Utilisation dans un formulaire** :
 * ```tsx
 * function MyForm() {
 *   const { data: countries, isLoading, error } = useCountries();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <Select>
 *       {countries?.map((country) => (
 *         <SelectItem key={country.code} value={country.code}>
 *           {country.name}
 *         </SelectItem>
 *       ))}
 *     </Select>
 *   );
 * }
 * ```
 *
 * @returns React Query result avec data, isLoading, error, etc.
 */
export function useCountries() {
  return useQuery({
    queryKey: ['countries', 'active'], // Clé unique pour le cache
    queryFn: async () => {
      const countries = await listCountries(true); // onlyActive = true
      return countries as Country[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - les pays changent rarement
    gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
    refetchOnWindowFocus: false, // Pas besoin de recharger au focus
    refetchOnReconnect: false, // Pas besoin de recharger à la reconnexion
    retry: 3, // Réessayer 3 fois en cas d'erreur
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponentiel
  });
}

/**
 * Hook pour récupérer TOUS les pays (actifs + inactifs)
 *
 * Utile pour les pages d'administration où on veut voir tous les pays.
 *
 * **Utilisation** :
 * ```tsx
 * function AdminCountriesPage() {
 *   const { data: allCountries, isLoading } = useAllCountries();
 *   // ...
 * }
 * ```
 *
 * @returns React Query result avec tous les pays
 */
export function useAllCountries() {
  return useQuery({
    queryKey: ['countries', 'all'], // Clé différente pour tous les pays
    queryFn: async () => {
      const countries = await listCountries(false); // onlyActive = false
      return countries as Country[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
