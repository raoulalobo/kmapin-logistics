/**
 * Layout pour les pages d'authentification (login, register, forgot-password)
 *
 * Ce layout Server Component :
 * 1. Génère les metadata SEO dynamiques avec le nom de la plateforme
 * 2. Récupère la configuration système (nom, couleurs, etc.)
 * 3. Distribue la config aux pages Client Components via SystemConfigProvider
 *
 * Pattern utilisé : La config est récupérée une seule fois ici et partagée
 * avec les pages enfants (login, register) qui sont des Client Components
 * et ne peuvent pas appeler getSystemConfig() directement.
 *
 * @module app/(auth)/layout
 */

import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { getSystemConfig } from '@/modules/system-config/lib/get-system-config';
import { SystemConfigProvider } from '@/components/providers/system-config-provider';

/**
 * Génération des métadonnées SEO dynamiques
 *
 * Utilise le nom de la plateforme depuis la configuration système
 * pour personnaliser le titre et la description des pages d'authentification.
 *
 * Le nom est modifiable par les ADMIN via /dashboard/settings/platform
 *
 * @returns Metadata Next.js avec titre et description dynamiques
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = await getSystemConfig();

  return {
    title: `Authentification - ${config.platformFullName}`,
    description: `Connexion et inscription à la plateforme ${config.platformFullName}`,
  };
}

/**
 * Layout des pages d'authentification
 *
 * Encapsule les pages login/register avec :
 * - SystemConfigProvider pour l'accès à la config dans les Client Components
 * - Toaster pour les notifications (erreurs de connexion, succès, etc.)
 *
 * @param children - Pages d'authentification (login, register, forgot-password)
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Récupérer la configuration système (cachée 1h via unstable_cache)
  // Cette requête ne sera pas refaite pour chaque page enfant
  const config = await getSystemConfig();

  return (
    <SystemConfigProvider config={config}>
      {children}
      <Toaster position="top-center" richColors />
    </SystemConfigProvider>
  );
}
