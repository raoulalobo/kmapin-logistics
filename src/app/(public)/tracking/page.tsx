/**
 * Page : Recherche de Tracking Public
 *
 * Page publique (sans authentification) permettant aux utilisateurs de rechercher
 * une expédition en saisissant son numéro de tracking.
 *
 * Route : /tracking
 *
 * Features :
 * - Formulaire de recherche avec validation
 * - Section d'aide "Comment trouver mon numéro ?"
 * - Informations sur le format du numéro
 * - Incitation à créer un compte
 *
 * @module app/tracking
 */

import { Metadata } from 'next';
import { Package, Truck } from '@phosphor-icons/react/dist/ssr';

import { PublicTrackingSearch } from '@/components/tracking/PublicTrackingSearch';

/**
 * Métadonnées SEO de la page
 */
export const metadata: Metadata = {
  title: 'Suivi de colis - Faso Fret Logistics',
  description:
    'Suivez votre expédition en temps réel avec votre numéro de tracking. Accédez au statut actuel et à l\'historique de livraison.',
  keywords: [
    'suivi colis',
    'tracking',
    'livraison',
    'expédition',
    'Faso Fret',
    'transport',
  ],
};

/**
 * Page de recherche de tracking
 *
 * Structure :
 * 1. En-tête avec titre et description
 * 2. Formulaire de recherche (PublicTrackingSearch)
 * 3. Section d'aide avec cartes informatives
 */
export default function TrackingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===================================================================
          HERO SECTION BLEUE
          =================================================================== */}
      <section className="relative bg-gradient-to-r from-[#003D82] to-[#0052A3] text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <Package className="h-12 w-12" weight="fill" />
              <h1 className="text-5xl font-bold">Suivi de Colis en Temps Réel</h1>
            </div>
            <p className="text-xl text-blue-100 mb-8">
              Suivez votre expédition à chaque étape de son parcours. Saisissez votre
              numéro de tracking ci-dessous pour accéder aux informations en temps réel.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================
          CONTAINER PRINCIPAL
          =================================================================== */}
      <div className="container mx-auto px-4 py-12 max-w-6xl bg-white">

        {/* ===================================================================
            FORMULAIRE DE RECHERCHE
            =================================================================== */}
        <div className="mb-16">
          <PublicTrackingSearch />
        </div>

        {/* ===================================================================
            SECTION AIDE : Comment trouver mon numéro ?
            =================================================================== */}
        <div className="pt-12 border-t">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">
            Où trouver votre numéro de tracking ?
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Carte 1 : Email de confirmation */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="bg-blue-100 h-12 w-12 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Email de confirmation</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Votre numéro de tracking est indiqué dans l'email de confirmation d'expédition
                que vous avez reçu lors de la création de votre commande. Cherchez un email
                avec l'objet "Confirmation d'expédition".
              </p>
            </div>

            {/* Carte 2 : Document de transport */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="bg-green-100 h-12 w-12 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Document de transport</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Le numéro de tracking figure en haut du bordereau de transport (lettre de voiture)
                fourni avec votre colis. Le format commence toujours par "SHP-" suivi de
                chiffres et lettres.
              </p>
            </div>

            {/* Carte 3 : Contact support */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="bg-purple-100 h-12 w-12 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Contactez-nous</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Vous ne trouvez pas votre numéro de tracking ? Notre équipe support est
                disponible 24/7 pour vous aider. Contactez-nous par email ou téléphone avec
                votre référence de commande.
              </p>
            </div>
          </div>

          {/* Format du numéro */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">
              Format du numéro de tracking
            </h3>
            <p className="text-blue-800 mb-2">
              Votre numéro de tracking suit ce format :
            </p>
            <p className="font-mono text-2xl text-center py-4 bg-white rounded-lg border border-blue-200 text-blue-900">
              SHP-YYYYMMDD-XXXXX
            </p>
            <p className="text-sm text-blue-700 mt-3">
              <strong>Exemple :</strong>{' '}
              <span className="font-mono">SHP-20250109-A1B2C</span>
            </p>
            <ul className="text-sm text-blue-700 mt-3 space-y-1">
              <li>• <strong>SHP-</strong> : Préfixe standard (Shipment)</li>
              <li>• <strong>YYYYMMDD</strong> : Date de création (année, mois, jour)</li>
              <li>• <strong>XXXXX</strong> : Code unique alphanumérique</li>
            </ul>
          </div>
        </div>

        {/* ===================================================================
            FOOTER : Avantages d'un compte
            =================================================================== */}
        <div className="mt-16 pt-12 border-t">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">
              Profitez de toutes les fonctionnalités
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Créez un compte gratuit pour accéder à l'historique complet, aux documents
              et aux notifications en temps réel
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/sign-up"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Créer un compte
              </a>
              <a
                href="/sign-in"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Se connecter
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
