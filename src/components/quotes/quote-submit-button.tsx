/**
 * Composant : Bouton de soumission de devis
 *
 * Client Component permettant au propriétaire d'un devis de le soumettre
 * aux agents pour traitement. Affiche un dialog de confirmation avant
 * la soumission.
 *
 * Workflow :
 * 1. Client clique sur "Soumettre mon devis"
 * 2. Dialog de confirmation s'affiche avec explication
 * 3. Client confirme → appel de submitQuoteAction
 * 4. Devis passe de DRAFT à SUBMITTED
 * 5. Le devis devient visible aux agents
 *
 * @module components/quotes
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaperPlaneTilt,
  CircleNotch,
  Info,
  CheckCircle,
} from '@phosphor-icons/react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { submitQuoteAction } from '@/modules/quotes';

/**
 * Props du composant QuoteSubmitButton
 */
interface QuoteSubmitButtonProps {
  /** ID unique du devis à soumettre */
  quoteId: string;
  /** Numéro du devis (pour affichage dans le dialog) */
  quoteNumber: string;
  /** Variante du bouton (optionnel) */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  /** Taille du bouton (optionnel) */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Classe CSS additionnelle (optionnel) */
  className?: string;
}

/**
 * Bouton de soumission de devis avec dialog de confirmation
 *
 * Permet au client de soumettre son brouillon aux agents pour traitement.
 * Le devis passe alors du statut DRAFT à SUBMITTED et devient visible
 * aux agents (OPERATIONS_MANAGER, FINANCE_MANAGER).
 *
 * Caractéristiques :
 * - Dialog de confirmation avec explications claires
 * - Gestion des états de chargement
 * - Feedback via toast (succès/erreur)
 * - Rafraîchissement automatique de la page après soumission
 *
 * @example
 * ```tsx
 * <QuoteSubmitButton
 *   quoteId="cuid123"
 *   quoteNumber="QTE-20250204-00001"
 * />
 * ```
 */
export function QuoteSubmitButton({
  quoteId,
  quoteNumber,
  variant = 'default',
  size = 'default',
  className,
}: QuoteSubmitButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /**
   * Soumet le devis après confirmation
   *
   * Workflow :
   * 1. Appel de l'action serveur submitQuoteAction
   * 2. Affichage du résultat (succès/erreur)
   * 3. Fermeture du dialog et rafraîchissement de la page
   */
  function handleSubmit() {
    startTransition(async () => {
      const result = await submitQuoteAction(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la soumission du devis');
      } else {
        toast.success('Votre devis a été soumis avec succès !', {
          description: 'Un agent va prendre en charge votre demande.',
        });
        setIsDialogOpen(false);
        // Rafraîchir la page pour afficher le nouveau statut
        router.refresh();
      }
    });
  }

  /**
   * Reset le dialog à la fermeture
   */
  function handleDialogChange(open: boolean) {
    // Ne pas fermer le dialog si une action est en cours
    if (!open && isPending) return;
    setIsDialogOpen(open);
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <PaperPlaneTilt className="mr-2 h-4 w-4" />
          Soumettre mon devis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PaperPlaneTilt className="h-5 w-5 text-primary" />
            Soumettre votre devis ?
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de soumettre le devis{' '}
            <span className="font-mono font-semibold">{quoteNumber}</span> pour
            traitement.
          </DialogDescription>
        </DialogHeader>

        {/* Informations importantes */}
        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Que se passe-t-il ensuite ?</AlertTitle>
            <AlertDescription className="mt-2 space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>
                  Votre devis sera visible par nos agents qui analyseront votre demande.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>
                  Un agent vous enverra une offre formelle avec les tarifs et conditions.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>
                  Vous pourrez ensuite accepter ou refuser cette offre.
                </span>
              </p>
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground">
            <strong>Note :</strong> Une fois soumis, vous ne pourrez plus modifier
            les informations de votre devis. Assurez-vous que toutes les informations
            sont correctes avant de soumettre.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleDialogChange(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                Soumission...
              </>
            ) : (
              <>
                <PaperPlaneTilt className="mr-2 h-4 w-4" />
                Confirmer la soumission
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
