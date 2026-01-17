/**
 * Page : Suivi Public d'une Demande d'Achat Délégué par Token
 *
 * User Story US-1.2 : Suivi public via token unique (72h)
 *
 * Permet de suivre une demande d'achat sans authentification via un token unique.
 * Le token est valide pendant 72 heures après la création de la demande.
 *
 * Affichage :
 * - Informations publiques uniquement (pas de notes internes ni coûts réels)
 * - Statut actuel avec badge
 * - Historique simplifié des événements
 * - Coordonnées de contact pour questions
 *
 * IMPORTANT : Utilise le client Prisma standard (pas Zenstack) car pas d'authentification
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db/client'; // Client Prisma standard, pas enhanced
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ShoppingCart,
  AlertCircle,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  Home,
  ExternalLink,
} from 'lucide-react';
import { PurchaseStatusBadgeWithIcon } from '@/components/purchases';

// ============================================
// TYPES
// ============================================

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

// ============================================
// PAGE PRINCIPALE
// ============================================

/**
 * Page de suivi public par token
 */
export default async function PublicPurchaseTrackingPage({ params }: PageProps) {
  // Await params (Next.js 15+ requirement)
  const { token } = await params;

  // Charger la demande via le token (client Prisma standard)
  const purchase = await prisma.purchaseRequest.findUnique({
    where: { trackingToken: token },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      client: {
        select: {
          name: true,
        },
      },
      shipment: {
        select: {
          trackingNumber: true,
        },
      },
      logs: {
        orderBy: { createdAt: 'desc' },
        include: {
          changedBy: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  // Token invalide ou demande supprimée
  if (!purchase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Lien invalide</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Ce lien de suivi est invalide ou a expiré. Vérifiez que vous avez
              bien copié le lien complet depuis votre email.
            </p>

            <div className="pt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l&apos;accueil
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérifier si le token a expiré
  const isTokenExpired = new Date() > new Date(purchase.tokenExpiresAt);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Suivi de votre achat délégué</h1>
          </div>
          <p className="text-muted-foreground">
            Numéro de suivi : <span className="font-mono font-medium">{purchase.trackingNumber}</span>
          </p>
        </div>

        {/* Alerte token expiré */}
        {isTokenExpired && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lien de suivi expiré</AlertTitle>
            <AlertDescription>
              Ce lien de suivi a expiré (validité : 72h après création). Pour
              obtenir un nouveau lien, veuillez nous contacter ou créer un
              compte pour suivre vos demandes de manière permanente.
            </AlertDescription>
          </Alert>
        )}

        {/* Statut actuel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Statut actuel</span>
              <PurchaseStatusBadgeWithIcon status={purchase.status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Date de demande
                </p>
                <p className="font-medium">
                  {new Date(purchase.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Date de livraison souhaitée
                </p>
                <p className="font-medium">
                  {new Date(purchase.requestedDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {purchase.actualDeliveryDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Date de livraison réelle
                  </p>
                  <p className="font-medium text-green-600">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    {new Date(purchase.actualDeliveryDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Mode de livraison
                </p>
                <p className="font-medium capitalize">
                  {purchase.deliveryMode.toLowerCase()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails du produit */}
        <Card>
          <CardHeader>
            <CardTitle>Produit demandé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nom du produit</p>
              <p className="font-medium">{purchase.productName}</p>
            </div>

            {purchase.productUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">URL du produit</p>
                <a
                  href={purchase.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center"
                >
                  Voir le produit
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Quantité</p>
                <p className="font-medium">{purchase.quantity}</p>
              </div>

              {purchase.estimatedPrice && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Prix estimé</p>
                  <p className="font-medium">{purchase.estimatedPrice.toFixed(2)} €</p>
                </div>
              )}
            </div>

            {purchase.productDescription && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap">{purchase.productDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adresse de livraison */}
        <Card>
          <CardHeader>
            <CardTitle>Adresse de livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">{purchase.deliveryAddress}</p>
            <p className="text-muted-foreground">
              {purchase.deliveryPostalCode} {purchase.deliveryCity}
            </p>
            <p className="text-muted-foreground">{purchase.deliveryCountry}</p>
          </CardContent>
        </Card>

        {/* Historique */}
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
            <CardDescription>
              Suivi chronologique de votre demande
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {purchase.logs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Aucun événement enregistré.
                </p>
              ) : (
                <div className="relative space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {purchase.logs.map((log) => (
                    <div key={log.id} className="relative pl-8">
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {log.eventType === 'CREATED'
                            ? 'Demande créée'
                            : log.eventType === 'STATUS_CHANGED'
                              ? `Changement de statut`
                              : log.eventType === 'ATTACHED_TO_ACCOUNT'
                                ? 'Rattaché au compte'
                                : log.eventType === 'COSTS_UPDATED'
                                  ? 'Coûts mis à jour'
                                  : log.eventType}
                        </p>
                        {log.oldStatus && log.newStatus && (
                          <p className="text-xs text-muted-foreground">
                            {log.oldStatus} → {log.newStatus}
                          </p>
                        )}
                        {log.notes && (
                          <p className="text-xs text-muted-foreground">
                            {log.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informations de contact */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm">Besoin d&apos;aide ?</CardTitle>
            <CardDescription>
              Notre équipe est à votre disposition pour toute question
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-blue-600" />
              <a
                href="mailto:support@fasofret.com"
                className="text-blue-600 hover:underline"
              >
                support@fasofret.com
              </a>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="h-4 w-4 text-blue-600" />
              <a
                href="tel:+33612345678"
                className="text-blue-600 hover:underline"
              >
                +33 6 12 34 56 78
              </a>
            </div>
          </CardContent>
        </Card>

        {/* CTA création de compte */}
        {!purchase.isAttachedToAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Suivez toutes vos demandes en un seul endroit</CardTitle>
              <CardDescription>
                Créez un compte gratuit pour accéder à un tableau de bord complet et retrouver automatiquement toutes vos demandes passées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/register">Créer un compte gratuit</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8">
          <p>
            © {new Date().getFullYear()} Faso Fret Logistics. Tous droits
            réservés.
          </p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <Link href="/" className="hover:underline">
              Accueil
            </Link>
            <span>•</span>
            <Link href="/purchases/request" className="hover:underline">
              Nouvelle demande
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:underline">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Métadonnées de la page
 */
export const metadata = {
  title: 'Suivi de votre achat délégué | Faso Fret Logistics',
  description: 'Suivez l\'état de votre demande d\'achat en temps réel',
};
