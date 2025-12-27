/**
 * Hooks sécurisés pour Better Auth
 *
 * Gère les incompatibilités entre Better Auth 1.4.5 et React 19.2.1
 *
 * @module lib/auth/hooks
 */

'use client';

import { useState, useEffect } from 'react';
import { authClient } from './client';

/**
 * Hook sécurisé pour récupérer la session utilisateur
 *
 * Gère gracieusement les erreurs de compatibilité React 19 + Better Auth 1.4.5
 *
 * @returns Session utilisateur ou null
 *
 * @example
 * ```tsx
 * const session = useSafeSession();
 *
 * if (session?.user) {
 *   return <div>Bonjour {session.user.name}</div>;
 * }
 * ```
 */
export function useSafeSession() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session côté client uniquement
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // Utiliser l'API fetch pour récupérer la session
    // Plus stable que le hook useSession avec React 19
    fetch('/api/auth/get-session', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        setSession(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erreur lors de la récupération de la session:', err);
        setSession(null);
        setIsLoading(false);
      });
  }, []);

  return { data: session, isLoading };
}