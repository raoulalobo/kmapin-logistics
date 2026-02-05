/**
 * Provider pour la configuration système
 *
 * Permet aux Client Components d'accéder à la configuration système
 * (nom de la plateforme, couleurs, etc.) récupérée côté serveur.
 *
 * Pattern utilisé : Server Component (layout) récupère la config et la passe
 * au Provider, puis les Client Components utilisent useSystemConfig().
 *
 * Ce pattern est nécessaire car :
 * - getSystemConfig() utilise le cache Next.js et accède à la DB (server-only)
 * - Les pages login/register sont des Client Components ('use client')
 * - Le Context API permet de "passer" les données serveur aux composants client
 *
 * @example
 * // Dans un layout (Server Component)
 * const config = await getSystemConfig();
 * <SystemConfigProvider config={config}>{children}</SystemConfigProvider>
 *
 * // Dans un Client Component
 * const { platformName, platformFullName } = useSystemConfig();
 *
 * @module components/providers/system-config-provider
 */

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PublicSystemConfig } from '@/modules/system-config/lib/get-system-config';

/**
 * Contexte React pour la configuration système
 *
 * Initialisé à null pour détecter l'utilisation hors Provider
 * (useSystemConfig() throw une erreur explicite si le Provider est absent)
 */
const SystemConfigContext = createContext<PublicSystemConfig | null>(null);

/**
 * Hook pour accéder à la configuration système dans les Client Components
 *
 * Récupère la config passée par le SystemConfigProvider du layout parent.
 * Lève une erreur explicite si utilisé hors du Provider pour faciliter le debug.
 *
 * @returns La configuration système complète (platformName, primaryColor, etc.)
 * @throws Error si utilisé hors du SystemConfigProvider
 *
 * @example
 * function LoginBranding() {
 *   const { platformFullName, primaryColor } = useSystemConfig();
 *   return <h1 style={{ color: primaryColor }}>{platformFullName}</h1>;
 * }
 */
export function useSystemConfig(): PublicSystemConfig {
  const context = useContext(SystemConfigContext);

  if (!context) {
    throw new Error(
      'useSystemConfig must be used within a SystemConfigProvider. ' +
        'Wrap your component tree with <SystemConfigProvider config={...}>.'
    );
  }

  return context;
}

/**
 * Props du SystemConfigProvider
 */
interface SystemConfigProviderProps {
  /**
   * Configuration système récupérée côté serveur via getSystemConfig()
   * Contient platformName, platformFullName, primaryColor, etc.
   */
  config: PublicSystemConfig;

  /**
   * Composants enfants qui auront accès à la config via useSystemConfig()
   */
  children: ReactNode;
}

/**
 * Provider pour distribuer la configuration système aux Client Components
 *
 * À utiliser dans les layouts Server Components pour passer la config
 * récupérée de la DB aux pages Client Components.
 *
 * Avantages de ce pattern :
 * - La requête DB se fait une seule fois dans le layout (caché 1h)
 * - Tous les enfants accèdent à la config sans prop drilling
 * - Les Client Components n'ont pas besoin d'importer getSystemConfig()
 *
 * @example
 * // src/app/(auth)/layout.tsx (Server Component)
 * import { getSystemConfig } from '@/modules/system-config/lib/get-system-config';
 * import { SystemConfigProvider } from '@/components/providers/system-config-provider';
 *
 * export default async function AuthLayout({ children }) {
 *   const config = await getSystemConfig();
 *   return (
 *     <SystemConfigProvider config={config}>
 *       {children}
 *     </SystemConfigProvider>
 *   );
 * }
 */
export function SystemConfigProvider({ config, children }: SystemConfigProviderProps) {
  return (
    <SystemConfigContext.Provider value={config}>
      {children}
    </SystemConfigContext.Provider>
  );
}
