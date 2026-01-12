/**
 * Page : Planifier/Replanifier un Enlèvement
 *
 * Permet aux ADMIN et OPERATIONS_MANAGER de planifier ou replanifier
 * une demande d'enlèvement avec date, créneau horaire et notes.
 */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/config';
import { UserRole } from '@/lib/db/enums';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PickupScheduleForm } from '@/components/pickups';

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
 * Page de planification d'une demande d'enlèvement
 */
export default async function PickupSchedulePage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAuth();

  // Vérifier les permissions (seuls ADMIN et OPERATIONS_MANAGER)
  if (
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.OPERATIONS_MANAGER
  ) {
    redirect('/dashboard/pickups');
  }

  // Charger la demande avec le client Prisma standard
  const { prisma } = await import('@/lib/db/client');

  const pickup = await prisma.pickupRequest.findUnique({
    where: { id },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      requestedDate: true,
      scheduledDate: true,
      timeSlot: true,
      pickupTime: true,
      contactName: true,
      pickupAddress: true,
      pickupCity: true,
    },
  });

  // Si la demande n'existe pas
  if (!pickup) {
    notFound();
  }

  const isReschedule = pickup.scheduledDate !== null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/pickups/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isReschedule ? 'Replanifier' : 'Planifier'} l&apos;enlèvement
          </h1>
          <p className="text-muted-foreground mt-1">
            {pickup.trackingNumber} - {pickup.contactName}
          </p>
        </div>
      </div>

      {/* Informations de la demande */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-sm text-muted-foreground">
          Informations de la demande
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Adresse :</span>{' '}
            <span className="font-medium">
              {pickup.pickupAddress}, {pickup.pickupCity}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Date souhaitée :</span>{' '}
            <span className="font-medium">
              {new Date(pickup.requestedDate).toLocaleDateString('fr-FR', {
                dateStyle: 'long',
              })}
            </span>
          </div>
          {isReschedule && pickup.scheduledDate && (
            <div className="col-span-2">
              <span className="text-muted-foreground">
                Actuellement planifié :
              </span>{' '}
              <span className="font-medium">
                {new Date(pickup.scheduledDate).toLocaleDateString('fr-FR', {
                  dateStyle: 'long',
                })}
                {pickup.pickupTime && ` à ${pickup.pickupTime}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Formulaire de planification */}
      <PickupScheduleForm
        pickupId={pickup.id}
        initialData={{
          scheduledDate: pickup.scheduledDate
            ? new Date(pickup.scheduledDate).toISOString().split('T')[0]
            : new Date(pickup.requestedDate).toISOString().split('T')[0],
          timeSlot: pickup.timeSlot,
          pickupTime: pickup.pickupTime ?? undefined,
        }}
        isReschedule={isReschedule}
      />
    </div>
  );
}

/**
 * Génération de métadonnées dynamiques
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { prisma } = await import('@/lib/db/client');

  const pickup = await prisma.pickupRequest.findUnique({
    where: { id },
    select: {
      trackingNumber: true,
      scheduledDate: true,
    },
  });

  if (!pickup) {
    return {
      title: 'Demande non trouvée | Faso Fret Logistics',
    };
  }

  const action = pickup.scheduledDate ? 'Replanifier' : 'Planifier';

  return {
    title: `${action} ${pickup.trackingNumber} | Faso Fret Logistics`,
    description: `${action} la demande d'enlèvement ${pickup.trackingNumber}`,
  };
}
