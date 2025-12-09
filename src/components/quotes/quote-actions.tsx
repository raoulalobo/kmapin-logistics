/**
 * Composant : Actions sur un devis
 *
 * Composant interactif pour accepter ou rejeter un devis :
 * - Bouton "Accepter le devis" avec confirmation
 * - Bouton "Rejeter le devis" avec raison obligatoire
 * - Gestion des états de chargement
 * - Feedback utilisateur avec messages
 *
 * @module components/quotes
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { acceptQuoteAction, rejectQuoteAction } from '@/modules/quotes';

/**
 * Props du composant QuoteActions
 */
interface QuoteActionsProps {
  quoteId: string;
  quoteStatus: string;
  isExpired: boolean;
}

/**
 * Composant d'actions sur un devis
 */
export function QuoteActions({ quoteId, quoteStatus, isExpired }: QuoteActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // États pour les dialogs
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  /**
   * Accepter le devis
   */
  function handleAccept() {
    startTransition(async () => {
      const result = await acceptQuoteAction(quoteId, {});

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de l\'acceptation du devis');
      } else {
        toast.success('Devis accepté avec succès !');
        setIsAcceptDialogOpen(false);
        // Rafraîchir la page pour afficher le nouveau statut
        router.refresh();
      }
    });
  }

  /**
   * Rejeter le devis
   */
  function handleReject() {
    // Validation de la raison
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      toast.error('Veuillez fournir une raison d\'au moins 10 caractères');
      return;
    }

    startTransition(async () => {
      const result = await rejectQuoteAction(quoteId, {
        reason: rejectReason,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors du rejet du devis');
      } else {
        toast.success('Devis rejeté avec succès');
        setIsRejectDialogOpen(false);
        setRejectReason('');
        // Rafraîchir la page pour afficher le nouveau statut
        router.refresh();
      }
    });
  }

  // Afficher les boutons seulement si le devis est envoyé et non expiré
  if (quoteStatus !== 'SENT' || isExpired) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Boutons d'action */}
      <div className="flex gap-3">
        {/* Dialog d'acceptation */}
        <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="flex-1" disabled={isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Accepter le devis
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accepter ce devis ?</DialogTitle>
              <DialogDescription>
                Vous êtes sur le point d'accepter ce devis. Cette action confirmera votre accord
                avec les termes et le montant proposés.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAcceptDialogOpen(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button onClick={handleAccept} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Acceptation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmer l'acceptation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de rejet */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="flex-1" disabled={isPending}>
              <XCircle className="mr-2 h-4 w-4" />
              Rejeter le devis
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter ce devis ?</DialogTitle>
              <DialogDescription>
                Veuillez indiquer la raison du rejet. Cette information sera enregistrée.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Raison du rejet *</Label>
                <Input
                  id="reason"
                  placeholder="Ex: Prix trop élevé, délais trop longs..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 caractères requis
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setRejectReason('');
                }}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isPending || rejectReason.trim().length < 10}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejet...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Confirmer le rejet
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
