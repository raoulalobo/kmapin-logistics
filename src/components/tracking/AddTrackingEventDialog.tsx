'use client';

/**
 * Dialogue d'ajout d'événement de tracking
 *
 * Composant modale qui encapsule le formulaire AddTrackingEventForm.
 * Utilisé dans la page de détail d'une expédition pour ajouter
 * un nouvel événement de tracking avec position GPS.
 *
 * Fonctionnalités :
 * - Bouton déclencheur personnalisable
 * - Fermeture automatique après succès
 * - Rafraîchissement de la page via router.refresh()
 *
 * Exemple d'utilisation :
 * ```tsx
 * <AddTrackingEventDialog
 *   shipmentId="clxyz123..."
 *   currentStatus={ShipmentStatus.IN_TRANSIT}
 * />
 * ```
 *
 * @module components/tracking/AddTrackingEventDialog
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MapPin } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddTrackingEventForm } from './AddTrackingEventForm';
import { ShipmentStatus } from '@/lib/db/enums';

/**
 * Props du composant AddTrackingEventDialog
 */
interface AddTrackingEventDialogProps {
  /** ID de l'expédition */
  shipmentId: string;
  /** Statut actuel de l'expédition */
  currentStatus?: ShipmentStatus;
  /** Numéro de tracking (pour affichage) */
  trackingNumber?: string;
  /** Élément déclencheur personnalisé (optionnel) */
  trigger?: React.ReactNode;
}

/**
 * Composant AddTrackingEventDialog
 *
 * Affiche un dialogue modal avec le formulaire d'ajout d'événement de tracking.
 * Gère l'ouverture/fermeture et le rafraîchissement après succès.
 */
export function AddTrackingEventDialog({
  shipmentId,
  currentStatus,
  trackingNumber,
  trigger,
}: AddTrackingEventDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Callback appelé après succès de l'ajout
   * Ferme le dialogue et rafraîchit la page
   */
  const handleSuccess = () => {
    setIsOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" weight="bold" />
            Ajouter un événement
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-blue-600" weight="fill" />
            Nouvel événement de tracking
          </DialogTitle>
          <DialogDescription>
            {trackingNumber ? (
              <>
                Ajoutez un événement de suivi pour l'expédition{' '}
                <span className="font-mono font-semibold">{trackingNumber}</span>
              </>
            ) : (
              'Ajoutez un événement de suivi avec sa localisation GPS'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <AddTrackingEventForm
            shipmentId={shipmentId}
            currentStatus={currentStatus}
            onSuccess={handleSuccess}
            onCancel={() => setIsOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
