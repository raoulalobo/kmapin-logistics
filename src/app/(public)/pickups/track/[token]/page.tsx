/**
 * Page : Suivi Public d'une Demande d'Enlèvement par Token
 *
 * User Story US-1.2 : Suivi public via token unique (72h)
 *
 * Permet de suivre une demande d'enlèvement sans authentification via un token unique.
 * Le token est valide pendant 72 heures après la création de la demande.
 *
 * Affichage :
 * - Informations publiques uniquement (pas de notes internes)
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Package,
  AlertCircle,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  Home,
} from 'lucide-react';
import {
  PickupDetailsCard,
  PickupHistoryTimeline,
  PickupStatusBadgeWithIcon,
} from '@/components/pickups';

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
export default async function PublicPickupTrackingPage({ params }: PageProps) {
  // Await params (Next.js 15+ requirement)
  const { token } = await params;

  // Charger la demande via le token (client Prisma standard)
  const pickup = await prisma.pickupRequest.findUnique({
    where: { trackingToken: token },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      company: {
        select: {
          name: true,
        },
      },
      transporter: {
        select: {
          name: true,
        },
      },
      shipment: {
        select: {
          trackingNumber: true,
        },
      },
    },
  });

  // Token invalide ou demande supprimée
  if (!pickup) {
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
  const isTokenExpired = new Date() > new Date(pickup.tokenExpiresAt);

  // Charger l'historique (client Prisma standard)
  const history = await prisma.pickupLog.findMany({
    where: { pickupId: pickup.id },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Package className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Suivi de votre enlèvement</h1>
          </div>
          <p className="text-muted-foreground">
            Numéro de suivi : <span className="font-mono font-medium">{pickup.trackingNumber}</span>
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
              <PickupStatusBadgeWithIcon status={pickup.status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Date souhaitée
                </p>
                <p className="font-medium">
                  {new Date(pickup.requestedDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {pickup.scheduledDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Date confirmée
                  </p>
                  <p className="font-medium text-green-600">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    {new Date(pickup.scheduledDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Détails publics */}
        <PickupDetailsCard
          pickup={pickup as any}
          showInternalInfo={false} // Pas de notes internes en public
        />

        {/* Historique simplifié */}
        <PickupHistoryTimeline logs={history as any} compact={true} />

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
        {!pickup.isAttachedToAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Suivez toutes vos demandes en un seul endroit</CardTitle>
              <CardDescription>
                Créez un compte gratuit pour accéder à un tableau de bord complet
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
            <Link href="/pickups/request" className="hover:underline">
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
  title: 'Suivi de votre enlèvement | Faso Fret Logistics',
  description: 'Suivez l\'état de votre demande d\'enlèvement en temps réel',
};
