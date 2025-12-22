/**
 * Composant : Action de suppression d'une facture
 *
 * Composant interactif pour supprimer une facture :
 * - Dialog de confirmation avec avertissement
 * - Validation du statut (seules les factures DRAFT peuvent être supprimées)
 * - Gestion des états de chargement
 * - Feedback utilisateur
 * - Redirection après suppression
 *
 * @module components/invoices
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash, CircleNotch, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

import { deleteInvoiceAction } from '@/modules/invoices';

/**
 * Props du composant InvoiceDeleteAction
 */
interface InvoiceDeleteActionProps {
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * Composant d'action de suppression
 */
export function InvoiceDeleteAction({
  invoiceId,
  invoiceNumber,
  invoiceStatus,
  variant = 'destructive',
  size = 'default',
  className,
}: InvoiceDeleteActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /**
   * Supprimer la facture
   */
  function handleDelete() {
    // Vérifier que la facture peut être supprimée
    if (invoiceStatus !== 'DRAFT') {
      toast.error('Seules les factures en brouillon peuvent être supprimées');
      setIsDialogOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await deleteInvoiceAction(invoiceId);

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la suppression de la facture');
      } else {
        toast.success('Facture supprimée avec succès !');
        setIsDialogOpen(false);
        // Rediriger vers la liste des factures
        router.push('/dashboard/invoices');
      }
    });
  }

  // Désactiver le bouton si la facture n'est pas en DRAFT
  const canDelete = invoiceStatus === 'DRAFT';

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={!canDelete || isPending}
        >
          <Trash className="mr-2 h-4 w-4" />
          Supprimer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Warning className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>Supprimer la facture</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette facture ?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Informations de la facture */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Numéro de facture</span>
                <span className="font-mono font-semibold">{invoiceNumber}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Statut</span>
                <span className="font-medium">
                  {invoiceStatus === 'DRAFT' ? 'Brouillon' : invoiceStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Avertissement */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <Warning className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-orange-900">
                Action irréversible
              </p>
              <p className="text-xs text-orange-800">
                Cette action ne peut pas être annulée. La facture et toutes ses
                lignes seront définitivement supprimées de la base de données.
              </p>
            </div>
          </div>

          {/* Message si la facture ne peut pas être supprimée */}
          {!canDelete && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <Warning className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-red-900">
                  Suppression impossible
                </p>
                <p className="text-xs text-red-800">
                  Seules les factures en brouillon (DRAFT) peuvent être supprimées.
                  Cette facture a le statut "{invoiceStatus}".
                </p>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isPending}
          >
            {isPending ? (
              <>
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash className="mr-2 h-4 w-4" />
                Supprimer définitivement
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
