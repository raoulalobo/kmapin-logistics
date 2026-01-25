/**
 * Layout pour les pages publiques du Front Office
 *
 * Ce layout est utilisé par toutes les pages du groupe (public) :
 * - Page d'accueil (/)
 * - Page de tracking (/tracking)
 * - Pages de services (/services/*)
 * - Page de tarifs (/tarifs)
 *
 * Inclut :
 * - HomepageHeader : Menu de navigation avec détection de session
 * - PublicFooter : Footer avec liens légaux, services et réseaux sociaux
 *
 * La configuration système (nom de la plateforme, couleurs, etc.)
 * est récupérée depuis la base de données et passée aux composants.
 *
 * @module app/(public)/layout
 */

import { HomepageHeader } from '@/components/layouts/homepage-header';
import { PublicFooter } from '@/components/layouts/public-footer';
import { getSystemConfig } from '@/modules/system-config/lib/get-system-config';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout du Front Office
 *
 * Structure :
 * - Header sticky en haut (z-50)
 * - Contenu principal (children)
 * - Footer en bas
 *
 * Récupère la configuration système pour personnaliser l'affichage
 * du nom de la plateforme, des couleurs et des informations légales.
 */
export default async function PublicLayout({ children }: PublicLayoutProps) {
  // Récupérer la configuration système pour personnaliser l'interface
  // Cette configuration est mise en cache pendant 1 heure (voir getSystemConfig)
  const systemConfig = await getSystemConfig();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header dynamique avec configuration système et détection de session */}
      <HomepageHeader
        platformName={systemConfig.platformName}
        platformFullName={systemConfig.platformFullName}
        primaryColor={systemConfig.primaryColor}
      />

      {/* Contenu principal */}
      <main className="flex-1">{children}</main>

      {/* Footer - charge sa propre configuration système (Server Component) */}
      <PublicFooter />
    </div>
  );
}
