/**
 * Providers globaux de l'application
 *
 * Regroupe tous les providers React nécessaires :
 * - QueryClientProvider (TanStack Query)
 * - SessionProvider (Better Auth) - si nécessaire
 *
 * @module app/providers
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Composant Providers
 *
 * Wrapper pour tous les providers client-side de l'application
 */
export function Providers({ children }: { children: React.ReactNode }) {
  /**
   * Instance QueryClient pour TanStack Query
   * Créée dans un useState pour garantir une instance unique par rendu
   */
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Configurer les options par défaut des queries
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
