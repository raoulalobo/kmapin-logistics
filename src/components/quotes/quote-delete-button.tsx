/**
 * Composant : Bouton de suppression d'un devis
 *
 * Bouton interactif avec dialog de confirmation pour supprimer un devis DRAFT.
 * Appelle la Server Action deleteQuoteAction après confirmation de l'utilisateur.
 *
 * Workflow :
 * 1. Le CLIENT clique sur "Supprimer"
 * 2. Un dialog de confirmation s'affiche
 * 3. Si confirmé, appel de deleteQuoteAction
 * 4. Redirection vers la liste des devis après suppression
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
 * Bouton de suppression d'un devis avec dialog de confirmation
 *
 * Utilise un AlertDialog (et non un simple Dialog) car c'est une action destructive
 * qui nécessite une confirmation explicite de l'utilisateur.
 * Après suppression, redirige vers /dashboard/quotes.
 */
export function QuoteDeleteButton({ quoteId, quoteNumber }: QuoteDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Supprimer le devis après confirmation
   *
   * Workflow :
   * 1. Appel de la Server Action deleteQuoteAction
   * 2. Si succès : toast + redirection vers la liste
   * 3. Si erreur : toast d'erreur + le dialog reste ouvert
   */
  function handleDelete() {
    startTransition(async () => {
      const result = await deleteQuoteAction(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la suppression du devis');
      } else {
        toast.success(`Devis ${quoteNumber} supprimé avec succès`);
        setIsOpen(false);
        // Rediriger vers la liste des devis après suppression
        router.push('/dashboard/quotes');
      }
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash className="mr-2 h-4 w-4" />
          Supprimer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <WarningCircle className="h-5 w-5 text-destructive" />
            Supprimer le devis {quoteNumber} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le devis sera définitivement supprimé
            de votre compte.
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
                Suppression...
              </>
            ) : (
              <>
                <Trash className="mr-2 h-4 w-4" />
                Supprimer définitivement
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
