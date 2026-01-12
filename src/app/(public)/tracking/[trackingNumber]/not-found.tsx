/**
 * Page : 404 Personnalisée pour Tracking Non Trouvé
 *
 * Affichée quand un numéro de tracking n'existe pas ou n'est pas accessible.
 * Cas d'usage :
 * - Numéro de tracking inexistant dans la base
 * - Shipment en statut DRAFT (bloqué pour accès public)
 * - Erreur de saisie du numéro
 *
 * Route : /tracking/[trackingNumber]/not-found
 *
 * @module app/tracking/[trackingNumber]/not-found
 */

import Link from 'next/link';
import { Warning, MagnifyingGlass, ChatCircle } from '@phosphor-icons/react/dist/ssr';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Page 404 pour numéro de tracking non trouvé
 *
 * Structure :
 * 1. Alert principal avec message d'erreur
 * 2. Suggestions de résolution
 * 3. Boutons d'action (nouvelle recherche, contact)
 */
export default function TrackingNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* ===================================================================
            ALERT PRINCIPAL : Expédition introuvable
            =================================================================== */}
        <Alert variant="destructive" className="mb-8 border-2">
          <Warning className="h-6 w-6" weight="fill" />
          <AlertTitle className="text-2xl mb-2">
            Expédition introuvable
          </AlertTitle>
          <AlertDescription className="text-base space-y-2">
            <p>
              Le numéro de tracking que vous avez saisi n'existe pas ou n'est pas encore
              accessible publiquement.
            </p>
            <p className="font-semibold mt-3">
              Plusieurs raisons possibles :
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Le numéro de tracking est incorrect ou contient une erreur de saisie</li>
              <li>L'expédition est en cours de création et pas encore finalisée</li>
              <li>Le numéro n'existe pas dans notre système</li>
              <li>L'accès public au tracking n'est pas encore activé pour cette expédition</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* ===================================================================
            SUGGESTIONS : Que faire ?
            =================================================================== */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Carte 1 : Vérifier le numéro */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MagnifyingGlass className="h-5 w-5 text-blue-600" weight="fill" />
                Vérifier votre numéro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                Assurez-vous que le numéro de tracking est correctement saisi :
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Format : <span className="font-mono">SHP-YYYYMMDD-XXXXX</span></li>
                <li>• Exemple : <span className="font-mono">SHP-20250109-A1B2C</span></li>
                <li>• Pas d'espaces ni de caractères spéciaux</li>
                <li>• Lettres en MAJUSCULES uniquement</li>
              </ul>
              <Button asChild className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                <Link href="/tracking" className="gap-2">
                  <MagnifyingGlass className="h-4 w-4" weight="fill" />
                  Nouvelle recherche
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Carte 2 : Contacter le support */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChatCircle className="h-5 w-5 text-green-600" weight="fill" />
                Besoin d'aide ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                Notre équipe support est disponible pour vous aider :
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  <strong>Email :</strong>{' '}
                  <a
                    href="mailto:support@fasofret.com"
                    className="text-blue-600 hover:underline"
                  >
                    support@fasofret.com
                  </a>
                </li>
                <li>
                  <strong>Téléphone :</strong>{' '}
                  <span className="font-mono">+226 XX XX XX XX</span>
                </li>
                <li>
                  <strong>Horaires :</strong> Lun-Ven 8h-18h, Sam 9h-13h
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link href="/contact" className="gap-2">
                  <ChatCircle className="h-4 w-4" weight="fill" />
                  Nous contacter
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ===================================================================
            INFO : Délai de disponibilité
            =================================================================== */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTitle className="text-blue-900">
            Délai de disponibilité du tracking
          </AlertTitle>
          <AlertDescription className="text-blue-800 space-y-2">
            <p>
              Si votre expédition vient d'être créée, le tracking peut ne pas être immédiatement
              disponible. Voici les délais habituels :
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
              <li>
                <strong>Expéditions standard :</strong> Disponible sous 2-4 heures après la
                confirmation
              </li>
              <li>
                <strong>Expéditions express :</strong> Disponible sous 30 minutes
              </li>
              <li>
                <strong>Import/Export international :</strong> Disponible après validation
                douanière (24-48h)
              </li>
            </ul>
            <p className="text-sm mt-3">
              Vous recevrez un email de confirmation avec votre numéro de tracking dès que
              l'expédition sera prête à être suivie.
            </p>
          </AlertDescription>
        </Alert>

        {/* ===================================================================
            FOOTER : Créer un compte
            =================================================================== */}
        <div className="mt-12 pt-8 border-t">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-3">
              Accédez à plus de fonctionnalités
            </h2>
            <p className="mb-6 opacity-90">
              Créez un compte pour gérer vos expéditions, accéder à l'historique complet
              et recevoir des notifications en temps réel.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild className="bg-white text-indigo-600 hover:bg-blue-50">
                <Link href="/sign-up">Créer un compte gratuit</Link>
              </Button>
              <Button asChild variant="outline" className="border-white text-white hover:bg-white/10">
                <Link href="/sign-in">Se connecter</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
