/**
 * Composant Menu d'Actions pour les Demandes d'Achat Délégué
 *
 * Affiche les actions disponibles selon le statut actuel et le rôle utilisateur.
 * Permet de gérer le workflow des achats délégués :
 * - NOUVEAU → EN_COURS (Prendre en charge)
 * - EN_COURS → LIVRE (Marquer comme livré)
 * - * → ANNULE (Annuler avec raison obligatoire)
 *
 * US-3.2 : Boutons d'actions de changement de statut
 * US-3.3 : Modal d'annulation avec raison obligatoire
 *
 * @example
 * ```tsx
 * // Mode normal (boutons complets) - pour page de détails
 * <PurchaseActionsMenu
 *   purchaseId={purchase.id}
 *   currentStatus={purchase.status}
 *   userRole={session.user.role}
 * />
 *
 * // Mode compact (menu dropdown) - pour tableaux
 * <PurchaseActionsMenu
 *   purchaseId={purchase.id}
 *   currentStatus={purchase.status}
 *   userRole={session.user.role}
 *   compact
 * />
 * ```
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
import { PurchaseStatus, UserRole } from '@/lib/db/enums';
import {
  updatePurchaseStatus,
  cancelPurchase,
} from '@/modules/purchases/actions/purchase.actions';
import {
  MoreVertical,
  PlayCircle,
  PackageCheck,
  XCircle,
  Loader2,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface PurchaseActionsMenuProps {
  /** ID de la demande d'achat */
  purchaseId: string;
  /** Statut actuel de la demande */
  currentStatus: PurchaseStatus;
  /** Rôle de l'utilisateur connecté (pour vérifier les permissions) */
  userRole: string;
  /** Mode compact pour affichage dans tableaux (menu dropdown au lieu de boutons) */
  compact?: boolean;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Menu d'actions contextuelles pour une demande d'achat délégué
 *
 * Workflow des statuts :
 * - NOUVEAU : Peut être pris en charge (→ EN_COURS) ou annulé
 * - EN_COURS : Peut être marqué comme livré (→ LIVRE) ou annulé
 * - LIVRE : Statut terminal, aucune action disponible
 * - ANNULE : Statut terminal, aucune action disponible
 *
 * Permissions :
 * - ADMIN / OPERATIONS_MANAGER : Toutes les actions
 * - FINANCE_MANAGER / CLIENT / VIEWER : Aucune action (composant non affiché)
 *
 * @param purchaseId - ID unique de la demande
 * @param currentStatus - Statut actuel pour déterminer les actions disponibles
 * @param userRole - Rôle utilisateur pour vérifier les permissions
 * @param compact - Si true, affiche un menu dropdown compact (pour tableaux)
 */
