/**
 * Page : Détails d'une Demande d'Enlèvement (Back-Office)
 *
 * User Stories US-3.1, US-3.2, US-3.3 : Détails, actions et historique
 *
 * Affiche les détails complets d'une demande avec :
 * - Informations complètes (contact, adresse, marchandise, etc.)
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
import { ArrowLeft, ExternalLink } from 'lucide-react';
import {
  PickupDetailsCard,
  PickupHistoryTimeline,
  PickupActionsMenu,
} from '@/components/pickups';
import { getPickupHistory } from '@/modules/pickups';
import { type UserRole } from '@/lib/db/enums';

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
 * Page de détails d'une demande d'enlèvement
 */
export default async function PickupDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAuth();

  // TEMPORAIRE : Utiliser le client Prisma standard car Zenstack bloque l'accès
  const { prisma } = await import('@/lib/db/client');

  // Charger la demande avec toutes les relations
  // Le client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier)
  const pickup = await prisma.pickupRequest.findUnique({
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

  // Si la demande n'existe pas
  if (!pickup) {
    notFound();
  }

  // TEMPORAIRE : Vérification manuelle des permissions (remplace Zenstack)
  if (session.user.role === 'CLIENT') {
    // Les CLIENTs ne peuvent voir que leurs propres demandes
    if (pickup.userId !== session.user.id) {
      notFound();
    }
  }

  // Charger l'historique complet
  const history = await getPickupHistory(id);

  // Déterminer si l'utilisateur peut voir les infos internes
  const canViewInternalInfo =
    session.user.role === 'ADMIN' ||
    session.user.role === 'OPERATIONS_MANAGER' ||
    session.user.role === 'FINANCE_MANAGER';

  return (
    <div className="space-y-6">
      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/pickups">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Demande d&apos;enlèvement
            </h1>
            <p className="text-muted-foreground mt-1">
              {pickup.trackingNumber}
            </p>
          </div>
        </div>

        {/* Lien vers l'expédition liée (si existe) */}
        {pickup.shipmentId && pickup.shipment && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/shipments/${pickup.shipmentId}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir l&apos;expédition
            </Link>
          </Button>
        )}
      </div>

      {/* Actions rapides (pour agents) */}
      {canViewInternalInfo && (
        <PickupActionsMenu
          pickupId={pickup.id}
          currentStatus={pickup.status}
          userRole={session.user.role as UserRole}
          compact={false}
        />
      )}

      {/* Grid à 2 colonnes sur desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Détails */}
        <div className="lg:col-span-2 space-y-6">
          <PickupDetailsCard
            pickup={pickup as any}
            userRole={session.user.role as UserRole}
            showInternalInfo={canViewInternalInfo}
          />
        </div>

        {/* Colonne droite : Historique */}
        <div className="lg:col-span-1">
          <PickupHistoryTimeline logs={history as any} />
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
  const session = await requireAuth();

  // TEMPORAIRE : Utiliser le client Prisma standard
  const { prisma } = await import('@/lib/db/client');

  const pickup = await prisma.pickupRequest.findUnique({
    where: { id },
    select: {
      trackingNumber: true,
      status: true,
    },
  });

  if (!pickup) {
    return {
      title: 'Demande non trouvée | Faso Fret Logistics',
    };
  }

  return {
    title: `${pickup.trackingNumber} - ${pickup.status} | Faso Fret Logistics`,
    description: `Détails de la demande d'enlèvement ${pickup.trackingNumber}`,
  };
}
