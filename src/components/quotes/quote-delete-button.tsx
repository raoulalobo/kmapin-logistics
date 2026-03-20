/**
 * Composant : Bouton de suppression d'un devis (soft delete)
 *
 * Bouton interactif avec dialog de confirmation pour mettre un devis à la corbeille.
 * Appelle la Server Action deleteQuoteAction (soft delete) après confirmation.
 * Le devis n'est pas supprimé physiquement : il est marqué avec deletedAt et peut
 * être restauré par un admin via la vue "Corbeille".
 *
 * Workflow :
 * 1. L'utilisateur clique sur "Mettre à la corbeille"
 * 2. Un dialog de confirmation s'affiche (non irréversible)
 * 3. Si confirmé, appel de deleteQuoteAction (soft delete)
 * 4. Redirection vers la liste des devis
 *
 * @example
 * ```tsx
 * <QuoteDeleteButton quoteId="cuid123" quoteNumber="QT-2026-0001" />
 * ```
 *
 * @module components/quotes
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash, CircleNotch, WarningCircle } from '@phosphor-icons/react';
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

import { deleteQuoteAction } from '@/modules/quotes';

/**
 * Props du composant QuoteDeleteButton
 */
interface QuoteDeleteButtonProps {
  /** ID unique du devis à supprimer */
  quoteId: string;
  /** Numéro de devis affiché dans le dialog de confirmation (ex: "QT-2026-0001") */
  quoteNumber: string;
}

/**
 * Bouton de mise à la corbeille d'un devis avec dialog de confirmation
 *
 * Utilise un AlertDialog pour confirmation explicite avant le soft delete.
 * Après mise à la corbeille, redirige vers /dashboard/quotes.
 * Un admin pourra restaurer le devis depuis la vue Corbeille.
 */
export function QuoteDeleteButton({ quoteId, quoteNumber }: QuoteDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Mettre le devis à la corbeille après confirmation (soft delete)
   *
   * Workflow :
   * 1. Appel de la Server Action deleteQuoteAction (soft delete)
   * 2. Si succès : toast + redirection vers la liste
   * 3. Si erreur : toast d'erreur + le dialog reste ouvert
   */
  function handleDelete() {
    startTransition(async () => {
      const result = await deleteQuoteAction(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la mise à la corbeille du devis');
      } else {
        toast.success(`Devis ${quoteNumber} mis à la corbeille`);
        setIsOpen(false);
        // Rediriger vers la liste des devis après mise à la corbeille
        router.push('/dashboard/quotes');
      }
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash className="mr-2 h-4 w-4" />
          Mettre à la corbeille
        </Button>
      </AlertDialogTrigger>
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
  );
}
