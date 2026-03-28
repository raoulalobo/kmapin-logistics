/**
 * Composant : Menu d'actions contextuel pour un devis (⋮)
 *
 * Affiche un bouton ⋮ (DotsThreeVertical) qui ouvre un menu dropdown avec :
 * - Voir détails → lien vers /dashboard/quotes/{id} (toujours visible)
 * - Modifier → lien vers /dashboard/quotes/{id}/edit (conditionnel)
 * - Mettre à la corbeille → soft delete avec dialog de confirmation (conditionnel)
 *
 * Logique de visibilité (identique à la page détail quotes/[id]/page.tsx) :
 * - Modifier : CLIENT sur DRAFT, ou ADMIN/OPERATIONS_MANAGER sur SUBMITTED
 * - Supprimer : pas de paiement confirmé ET (CLIENT sur DRAFT, ou ADMIN/OPS/FINANCE sur DRAFT/SUBMITTED/SENT/REJECTED/EXPIRED/CANCELLED)
 *
 * Utilisé dans la page liste /dashboard/quotes pour chaque carte de devis.
 * Composant client car il gère l'interactivité du dropdown + dialog.
 *
 * @example
 * ```tsx
 * <QuoteActionsMenu
 *   quoteId="cuid123"
 *   quoteNumber="QT-2026-0001"
 *   quoteStatus="DRAFT"
 *   userRole="ADMIN"
 *   hasPayment={false}
 * />
 * ```
 *
 * @module components/quotes
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DotsThreeVertical, Eye, PencilSimple, Trash, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { deleteQuoteAction } from '@/modules/quotes';

// ============================================
// TYPES
// ============================================

/**
 * Props du composant QuoteActionsMenu
 *
 * @param quoteId - ID unique du devis (pour liens et action de suppression)
 * @param quoteNumber - Numéro affiché du devis (ex: "QT-2026-0001", pour le dialog de confirmation)
 * @param quoteStatus - Statut actuel du devis (détermine les actions visibles)
 * @param userRole - Rôle de l'utilisateur connecté (ADMIN, CLIENT, etc.)
 * @param hasPayment - true si paymentReceivedAt != null (bloque la suppression)
 */
interface QuoteActionsMenuProps {
  quoteId: string;
  quoteNumber: string;
  quoteStatus: string;
  userRole: string;
  hasPayment: boolean;
}

// ============================================
// STATUTS AUTORISÉS POUR LA SUPPRESSION PAR LES AGENTS
// ============================================

/** Statuts sur lesquels ADMIN, OPERATIONS_MANAGER et FINANCE_MANAGER peuvent supprimer */
const AGENT_DELETABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'SENT', 'ACCEPTED', 'IN_TREATMENT', 'VALIDATED', 'REJECTED', 'EXPIRED', 'CANCELLED'];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Menu d'actions contextuel (⋮) pour un devis dans la liste
 *
 * Gère deux interactions distinctes :
 * 1. Navigation (Voir détails, Modifier) → liens Next.js
 * 2. Suppression (Mettre à la corbeille) → ouvre un AlertDialog de confirmation
 *
 * Le pattern DropdownMenu + AlertDialog requiert un état local showDeleteDialog
 * car le dropdown se ferme (et démonte ses enfants) avant que l'AlertDialog ne s'ouvre.
 * On déclenche donc l'AlertDialog via un state externe au dropdown.
 */
export function QuoteActionsMenu({
  quoteId,
  quoteNumber,
  quoteStatus,
  userRole,
  hasPayment,
}: QuoteActionsMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ============================================
  // LOGIQUE DE VISIBILITÉ DES ACTIONS
  // ============================================

  // Modifier : CLIENT sur DRAFT, ou ADMIN/OPERATIONS_MANAGER sur SUBMITTED
  const canEdit =
    (userRole === 'CLIENT' && quoteStatus === 'DRAFT') ||
    ((userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER') && quoteStatus === 'SUBMITTED');

  // Supprimer : pas de paiement confirmé ET conditions de rôle/statut
  // CLIENT peut supprimer ses brouillons (DRAFT)
  // ADMIN/OPERATIONS_MANAGER/FINANCE_MANAGER peuvent supprimer sur plusieurs statuts
  const canDelete =
    !hasPayment &&
    (
      (userRole === 'CLIENT' && quoteStatus === 'DRAFT') ||
      (['ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER'].includes(userRole) &&
        AGENT_DELETABLE_STATUSES.includes(quoteStatus))
    );

  // ============================================
  // HANDLER DE SUPPRESSION (SOFT DELETE)
  // ============================================

  /**
   * Exécute le soft delete du devis après confirmation
   *
   * Workflow :
   * 1. Appel de deleteQuoteAction (Server Action — marque deletedAt)
   * 2. Succès → toast + refresh de la page (le devis disparaît de la liste)
   * 3. Erreur → toast d'erreur, le dialog reste ouvert
   */
  function handleDelete() {
    startTransition(async () => {
      const result = await deleteQuoteAction(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la mise à la corbeille du devis');
      } else {
        toast.success(`Devis ${quoteNumber} mis à la corbeille`);
        setShowDeleteDialog(false);
        // Refresh pour retirer le devis de la liste (pas de redirection nécessaire, on est déjà sur la liste)
        router.refresh();
      }
    });
  }

  // ============================================
  // RENDU
  // ============================================

  return (
    <>
      {/* Menu dropdown déclenché par le bouton ⋮ */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <DotsThreeVertical className="h-5 w-5" weight="bold" />
            <span className="sr-only">Actions pour le devis {quoteNumber}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Voir détails — toujours visible */}
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/quotes/${quoteId}`}>
              <Eye className="mr-2 h-4 w-4" />
              Voir détails
            </Link>
          </DropdownMenuItem>

          {/* Séparateur entre "Voir détails" et les actions conditionnelles */}
          {(canEdit || canDelete) && <DropdownMenuSeparator />}

          {/* Modifier — conditionnel selon rôle et statut */}
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/quotes/${quoteId}/edit`}>
                <PencilSimple className="mr-2 h-4 w-4" />
                Modifier
              </Link>
            </DropdownMenuItem>
          )}

          {/* Séparateur si les deux actions sont visibles */}
          {canEdit && canDelete && <DropdownMenuSeparator />}

          {/* Supprimer — conditionnel */}
          {canDelete && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Mettre à la corbeille
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* AlertDialog de confirmation de suppression (rendu en dehors du dropdown) */}
      {/* Déclenché par l'état showDeleteDialog, pas par un Trigger dans le menu */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <WarningCircle className="h-5 w-5 text-destructive" />
              Mettre le devis {quoteNumber} à la corbeille ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le devis sera déplacé dans la corbeille. Un administrateur pourra le restaurer si nécessaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  Mise à la corbeille...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Mettre à la corbeille
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
