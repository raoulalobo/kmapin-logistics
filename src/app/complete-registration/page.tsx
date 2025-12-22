/**
 * Page : Finalisation d'Inscription Prospect
 *
 * Page publique permettant aux prospects (utilisateurs ayant demandé un devis)
 * de finaliser leur inscription en créant un compte.
 *
 * Accès via lien d'invitation envoyé par email avec token.
 * Ex: /complete-registration?token=abc123xyz
 *
 * Gère deux cas:
 * - Email nouveau → Création de compte
 * - Email existant → Connexion et rattachement des devis
 *
 * @module app/complete-registration
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { CompleteRegistrationForm } from '@/components/registration';

/**
 * Métadonnées SEO de la page
 */
export const metadata: Metadata = {
  title: 'Finaliser mon inscription | KmapIn Logistics',
  description:
    'Créez votre compte KmapIn Logistics pour accéder à vos devis et suivre vos expéditions en temps réel.',
  robots: 'noindex, nofollow', // Page privée, ne pas indexer
};

/**
 * Props de la page (searchParams Next.js 14+)
 */
interface CompleteRegistrationPageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Composant de chargement (Suspense fallback)
 */
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#003D82]" />
        <p className="text-lg text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}

/**
 * Wrapper pour gérer les searchParams async (Next.js 15)
 */
async function CompleteRegistrationContent({ searchParams }: CompleteRegistrationPageProps) {
  const params = await searchParams;
  const token = params.token;

  // Vérifier que le token est présent
  if (!token) {
    redirect('/?error=token-manquant');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="mb-8 text-center">
          <nav className="text-sm text-gray-500">
            <a href="/" className="hover:text-[#003D82] transition-colors">
              Accueil
            </a>
            <span className="mx-2">›</span>
            <span className="text-gray-900">Finaliser mon inscription</span>
          </nav>
        </div>

        {/* Formulaire de finalisation */}
        <CompleteRegistrationForm token={token} />

        {/* Note légale */}
        <div className="mt-8 text-center text-sm text-gray-500 max-w-2xl mx-auto">
          <p>
            En créant un compte, vous acceptez nos{' '}
            <a href="/terms" className="text-[#003D82] hover:underline">
              conditions d'utilisation
            </a>{' '}
            et notre{' '}
            <a href="/privacy" className="text-[#003D82] hover:underline">
              politique de confidentialité
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Page Finalisation d'Inscription
 *
 * Server Component qui valide le token et affiche le formulaire approprié
 */
export default function CompleteRegistrationPage(props: CompleteRegistrationPageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CompleteRegistrationContent {...props} />
    </Suspense>
  );
}
