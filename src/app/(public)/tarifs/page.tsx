/**
 * Page : Tarifs Standards
 *
 * Affiche un tableau interactif des tarifs standards par destination
 * avec filtres de recherche et de mode de transport.
 *
 * Route publique accessible à tous les visiteurs.
 * Hérite du layout (public) qui fournit le HomepageHeader et le PublicFooter.
 *
 * @module app/(public)/tarifs
 */

import { Metadata } from 'next';
import { PricingTable } from '@/components/pricing-table';
import { getSystemConfig } from '@/modules/system-config/lib/get-system-config';

/**
 * Génération des métadonnées SEO dynamiques
 *
 * Utilise le nom de la plateforme depuis la configuration système
 * pour personnaliser le titre de la page des tarifs.
 *
 * @returns Metadata Next.js avec titre dynamique incluant le nom de la plateforme
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = await getSystemConfig();

  return {
    title: `Tarifs Standards - Transport International | ${config.platformFullName}`,
    description:
      'Consultez nos tarifs indicatifs pour le transport international multi-modal (routier, maritime, aérien, ferroviaire). Prix transparents par destination avec délais estimés.',
    keywords: [
      'tarifs transport',
      'prix logistique',
      'transport international',
      'devis transport',
      'fret routier',
      'fret maritime',
      'fret aérien',
      'transport ferroviaire',
    ],
  };
}

/**
 * Page Tarifs Standards
 *
 * Server Component qui affiche le tableau de tarifs avec filtres.
 * Le header et le footer sont fournis par le layout parent (public).
 */
export default function TarifsPage() {
  return (
    <div className="bg-white">
      {/* Container principal — mt-20 pour compenser le header sticky du layout */}
      <div className="container mx-auto px-4 py-12 mt-20">
        {/* En-tête de page */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Tarifs Standards
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez nos prix indicatifs pour le transport international.
            Ces tarifs vous donnent un aperçu de nos services multi-modaux.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              Routier
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
              Maritime
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
              Aérien
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Ferroviaire
            </span>
          </div>
        </div>

        {/* Tableau de tarifs (Client Component avec filtres) */}
        <PricingTable />

        {/* Section CTA */}
        <div className="mt-12 text-center bg-gradient-to-r from-[#003D82] to-[#002952] rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Besoin d'un devis personnalisé ?
          </h2>
          <p className="text-lg text-blue-100 mb-6 max-w-2xl mx-auto">
            Utilisez notre calculateur gratuit pour obtenir une estimation précise
            adaptée à vos besoins spécifiques (poids, volume, type de marchandise).
          </p>
          <a
            href="/#calculateur"
            className="inline-flex items-center justify-center rounded-lg bg-white text-[#003D82] px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Calculer mon devis gratuitement
          </a>
        </div>
      </div>
    </div>
  );
}
