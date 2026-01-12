/**
 * Page : Résultats de Tracking Public
 *
 * Affiche les résultats du tracking pour un numéro donné.
 * Cette page est accessible SANS authentification et affiche uniquement
 * les données filtrées (pas de coûts, GPS, métadonnées).
 *
 * Route : /tracking/[trackingNumber]
 * Exemple : /tracking/SHP-20250109-A1B2C
 *
 * Sécurité :
 * - Validation stricte du format de tracking
 * - Filtrage serveur des données sensibles via getPublicTracking()
 * - Shipments DRAFT bloqués (retourne 404)
 * - Métadonnées avec noindex (pas d'indexation Google)
 *
 * @module app/tracking/[trackingNumber]
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Warning } from '@phosphor-icons/react/dist/ssr';

import { getPublicTracking } from '@/modules/tracking';
import { PublicTrackingDisplay } from '@/components/tracking/PublicTrackingDisplay';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Props de la page (params dynamiques)
 */
interface PageProps {
  params: Promise<{
    trackingNumber: string;
  }>;
}

/**
 * Validation du format de tracking number
 * Format attendu : SHP-YYYYMMDD-XXXXX
 */
function isValidTrackingFormat(trackingNumber: string): boolean {
  const regex = /^SHP-\d{8}-[A-Z0-9]{5}$/;
  return regex.test(trackingNumber);
}

/**
 * Génération des métadonnées dynamiques
 * IMPORTANT : noindex pour éviter l'indexation des pages de tracking (privacité)
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { trackingNumber: trackingNumberRaw } = await params;
  const trackingNumber = trackingNumberRaw.toUpperCase();

  return {
    title: `Suivi ${trackingNumber} - Faso Fret Logistics`,
    description: `Suivez l'expédition ${trackingNumber} en temps réel. Consultez le statut actuel et l'historique de livraison.`,
    robots: 'noindex, nofollow', // CRITIQUE : Pas d'indexation Google (privacité)
  };
}

/**
 * Page de résultats de tracking (Server Component)
 *
 * Workflow :
 * 1. Extraire le tracking number des params
 * 2. Valider le format (regex)
 * 3. Appeler getPublicTracking() (Server Action)
 * 4. Afficher PublicTrackingDisplay si trouvé
 * 5. Retourner notFound() si introuvable/DRAFT/format invalide
 */
export default async function TrackingResultPage({ params }: PageProps) {
  const { trackingNumber: trackingNumberRaw } = await params;
  const trackingNumber = trackingNumberRaw.toUpperCase();

  // =========================================================================
  // ÉTAPE 1 : Validation du format
  // =========================================================================
  if (!isValidTrackingFormat(trackingNumber)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Bouton retour */}
          <Button asChild variant="outline" className="mb-6">
            <Link href="/tracking" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Nouvelle recherche
            </Link>
          </Button>

          {/* Message d'erreur : Format invalide */}
          <Alert variant="destructive" className="mb-6">
            <Warning className="h-5 w-5" />
            <AlertTitle className="text-xl">Format de numéro invalide</AlertTitle>
            <AlertDescription className="text-base space-y-2">
              <p>
                Le numéro de tracking <span className="font-mono font-semibold">{trackingNumberRaw}</span>{' '}
                ne correspond pas au format attendu.
              </p>
              <p className="mt-3">
                Format correct : <span className="font-mono">SHP-YYYYMMDD-XXXXX</span>
              </p>
              <p>
                Exemple : <span className="font-mono">SHP-20250109-A1B2C</span>
              </p>
            </AlertDescription>
          </Alert>

          {/* Carte d'aide */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Vérifiez votre numéro</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Le numéro doit commencer par <strong>SHP-</strong></li>
              <li>• Il doit contenir exactement 8 chiffres après le premier tiret</li>
              <li>• Il se termine par 5 caractères alphanumériques en majuscules</li>
              <li>• Exemple valide : <span className="font-mono">SHP-20250109-A1B2C</span></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ÉTAPE 2 : Récupérer les données de tracking (Server Action)
  // =========================================================================
  const tracking = await getPublicTracking(trackingNumber);

  // Si introuvable ou DRAFT → 404
  if (!tracking) {
    notFound();
  }

  // =========================================================================
  // ÉTAPE 3 : Afficher les résultats
  // =========================================================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* En-tête avec bouton retour */}
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/tracking">
              <ArrowLeft className="h-4 w-4" />
              Nouvelle recherche
            </Link>
          </Button>

          {/* Info : Données limitées */}
          <div className="hidden md:block">
            <p className="text-sm text-gray-600">
              Tracking public - Données limitées
            </p>
          </div>
        </div>

        {/* Affichage du tracking */}
        <PublicTrackingDisplay tracking={tracking} />

        {/* Footer : Bouton retour mobile */}
        <div className="mt-8 flex justify-center md:hidden">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/tracking">
              <ArrowLeft className="h-4 w-4" />
              Nouvelle recherche
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
