/**
 * Page : Détails d'une Demande d'Enlèvement
 *
 * Affiche les détails complets d'une demande d'enlèvement avec :
 * - Informations de la demande et de l'expédition
 * - Statut actuel et workflow
 * - Actions contextuelles (changer statut, assigner transporteur)
 * - Historique et documents
 *
 * @module app/(dashboard)/pickups/[id]
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Truck,
  User,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  PlayCircle,
  StopCircle,
  Package,
} from '@phosphor-icons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  getPickupRequestByIdAction,
  updatePickupStatusAction,
  cancelPickupRequestAction,
} from '@/modules/pickups';
import { PickupStatus } from '@/generated/prisma';

/**
 * Traductions françaises pour les statuts
 */
const statusLabels: Record<PickupStatus, { label: string; color: string; icon: any }> = {
  REQUESTED: { label: 'Demandé', color: 'bg-gray-500', icon: Clock },
  SCHEDULED: { label: 'Planifié', color: 'bg-blue-500', icon: Calendar },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-500', icon: PlayCircle },
  COMPLETED: { label: 'Terminé', color: 'bg-green-500', icon: CheckCircle },
  CANCELED: { label: 'Annulé', color: 'bg-red-500', icon: XCircle },
};

/**
 * Créneaux horaires
 */
const timeSlotLabels: Record<string, string> = {
  FLEXIBLE: 'Flexible (toute la journée)',
  MORNING: 'Matin (8h-12h)',
  AFTERNOON: 'Après-midi (12h-17h)',
  EVENING: 'Soirée (17h-20h)',
  SPECIFIC_TIME: 'Heure précise',
};

