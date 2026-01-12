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
 * @module app/(public)/layout
 */

import { HomepageHeader } from '@/components/layouts/homepage-header';
import { PublicFooter } from '@/components/layouts/public-footer';

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
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header dynamique avec détection de session */}
      <HomepageHeader />

      {/* Contenu principal */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
