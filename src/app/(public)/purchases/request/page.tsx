/**
 * Page : Demande d'Achat Délégué Publique (Invité)
 *
 * User Story US-1.1 : Création de demande sans authentification
 *
 * Page accessible SANS authentification permettant à tout utilisateur
 * de créer une demande d'achat délégué. Après soumission :
 * - Demande créée avec userId = null (invité)
 * - Token unique généré pour suivi pendant 72h
 * - Email envoyé avec lien de suivi
 * - US-1.3 : Rattachement automatique si l'utilisateur crée un compte plus tard
 *
 * Workflow :
 * 1. Remplit le formulaire → PurchaseRequest créé (guest)
 * 2. Reçoit email avec token de suivi (72h)
 * 3. Optionnel : Crée un compte → Rattachement automatique par email/téléphone
 */

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  CheckCircle,
  Mail,
  Clock,
  ArrowRight,
  Home,
  Shield,
  CreditCard,
} from 'lucide-react';
import { PurchaseForm } from '@/components/purchases';
import { createGuestPurchase, type CreateGuestPurchaseInput } from '@/modules/purchases';

/**
 * Page de création de demande d'achat invité
 */
export default function PurchaseRequestPage() {
  const router = useRouter();

  /**
   * Handler de soumission du formulaire
   */
  const handleSubmit = async (data: CreateGuestPurchaseInput) => {
    try {
      console.log('📤 [Page] Envoi vers Server Action:', data);
      const result = await createGuestPurchase(data);
      console.log('📥 [Page] Résultat reçu de Server Action:', result);

      if (result.success && result.data?.trackingToken) {
        console.log('✅ [Page] Redirection vers:', `/purchases/track/${result.data.trackingToken}`);
        // Rediriger vers la page de suivi avec le token
        router.push(`/purchases/track/${result.data.trackingToken}`);
      } else {
        console.error('⚠️ [Page] Pas de trackingToken dans le résultat:', result);
      }

      return result;
    } catch (error) {
      console.error('❌ [Page] Erreur création demande invité:', error);
      return {
        success: false,
        error: 'Une erreur inattendue est survenue',
      };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-[#003D82] text-white py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-3 mb-4">
              <ShoppingCart className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Achat Délégué</h1>
            </div>
            <p className="text-xl text-blue-100">
              Confiez-nous l&apos;achat de vos produits. Nous nous occupons de tout :
              recherche, achat, et livraison directement chez vous.
            </p>
          </div>
        </div>
      </div>

      {/* Étapes du processus */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Étape 1 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                  1
                </div>
                <CardTitle>Décrivez votre besoin</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Indiquez-nous le produit que vous souhaitez acheter avec le maximum de détails
              </p>
            </CardContent>
          </Card>

          {/* Étape 2 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                  2
                </div>
                <CardTitle>Nous achetons pour vous</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Notre équipe recherche le meilleur prix et effectue l&apos;achat en votre nom
              </p>
            </CardContent>
          </Card>

          {/* Étape 3 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                  3
                </div>
                <CardTitle>Livraison à votre adresse</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Le produit est livré directement chez vous selon le mode de livraison choisi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Avantages du service */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-900">
                <Shield className="h-5 w-5" />
                <span>Sécurisé</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-800">
                Paiement sécurisé et protection des données personnelles
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <CreditCard className="h-5 w-5" />
                <span>Transparent</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-800">
                Prix du produit + livraison + frais de service 15% (min 10€)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-900">
                <Clock className="h-5 w-5" />
                <span>Rapide</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-800">
                Traitement sous 24-48h et options de livraison express disponibles
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informations importantes */}
        <Card className="bg-blue-50 border-blue-200 mb-12">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900">
              <Clock className="h-5 w-5" />
              <span>Bon à savoir</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Délai de traitement :</strong> 24 à 48 heures ouvrées pour la prise en charge
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Lien de suivi :</strong> Valide pendant 72 heures après réception de l&apos;email
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Structure de prix :</strong> Coût du produit + Frais de livraison + Frais de service (15% minimum 10€)
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Compte optionnel :</strong> Créez un compte gratuit pour un accès permanent à vos demandes
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <Mail className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Pas d&apos;email reçu ?</strong> Vérifiez vos spams ou contactez-nous au +33 6 12 34 56 78
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Formulaire */}
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Informations de votre demande</CardTitle>
              <CardDescription>
                Tous les champs marqués d&apos;un astérisque (*) sont obligatoires
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PurchaseForm mode="guest" onSubmit={handleSubmit} />
            </CardContent>
          </Card>
        </div>

        {/* CTA création de compte */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle>Vous avez déjà un compte ?</CardTitle>
              <CardDescription>
                Connectez-vous pour rattacher automatiquement votre demande et accéder à votre tableau de bord
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center space-x-4">
              <Button asChild variant="outline">
                <Link href="/login">
                  Se connecter
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>

              <div className="text-sm text-muted-foreground">ou</div>

              <Button asChild>
                <Link href="/register">Créer un compte gratuit</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-12">
          <div className="flex items-center justify-center space-x-4">
            <Link href="/" className="hover:underline flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Accueil
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:underline">
              Se connecter
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:underline">
              Nous contacter
            </Link>
          </div>
          <p className="mt-4">
            © {new Date().getFullYear()} Faso Fret Logistics. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}
