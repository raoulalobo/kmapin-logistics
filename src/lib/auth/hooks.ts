/**
 * Client-side auth hooks
 */

'use client';

import { authClient } from '@/lib/auth/client';

/**
 * Hook sécurisé pour obtenir la session côté client
 *
 * @returns {Object} Données de session
 * @property {Object|null} data - Données de session de l'utilisateur
 * @property {boolean} isLoading - Indique si la session est en cours de chargement
 * @property {Error|null} error - Erreur éventuelle lors du chargement de la session
 * @property {boolean} isAuthenticated - Indique si l'utilisateur est authentifié
 */
export function useSafeSession() {
  const { data: session, isPending, error } = authClient.useSession();

  return {
    data: session ?? null,
    isLoading: isPending,
    error,
    isAuthenticated: !!session?.user,
  };
}