export default function PickupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pickupId = params.id as string;

  /**
   * Charger les détails de la demande
   */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pickup', pickupId],
    queryFn: async () => {
      const result = await getPickupRequestByIdAction(pickupId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  /**
   * Mutation pour changer le statut
   */
  const changeStatusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: PickupStatus; notes?: string }) => {
      const result = await updatePickupStatusAction(pickupId, {
        status,
        notes,
        scheduledDate: status === PickupStatus.SCHEDULED ? new Date().toISOString() : undefined,
        actualPickupDate: status === PickupStatus.COMPLETED ? new Date().toISOString() : undefined,
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup', pickupId] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      toast.success('Statut mis à jour avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour du statut');
    },
  });

  /**
   * Mutation pour annuler
   */
  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const result = await cancelPickupRequestAction(pickupId, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup', pickupId] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      toast.success('Demande annulée avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <XCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-lg font-medium text-gray-900">Erreur de chargement</p>
        <p className="text-sm text-gray-600 mt-1">
          Impossible de charger les détails de la demande
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/pickups">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  const statusInfo = statusLabels[data.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/pickups">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux enlèvements
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Demande d'Enlèvement
            </h1>
            <p className="text-gray-600 mt-1">
              Expédition : {data.shipment.trackingNumber}
            </p>
          </div>
          <Badge className={`${statusInfo.color} text-white`}>
            <StatusIcon className="mr-1 h-4 w-4" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Actions contextuelles */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Actions disponibles selon le statut actuel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.status === PickupStatus.REQUESTED && (
              <>
                <Button
                  onClick={() =>
                    changeStatusMutation.mutate({
                      status: PickupStatus.SCHEDULED,
                      notes: 'Enlèvement planifié',
                    })
                  }
                  disabled={changeStatusMutation.isPending}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Planifier l'enlèvement
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/pickups/${pickupId}/assign`}>
                    <Truck className="mr-2 h-4 w-4" />
                    Assigner un transporteur
                  </Link>
                </Button>
              </>
            )}

            {data.status === PickupStatus.SCHEDULED && (
              <>
                <Button
                  onClick={() =>
                    changeStatusMutation.mutate({
                      status: PickupStatus.IN_PROGRESS,
                      notes: 'Transporteur en route',
                    })
                  }
                  disabled={changeStatusMutation.isPending}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Démarrer l'enlèvement
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/pickups/${pickupId}/edit`}>
                    Modifier
                  </Link>
                </Button>
              </>
            )}

            {data.status === PickupStatus.IN_PROGRESS && (
              <Button
                onClick={() =>
                  changeStatusMutation.mutate({
                    status: PickupStatus.COMPLETED,
                    notes: 'Enlèvement effectué avec succès',
                  })
                }
                disabled={changeStatusMutation.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Marquer comme terminé
              </Button>
            )}

            {![PickupStatus.COMPLETED, PickupStatus.CANCELED].includes(data.status) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Annuler
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer l'annulation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir annuler cette demande d'enlèvement ? Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Non, garder</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelMutation.mutate('Annulation manuelle')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Oui, annuler
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button variant="outline" asChild>
              <Link href={`/dashboard/shipments/${data.shipmentId}`}>
                <Package className="mr-2 h-4 w-4" />
                Voir l'expédition
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations d'enlèvement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Informations d'Enlèvement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Adresse</label>
              <p className="text-gray-900">{data.pickupAddress}</p>
              <p className="text-sm text-gray-600">
                {data.pickupPostalCode} {data.pickupCity}, {data.pickupCountry}
              </p>
            </div>

            {data.pickupContact && (
              <div>
                <label className="text-sm font-medium text-gray-700">Contact</label>
                <p className="text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  {data.pickupContact}
                </p>
              </div>
            )}

            {data.pickupPhone && (
              <div>
                <label className="text-sm font-medium text-gray-700">Téléphone</label>
                <p className="text-gray-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  {data.pickupPhone}
                </p>
              </div>
            )}

            <Separator />

            <div>
              <label className="text-sm font-medium text-gray-700">Date demandée</label>
              <p className="text-gray-900">
                {format(new Date(data.requestedDate), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Créneau horaire</label>
              <p className="text-gray-900">
                {timeSlotLabels[data.timeSlot]}
                {data.pickupTime && ` - ${data.pickupTime}`}
              </p>
            </div>

            {data.scheduledDate && (
              <div>
                <label className="text-sm font-medium text-gray-700">Date planifiée</label>
                <p className="text-gray-900">
                  {format(new Date(data.scheduledDate), 'dd MMMM yyyy à HH:mm', {
                    locale: fr,
                  })}
                </p>
              </div>
            )}

            {data.actualPickupDate && (
              <div>
                <label className="text-sm font-medium text-gray-700">Date réelle</label>
                <p className="text-gray-900">
                  {format(new Date(data.actualPickupDate), 'dd MMMM yyyy à HH:mm', {
                    locale: fr,
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transporteur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              Transporteur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.transporter ? (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom</label>
                  <p className="text-gray-900">{data.transporter.name}</p>
                </div>

                {data.driverName && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Chauffeur</label>
                    <p className="text-gray-900">{data.driverName}</p>
                  </div>
                )}

                {data.driverPhone && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Téléphone chauffeur
                    </label>
                    <p className="text-gray-900">{data.driverPhone}</p>
                  </div>
                )}

                {data.vehiclePlate && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Immatriculation
                    </label>
                    <p className="text-gray-900 font-mono">{data.vehiclePlate}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">Aucun transporteur assigné</p>
                {data.status === PickupStatus.REQUESTED && (
                  <Button variant="outline" size="sm" asChild className="mt-3">
                    <Link href={`/dashboard/pickups/${pickupId}/assign`}>
                      Assigner un transporteur
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      {(data.specialInstructions || data.accessInstructions || data.completionNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Instructions et Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.specialInstructions && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Instructions spéciales
                </label>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {data.specialInstructions}
                </p>
              </div>
            )}

            {data.accessInstructions && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Instructions d'accès
                </label>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {data.accessInstructions}
                </p>
              </div>
            )}

            {data.completionNotes && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Notes de finalisation
                </label>
                <p className="text-gray-900 whitespace-pre-wrap">{data.completionNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informations expédition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            Expédition Liée
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-700">N° de suivi</label>
              <p className="text-gray-900 font-mono">{data.shipment.trackingNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Poids</label>
              <p className="text-gray-900">{data.shipment.weight} kg</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Colis</label>
              <p className="text-gray-900">{data.shipment.packageCount}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <p className="text-gray-900">{data.shipment.description}</p>
          </div>

          <Button variant="outline" asChild className="w-full">
            <Link href={`/dashboard/shipments/${data.shipmentId}`}>
              Voir tous les détails de l'expédition
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
