'use client';

/**
 * Formulaire d'ajout d'événement de tracking
 *
 * Permet aux Operations Managers et Admins d'ajouter un événement de tracking
 * à une expédition avec :
 * - Sélection du nouveau statut
 * - Localisation via carte interactive (LocationPicker)
 * - Description optionnelle
 *
 * Le formulaire met à jour automatiquement le statut de l'expédition
 * si le nouveau statut est différent du statut actuel.
 *
 * Utilisation :
 * ```tsx
 * <AddTrackingEventForm
 *   shipmentId="clxyz123..."
 *   currentStatus="PICKED_UP"
 *   onSuccess={() => router.refresh()}
 *   onCancel={() => setIsOpen(false)}
 * />
 * ```
 *
 * @module components/tracking/AddTrackingEventForm
 */

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MapPin,
  CheckCircle,
  SpinnerGap,
  Warning,
  Package,
  Truck,
  Airplane,
  Warehouse,
  House,
  XCircle,
  Clock,
  ShieldCheck,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { LocationPicker, type LocationValue } from './LocationPicker';
import { addTrackingEventSchema, type AddTrackingEventInput } from '@/modules/tracking';
import { addTrackingEvent } from '@/modules/tracking';
import { ShipmentStatus } from '@/lib/db/enums';

/**
 * Props du formulaire AddTrackingEventForm
 */
interface AddTrackingEventFormProps {
  /** ID de l'expédition */
  shipmentId: string;
  /** Statut actuel de l'expédition (pour pré-sélection) */
  currentStatus?: ShipmentStatus;
  /** Callback appelé après succès de l'ajout */
  onSuccess?: () => void;
  /** Callback appelé lors de l'annulation */
  onCancel?: () => void;
}

/**
 * Configuration des statuts avec icônes et couleurs
 * Utilisé pour l'affichage dans le select et la prévisualisation
 */
const STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; icon: React.ReactNode; color: string; description: string }
> = {
  [ShipmentStatus.DRAFT]: {
    label: 'Brouillon',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-gray-500',
    description: 'Expédition en cours de préparation',
  },
  [ShipmentStatus.PENDING_APPROVAL]: {
    label: 'En attente d\'approbation',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-yellow-600',
    description: 'En attente de validation',
  },
  [ShipmentStatus.APPROVED]: {
    label: 'Approuvé',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-blue-600',
    description: 'Expédition validée, prête pour collecte',
  },
  [ShipmentStatus.PICKED_UP]: {
    label: 'Collecté',
    icon: <Package className="h-4 w-4" />,
    color: 'text-indigo-600',
    description: 'Colis récupéré chez l\'expéditeur',
  },
  [ShipmentStatus.IN_TRANSIT]: {
    label: 'En transit',
    icon: <Truck className="h-4 w-4" />,
    color: 'text-blue-600',
    description: 'En cours d\'acheminement',
  },
  [ShipmentStatus.AT_CUSTOMS]: {
    label: 'En douane',
    icon: <ShieldCheck className="h-4 w-4" />,
    color: 'text-orange-600',
    description: 'En attente de dédouanement',
  },
  [ShipmentStatus.CUSTOMS_CLEARED]: {
    label: 'Dédouané',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    description: 'Formalités douanières terminées',
  },
  [ShipmentStatus.OUT_FOR_DELIVERY]: {
    label: 'En cours de livraison',
    icon: <Truck className="h-4 w-4" />,
    color: 'text-purple-600',
    description: 'En route vers le destinataire',
  },
  [ShipmentStatus.READY_FOR_PICKUP]: {
    label: 'Disponible au retrait',
    icon: <Warehouse className="h-4 w-4" />,
    color: 'text-teal-600',
    description: 'Prêt à être retiré au point de collecte',
  },
  [ShipmentStatus.DELIVERED]: {
    label: 'Livré',
    icon: <House className="h-4 w-4" />,
    color: 'text-green-600',
    description: 'Colis remis au destinataire',
  },
  [ShipmentStatus.CANCELLED]: {
    label: 'Annulé',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    description: 'Expédition annulée',
  },
  [ShipmentStatus.ON_HOLD]: {
    label: 'En attente',
    icon: <Warning className="h-4 w-4" />,
    color: 'text-orange-600',
    description: 'Expédition suspendue temporairement',
  },
  [ShipmentStatus.EXCEPTION]: {
    label: 'Exception',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    description: 'Problème nécessitant une intervention',
  },
};

