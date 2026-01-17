/**
 * Page : Détails d'une Demande d'Achat Délégué (Back-Office)
 *
 * User Stories US-3.1, US-3.2, US-3.3 : Détails, actions et historique
 *
 * Affiche les détails complets d'une demande avec :
 * - Informations complètes (contact, produit, adresse de livraison, coûts, etc.)
 * - Historique chronologique complet des événements
 * - Actions disponibles selon le statut (changement statut, annulation, etc.)
 * - Accès restreint selon les permissions RBAC
 *
 * Route protégée accessible selon les rôles :
 * - ADMIN / OPERATIONS_MANAGER : accès complet avec actions
 * - FINANCE_MANAGER : lecture seule
 * - CLIENT : voir uniquement ses propres demandes (readonly)
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/config';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import {
  PurchaseStatusBadgeWithIcon,
  PurchaseActionsMenu,
  PurchaseHistoryTimeline,
} from '@/components/purchases';

// ============================================
// TYPES
// ============================================

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// ============================================
// PAGE PRINCIPALE
// ============================================

/**
 * Page de détails d'une demande d'achat
 */
export default async function PurchaseDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAuth();

  // Utiliser le client Prisma standard car Zenstack bloque l'accès
  const { prisma } = await import('@/lib/db/client');

  // Charger la demande avec toutes les relations
  const purchase = await prisma.purchaseRequest.findUnique({
    where: { id },
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
      logs: {
        orderBy: {
          createdAt: 'desc',
        },
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

  // Si la demande n'existe pas
  if (!purchase) {
    notFound();
  }

  // Vérification manuelle des permissions (remplace Zenstack)
  if (session.user.role === 'CLIENT') {
    // Les CLIENTs ne peuvent voir que leurs propres demandes
    if (purchase.userId !== session.user.id) {
      notFound();
    }
  }

  // Déterminer si l'utilisateur peut voir les infos internes
  const canViewInternalInfo =
    session.user.role === 'ADMIN' ||
    session.user.role === 'OPERATIONS_MANAGER' ||
    session.user.role === 'FINANCE_MANAGER';

  // Déterminer si l'utilisateur peut gérer les achats (actions de statut)
  const canManagePurchases =
    session.user.role === 'ADMIN' ||
    session.user.role === 'OPERATIONS_MANAGER';

  return (
    <div className="space-y-6">
      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/purchases">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Demande d&apos;achat délégué
            </h1>
            <p className="text-muted-foreground mt-1">
              {purchase.trackingNumber}
            </p>
          </div>
        </div>

        {/* Actions de gestion du statut (ADMIN / OPERATIONS_MANAGER uniquement) */}
        {canManagePurchases && (
          <PurchaseActionsMenu
            purchaseId={purchase.id}
            currentStatus={purchase.status}
            userRole={session.user.role}
          />
        )}
      </div>

      {/* Grid à 2 colonnes sur desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Détails */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statut et informations générales */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informations générales</CardTitle>
                <PurchaseStatusBadgeWithIcon status={purchase.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Numéro de suivi
                  </p>
                  <p className="text-base font-mono">{purchase.trackingNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date de création
                  </p>
                  <p className="text-base">
                    {new Date(purchase.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date demandée
                  </p>
                  <p className="text-base">
                    {new Date(purchase.requestedDate).toLocaleDateString(
                      'fr-FR',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Mode de livraison
                  </p>
                  <p className="text-base capitalize">
                    {purchase.deliveryMode.toLowerCase()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <p className="text-base">{purchase.contactEmail}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Téléphone
                </p>
                <p className="text-base">{purchase.contactPhone}</p>
              </div>
              {purchase.contactName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Nom du contact
                  </p>
                  <p className="text-base">{purchase.contactName}</p>
                </div>
              )}
              {purchase.user && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Client rattaché
                  </p>
                  <p className="text-base">
                    {purchase.user.name || purchase.user.email}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations produit */}
          <Card>
            <CardHeader>
              <CardTitle>Produit demandé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nom du produit
                </p>
                <p className="text-base font-medium">{purchase.productName}</p>
              </div>
              {purchase.productUrl && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    URL du produit
                  </p>
                  <a
                    href={purchase.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                  >
                    {purchase.productUrl}
                  </a>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Quantité
                  </p>
                  <p className="text-base">{purchase.quantity}</p>
                </div>
                {purchase.estimatedPrice && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Prix estimé
                    </p>
                    <p className="text-base">
                      {purchase.estimatedPrice.toFixed(2)} €
                    </p>
                  </div>
                )}
                {purchase.maxBudget && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Budget max
                    </p>
                    <p className="text-base">
                      {purchase.maxBudget.toFixed(2)} €
                    </p>
                  </div>
                )}
              </div>
              {purchase.productDescription && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="text-base whitespace-pre-wrap">
                    {purchase.productDescription}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adresse de livraison */}
          <Card>
            <CardHeader>
              <CardTitle>Adresse de livraison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-base">{purchase.deliveryAddress}</p>
              <p className="text-base">
                {purchase.deliveryPostalCode} {purchase.deliveryCity}
              </p>
              <p className="text-base">{purchase.deliveryCountry}</p>
            </CardContent>
          </Card>

          {/* Coûts réels (si disponibles) */}
          {canViewInternalInfo &&
            (purchase.actualProductCost ||
              purchase.deliveryCost ||
              purchase.serviceFee ||
              purchase.totalCost) && (
              <Card>
                <CardHeader>
                  <CardTitle>Coûts réels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {purchase.actualProductCost && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Coût du produit
                      </span>
                      <span className="font-medium">
                        {purchase.actualProductCost.toFixed(2)} €
                      </span>
                    </div>
                  )}
                  {purchase.deliveryCost && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Frais de livraison
                      </span>
                      <span className="font-medium">
                        {purchase.deliveryCost.toFixed(2)} €
                      </span>
                    </div>
                  )}
                  {purchase.serviceFee && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Frais de service (15%)
                      </span>
                      <span className="font-medium">
                        {purchase.serviceFee.toFixed(2)} €
                      </span>
                    </div>
                  )}
                  {purchase.totalCost && (
                    <div className="flex justify-between pt-3 border-t">
                      <span className="font-semibold">Coût total</span>
                      <span className="font-bold text-lg">
                        {purchase.totalCost.toFixed(2)} €
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          {/* Instructions spéciales */}
          {purchase.specialInstructions && (
            <Card>
              <CardHeader>
                <CardTitle>Instructions spéciales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">
                  {purchase.specialInstructions}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne droite : Historique (avec icônes et badges comme pickups) */}
        <div className="lg:col-span-1">
          <PurchaseHistoryTimeline logs={purchase.logs as any} />
        </div>
      </div>
    </div>
  );
}

/**
 * Génération de métadonnées dynamiques
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;

  const { prisma } = await import('@/lib/db/client');

  const purchase = await prisma.purchaseRequest.findUnique({
    where: { id },
    select: {
      trackingNumber: true,
      status: true,
    },
  });

  if (!purchase) {
    return {
      title: 'Demande non trouvée | Faso Fret Logistics',
    };
  }

  return {
    title: `${purchase.trackingNumber} - ${purchase.status} | Faso Fret Logistics`,
    description: `Détails de la demande d'achat ${purchase.trackingNumber}`,
  };
}
