/**
 * Composant : Bouton de restauration d'un devis depuis la corbeille
 *
 * Bouton interactif avec dialog de confirmation pour restaurer un devis soft-deleted.
 * Appelle la Server Action restoreQuoteAction après confirmation.
 * Le devis redevient visible dans la liste normale des devis.
 *
 * Réservé aux ADMIN et OPERATIONS_MANAGER (vérifié côté serveur).
 *
 * @example
 * ```tsx
 * <QuoteRestoreButton quoteId="cuid123" quoteNumber="QT-2026-0001" />
 * ```
 *
 * @module components/quotes
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowCounterClockwise, CircleNotch } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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

import { restoreQuoteAction } from '@/modules/quotes';

/**
 * Props du composant QuoteRestoreButton
 */
interface QuoteRestoreButtonProps {
  /** ID unique du devis à restaurer */
  quoteId: string;
  /** Numéro de devis affiché dans le dialog de confirmation (ex: "QT-2026-0001") */
  quoteNumber: string;
}

/**
 * Bouton de restauration d'un devis avec dialog de confirmation
 *
 * Utilise un AlertDialog pour confirmation explicite avant restauration.
 * Après restauration, le router est rafraîchi pour mettre à jour la liste.
 */
export function QuoteRestoreButton({ quoteId, quoteNumber }: QuoteRestoreButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Restaurer le devis après confirmation
   *
   * Workflow :
   * 1. Appel de la Server Action restoreQuoteAction
   * 2. Si succès : toast + rafraîchir la page
   * 3. Si erreur : toast d'erreur
   */
  function handleRestore() {
    startTransition(async () => {
      const result = await restoreQuoteAction(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la restauration du devis');
      } else {
        toast.success(`Devis ${quoteNumber} restauré avec succès`);
        setIsOpen(false);
        // Rafraîchir la page pour mettre à jour la liste de la corbeille
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowCounterClockwise className="mr-2 h-4 w-4" />
          Restaurer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowCounterClockwise className="h-5 w-5 text-primary" />
            Restaurer le devis {quoteNumber} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Le devis sera restauré et redeviendra visible dans la liste des devis.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRestore}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                Restauration...
              </>
            ) : (
              <>
                <ArrowCounterClockwise className="mr-2 h-4 w-4" />
                Restaurer
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
