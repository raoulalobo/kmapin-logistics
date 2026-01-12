/**
 * Composant Menu d'Actions pour les Demandes d'Enlèvement
 *
 * Affiche les actions disponibles selon le statut et le rôle
 * US-3.2 : Boutons d'actions de changement de statut
 * US-3.3 : Modal d'annulation avec raison obligatoire
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PickupStatus, UserRole } from '@/lib/db/enums';
import {
  updatePickupStatus,
  cancelPickup,
  type UpdatePickupStatusInput,
  type CancelPickupInput,
} from '@/modules/pickups';
import { MoreVertical, Truck, Check, XCircle, Calendar } from 'lucide-react';

interface PickupActionsMenuProps {
  pickupId: string;
  currentStatus: PickupStatus;
  userRole: UserRole;
  compact?: boolean; // Mode compact pour tableaux
}

/**
 * Menu d'actions contextuelles pour une demande d'enlèvement
 *
 * @param pickupId - ID de la demande
 * @param currentStatus - Statut actuel
 * @param userRole - Rôle de l'utilisateur
 * @param compact - Mode compact (icône seule)
 *
 * @example
 * ```tsx
 * <PickupActionsMenu
 *   pickupId={pickup.id}
 *   currentStatus={pickup.status}
 *   userRole={session.user.role}
 * />
 * ```
 */
export function PickupActionsMenu({
  pickupId,
  currentStatus,
  userRole,
  compact = false,
}: PickupActionsMenuProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  // Vérifier les permissions
  const canManage =
    userRole === UserRole.ADMIN || userRole === UserRole.OPERATIONS_MANAGER;

  if (!canManage) {
    return null;
  }

  // Déterminer les actions disponibles selon le statut
  const canTakeCharge = currentStatus === PickupStatus.NOUVEAU;
  const canComplete = currentStatus === PickupStatus.PRISE_EN_CHARGE;
  const canCancel =
    currentStatus !== PickupStatus.EFFECTUE &&
    currentStatus !== PickupStatus.ANNULE;

  // Handler de changement de statut
  const handleStatusChange = async (newStatus: PickupStatus) => {
    startTransition(async () => {
      const input: UpdatePickupStatusInput = {
        pickupId,
        newStatus,
      };

      const result = await updatePickupStatus(input);

      if (result.success) {
        toast({
          title: 'Statut mis à jour',
          description: result.message,
        });
        router.refresh();
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  // Handler d'annulation
  const handleCancel = async () => {
    if (!cancellationReason || cancellationReason.trim().length < 10) {
      toast({
        title: 'Raison invalide',
        description: 'La raison doit contenir au moins 10 caractères',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const input: CancelPickupInput = {
        pickupId,
        cancellationReason: cancellationReason.trim(),
      };

      const result = await cancelPickup(input);

      if (result.success) {
        toast({
          title: 'Demande annulée',
          description: result.message,
        });
        setShowCancelDialog(false);
        setCancellationReason('');
        router.refresh();
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  // Mode compact : boutons directs (pour page de détails)
  if (!compact) {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {canTakeCharge && (
            <Button
              onClick={() => handleStatusChange(PickupStatus.PRISE_EN_CHARGE)}
              disabled={isPending}
              variant="default"
            >
              <Truck className="w-4 h-4 mr-2" />
              Prendre en charge
            </Button>
          )}

          {canComplete && (
            <Button
              onClick={() => handleStatusChange(PickupStatus.EFFECTUE)}
              disabled={isPending}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Marquer comme effectué
            </Button>
          )}

          {canCancel && (
            <Button
              onClick={() => setShowCancelDialog(true)}
              disabled={isPending}
              variant="destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          )}

          <Button
            onClick={() => router.push(`/dashboard/pickups/${pickupId}/schedule`)}
            disabled={isPending}
            variant="outline"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Planifier
          </Button>
        </div>

        {/* Modal d'annulation */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Annuler la demande d'enlèvement</DialogTitle>
              <DialogDescription>
                Veuillez indiquer la raison de l'annulation. Cette information
                sera visible par le client.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="cancellationReason">
                Raison d'annulation <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="cancellationReason"
                placeholder="Ex: Indisponibilité du transporteur, report à la demande du client..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Minimum 10 caractères
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancellationReason('');
                }}
                disabled={isPending}
              >
                Fermer
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isPending || cancellationReason.trim().length < 10}
              >
                {isPending ? 'Annulation...' : 'Confirmer l\'annulation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Mode compact : menu dropdown (pour tableaux)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isPending}>
            <MoreVertical className="w-4 h-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {canTakeCharge && (
            <DropdownMenuItem
              onClick={() => handleStatusChange(PickupStatus.PRISE_EN_CHARGE)}
            >
              <Truck className="w-4 h-4 mr-2" />
              Prendre en charge
            </DropdownMenuItem>
          )}

          {canComplete && (
            <DropdownMenuItem
              onClick={() => handleStatusChange(PickupStatus.EFFECTUE)}
            >
              <Check className="w-4 h-4 mr-2" />
              Marquer comme effectué
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/pickups/${pickupId}/schedule`)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Planifier
          </DropdownMenuItem>

          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowCancelDialog(true)}
                className="text-red-600"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Annuler
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal d'annulation (réutilisée) */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la demande d'enlèvement</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison de l'annulation. Cette information
              sera visible par le client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="cancellationReason">
              Raison d'annulation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancellationReason"
              placeholder="Ex: Indisponibilité du transporteur, report à la demande du client..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Minimum 10 caractères
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancellationReason('');
              }}
              disabled={isPending}
            >
              Fermer
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending || cancellationReason.trim().length < 10}
            >
              {isPending ? 'Annulation...' : 'Confirmer l\'annulation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