/**
 * Liste des statuts dans l'ordre logique du workflow
 * (exclut DRAFT qui n'est pas un statut de tracking)
 */
const WORKFLOW_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.PENDING_APPROVAL,
  ShipmentStatus.APPROVED,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.AT_CUSTOMS,
  ShipmentStatus.CUSTOMS_CLEARED,
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.READY_FOR_PICKUP,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.ON_HOLD,
  ShipmentStatus.EXCEPTION,
  ShipmentStatus.CANCELLED,
];

/**
 * Composant principal : Formulaire d'ajout d'événement de tracking
 */
export function AddTrackingEventForm({
  shipmentId,
  currentStatus,
  onSuccess,
  onCancel,
}: AddTrackingEventFormProps) {
  // État pour la position GPS (géré séparément car objet complexe)
  const [location, setLocation] = useState<LocationValue | null>(null);

  // État pour les erreurs et le chargement
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Configuration du formulaire avec React Hook Form + Zod
  const form = useForm<AddTrackingEventInput>({
    resolver: zodResolver(addTrackingEventSchema),
    defaultValues: {
      shipmentId,
      status: currentStatus || ShipmentStatus.IN_TRANSIT,
      location: '',
      latitude: null,
      longitude: null,
      description: '',
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  const selectedStatus = watch('status');

  /**
   * Gérer le changement de position depuis LocationPicker
   * Met à jour les champs du formulaire (location, latitude, longitude)
   */
  const handleLocationChange = (value: LocationValue) => {
    setLocation(value);
    setValue('location', value.address || `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`);
    setValue('latitude', value.lat);
    setValue('longitude', value.lng);
  };

  /**
   * Soumettre le formulaire
   * Appelle la Server Action addTrackingEvent
   */
  const onSubmit = async (data: AddTrackingEventInput) => {
    setError(null);

    startTransition(async () => {
      try {
        await addTrackingEvent({
          shipmentId: data.shipmentId,
          status: data.status,
          location: data.location,
          latitude: data.latitude ?? undefined,
          longitude: data.longitude ?? undefined,
          description: data.description ?? undefined,
        });

        // Succès : appeler le callback
        onSuccess?.();
      } catch (err) {
        console.error('[AddTrackingEventForm] Erreur:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Une erreur est survenue lors de l\'ajout de l\'événement'
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 : SÉLECTION DU STATUT
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <Label htmlFor="status" className="text-base font-semibold">
          Nouveau statut *
        </Label>
        <Select
          value={selectedStatus}
          onValueChange={(value) => setValue('status', value as ShipmentStatus)}
          disabled={isPending}
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="Sélectionner un statut" />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOW_STATUSES.map((status) => {
              const config = STATUS_CONFIG[status];
              const isCurrent = status === currentStatus;

              return (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <span className={config.color}>{config.icon}</span>
                    <span>{config.label}</span>
                    {isCurrent && (
                      <span className="text-xs text-gray-400 ml-2">(actuel)</span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Description du statut sélectionné */}
        {selectedStatus && (
          <p className="text-sm text-muted-foreground">
            {STATUS_CONFIG[selectedStatus as ShipmentStatus]?.description}
          </p>
        )}

        {errors.status && (
          <p className="text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 : LOCALISATION (CARTE INTERACTIVE)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">
          <MapPin className="h-4 w-4 inline-block mr-1" />
          Localisation *
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          Cliquez sur la carte, recherchez une adresse ou utilisez votre position GPS
        </p>

        <LocationPicker
          value={location}
          onChange={handleLocationChange}
          disabled={isPending}
          height="250px"
        />

        {/* Champ caché pour la validation */}
        <input type="hidden" {...register('location')} />
        <input type="hidden" {...register('latitude', { valueAsNumber: true })} />
        <input type="hidden" {...register('longitude', { valueAsNumber: true })} />

        {errors.location && (
          <p className="text-sm text-red-600">{errors.location.message}</p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 : DESCRIPTION (OPTIONNELLE)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-semibold">
          Description (optionnelle)
        </Label>
        <Textarea
          id="description"
          placeholder="Ex: Colis arrivé au hub de distribution, en attente de tri..."
          {...register('description')}
          disabled={isPending}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Ajoutez des détails sur l'événement (max 500 caractères)
        </p>
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MESSAGE D'ERREUR GLOBAL
          ═══════════════════════════════════════════════════════════════════ */}
      {error && (
        <Alert variant="destructive">
          <Warning className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          BOUTONS D'ACTION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending || !location}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {isPending ? (
            <>
              <SpinnerGap className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Ajouter l'événement
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