export function PurchaseActionsMenu({
  purchaseId,
  currentStatus,
  userRole,
  compact = false,
}: PurchaseActionsMenuProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  // ============================================
  // VÉRIFICATION DES PERMISSIONS
  // ============================================

  // Seuls ADMIN et OPERATIONS_MANAGER peuvent gérer les achats
  const canManage =
    userRole === UserRole.ADMIN || userRole === UserRole.OPERATIONS_MANAGER;

  // Si l'utilisateur n'a pas les permissions, ne rien afficher
  if (!canManage) {
    return null;
  }

  // ============================================
  // DÉTERMINATION DES ACTIONS DISPONIBLES
  // ============================================

  // NOUVEAU → EN_COURS : Prendre en charge la demande
  const canTakeCharge = currentStatus === PurchaseStatus.NOUVEAU;

  // EN_COURS → LIVRE : Marquer comme livré
  const canMarkDelivered = currentStatus === PurchaseStatus.EN_COURS;

  // Annulation possible tant que non terminée (LIVRE ou ANNULE)
  const canCancel =
    currentStatus !== PurchaseStatus.LIVRE &&
    currentStatus !== PurchaseStatus.ANNULE;

  // ============================================
  // HANDLERS D'ACTIONS
  // ============================================

  /**
   * Change le statut de la demande vers un nouveau statut
   *
   * @param newStatus - Nouveau statut à appliquer
   */
  const handleStatusChange = async (newStatus: PurchaseStatus) => {
    startTransition(async () => {
      const result = await updatePurchaseStatus({
        purchaseId,
        newStatus,
      });

      if (result.success) {
        toast({
          title: 'Statut mis à jour',
          description: result.message || `Statut changé vers ${newStatus}`,
        });
        // Rafraîchir la page pour voir les changements
        router.refresh();
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de mettre à jour le statut',
          variant: 'destructive',
        });
      }
    });
  };

  /**
   * Annule la demande avec raison obligatoire
   * Vérifie que la raison fait au moins 10 caractères
   */
  const handleCancel = async () => {
    // Validation de la raison
    if (!cancellationReason || cancellationReason.trim().length < 10) {
      toast({
        title: 'Raison invalide',
        description: 'La raison doit contenir au moins 10 caractères',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const result = await cancelPurchase({
        purchaseId,
        cancellationReason: cancellationReason.trim(),
      });

      if (result.success) {
        toast({
          title: 'Demande annulée',
          description: result.message || 'La demande a été annulée avec succès',
        });
        // Fermer le dialog et réinitialiser
        setShowCancelDialog(false);
        setCancellationReason('');
        router.refresh();
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible d\'annuler la demande',
          variant: 'destructive',
        });
      }
    });
  };

  // ============================================
  // RENDU MODE NORMAL (BOUTONS)
  // ============================================

  if (!compact) {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {/* Bouton Prendre en charge (NOUVEAU → EN_COURS) */}
          {canTakeCharge && (
            <Button
              onClick={() => handleStatusChange(PurchaseStatus.EN_COURS)}
              disabled={isPending}
              variant="default"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4 mr-2" />
              )}
              Prendre en charge
            </Button>
          )}

          {/* Bouton Marquer comme livré (EN_COURS → LIVRE) */}
          {canMarkDelivered && (
            <Button
              onClick={() => handleStatusChange(PurchaseStatus.LIVRE)}
              disabled={isPending}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4 mr-2" />
              )}
              Marquer comme livré
            </Button>
          )}

          {/* Bouton Annuler (ouvre le dialog) */}
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
        </div>

        {/* Dialog d'annulation avec raison obligatoire */}
        <CancelDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          cancellationReason={cancellationReason}
          onReasonChange={setCancellationReason}
          onConfirm={handleCancel}
          isPending={isPending}
        />
      </>
    );
  }

  // ============================================
  // RENDU MODE COMPACT (DROPDOWN MENU)
  // ============================================

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4" />
            )}
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Option Prendre en charge */}
          {canTakeCharge && (
            <DropdownMenuItem
              onClick={() => handleStatusChange(PurchaseStatus.EN_COURS)}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Prendre en charge
            </DropdownMenuItem>
          )}

          {/* Option Marquer comme livré */}
          {canMarkDelivered && (
            <DropdownMenuItem
              onClick={() => handleStatusChange(PurchaseStatus.LIVRE)}
            >
              <PackageCheck className="w-4 h-4 mr-2" />
              Marquer comme livré
            </DropdownMenuItem>
          )}

          {/* Option Annuler */}
          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowCancelDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Annuler
              </DropdownMenuItem>
            </>
          )}

          {/* Message si aucune action disponible */}
          {!canTakeCharge && !canMarkDelivered && !canCancel && (
            <DropdownMenuItem disabled>
              Aucune action disponible
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog d'annulation (partagé) */}
      <CancelDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        cancellationReason={cancellationReason}
        onReasonChange={setCancellationReason}
        onConfirm={handleCancel}
        isPending={isPending}
      />
    </>
  );
}

// ============================================
// COMPOSANT DIALOG D'ANNULATION
// ============================================

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cancellationReason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

/**
 * Dialog modal pour saisir la raison d'annulation
 * Réutilisé entre le mode normal et compact
 *
 * @param open - État d'ouverture du dialog
 * @param onOpenChange - Callback pour changer l'état
 * @param cancellationReason - Raison saisie
 * @param onReasonChange - Callback pour mettre à jour la raison
 * @param onConfirm - Callback pour confirmer l'annulation
 * @param isPending - Si une action est en cours
 */
function CancelDialog({
  open,
  onOpenChange,
  cancellationReason,
  onReasonChange,
  onConfirm,
  isPending,
}: CancelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler la demande d&apos;achat</DialogTitle>
          <DialogDescription>
            Veuillez indiquer la raison de l&apos;annulation. Cette information
            sera visible par le client et conservée dans l&apos;historique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancellationReason">
            Raison d&apos;annulation <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="cancellationReason"
            placeholder="Ex: Produit indisponible chez le fournisseur, budget dépassé, annulation demandée par le client..."
            value={cancellationReason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Minimum 10 caractères ({cancellationReason.length}/10)
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onReasonChange('');
            }}
            disabled={isPending}
          >
            Fermer
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending || cancellationReason.trim().length < 10}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Annulation...
              </>
            ) : (
              'Confirmer l\'annulation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
