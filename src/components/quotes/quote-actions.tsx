/**
 * Composant : Actions sur un devis
 *
 * Composant interactif pour accepter ou rejeter un devis :
 * - Bouton "Accepter le devis" avec sélection de méthode de paiement
 * - Bouton "Rejeter le devis" avec raison obligatoire
 * - Gestion des états de chargement
 * - Feedback utilisateur avec messages
 *
 * @module components/quotes
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  CircleNotch,
  CurrencyEur,
  Truck,
  Bank,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { acceptQuoteAction, rejectQuoteAction } from '@/modules/quotes';

/**
 * Configuration des méthodes de paiement disponibles
 * Chaque méthode a un label, une description et une icône
 */
const PAYMENT_METHODS = {
  CASH: {
    label: 'Paiement comptant',
    description: 'Paiement intégral avant expédition',
    icon: CurrencyEur,
  },
  ON_DELIVERY: {
    label: 'Paiement à la livraison',
    description: 'Paiement lors de la réception du colis',
    icon: Truck,
  },
  BANK_TRANSFER: {
    label: 'Virement bancaire',
    description: 'Transfert vers notre compte bancaire',
    icon: Bank,
  },
} as const;

/**
 * Type pour les méthodes de paiement
 */
type PaymentMethod = keyof typeof PAYMENT_METHODS;

/**
 * Props du composant QuoteActions
 */
interface QuoteActionsProps {
  /** ID unique du devis */
  quoteId: string;
  /** Statut actuel du devis (SENT, ACCEPTED, etc.) */
  quoteStatus: string;
  /** Indique si le devis est expiré */
  isExpired: boolean;
}

/**
 * Composant d'actions sur un devis
 *
 * Permet au client d'accepter ou rejeter un devis depuis son dashboard.
 * Lors de l'acceptation, le client doit choisir sa méthode de paiement.
 * Lors du rejet, le client doit fournir une raison (min. 10 caractères).
 *
 * @example
 * ```tsx
 * <QuoteActions
 *   quoteId="cuid123"
 *   quoteStatus="SENT"
 *   isExpired={false}
 * />
 * ```
 */
export function QuoteActions({ quoteId, quoteStatus, isExpired }: QuoteActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // États pour les dialogs
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  // État pour la méthode de paiement sélectionnée (obligatoire pour accepter)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

  // État pour la raison du rejet
  const [rejectReason, setRejectReason] = useState('');

  /**
   * Accepter le devis avec la méthode de paiement choisie
   *
   * Workflow :
   * 1. Validation de la méthode de paiement (obligatoire)
   * 2. Appel de l'action serveur acceptQuoteAction
   * 3. Affichage du résultat (succès/erreur)
   * 4. Rafraîchissement de la page
   */
  function handleAccept() {
    // Validation : méthode de paiement obligatoire
    if (!paymentMethod) {
      toast.error('Veuillez sélectionner une méthode de paiement');
      return;
    }

    startTransition(async () => {
      const result = await acceptQuoteAction(quoteId, {
        paymentMethod: paymentMethod as PaymentMethod,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de l\'acceptation du devis');
      } else {
        toast.success('Devis accepté avec succès !');
        setIsAcceptDialogOpen(false);
        setPaymentMethod(''); // Reset la sélection
        // Rafraîchir la page pour afficher le nouveau statut
        router.refresh();
      }
    });
  }

  /**
   * Rejeter le devis avec la raison fournie
   *
   * Workflow :
   * 1. Validation de la raison (min. 10 caractères)
   * 2. Appel de l'action serveur rejectQuoteAction
   * 3. Affichage du résultat (succès/erreur)
   * 4. Rafraîchissement de la page
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

  /**
   * Reset les états lors de la fermeture du dialog d'acceptation
   */
  function handleAcceptDialogClose(open: boolean) {
    setIsAcceptDialogOpen(open);
    if (!open) {
      setPaymentMethod(''); // Reset la sélection à la fermeture
    }
  }

  /**
   * Reset les états lors de la fermeture du dialog de rejet
   */
  function handleRejectDialogClose(open: boolean) {
    setIsRejectDialogOpen(open);
    if (!open) {
      setRejectReason(''); // Reset la raison à la fermeture
    }
  }

  // Afficher les boutons seulement si le devis est envoyé et non expiré
  // Un devis ne peut être accepté/rejeté que s'il est au statut SENT
  if (quoteStatus !== 'SENT' || isExpired) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Boutons d'action */}
      <div className="flex gap-3">
        {/* Dialog d'acceptation avec sélection de méthode de paiement */}
        <Dialog open={isAcceptDialogOpen} onOpenChange={handleAcceptDialogClose}>
          <DialogTrigger asChild>
            <Button variant="default" className="flex-1" disabled={isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Accepter le devis
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Accepter ce devis ?</DialogTitle>
              <DialogDescription>
                Vous êtes sur le point d'accepter ce devis. Veuillez choisir
                votre méthode de paiement préférée.
              </DialogDescription>
            </DialogHeader>

            {/* Sélection de la méthode de paiement */}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Méthode de paiement *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  disabled={isPending}
                >
                  <SelectTrigger id="payment-method" className="w-full">
                    <SelectValue placeholder="Sélectionnez une méthode de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Itérer sur les méthodes de paiement disponibles */}
                    {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((method) => {
                      const config = PAYMENT_METHODS[method];
                      const Icon = config.icon;
                      return (
                        <SelectItem key={method} value={method}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span>{config.label}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Afficher la description de la méthode sélectionnée */}
                {paymentMethod && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {PAYMENT_METHODS[paymentMethod].description}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleAcceptDialogClose(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isPending || !paymentMethod}
              >
                {isPending ? (
                  <>
                    <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
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

        {/* Dialog de rejet avec raison obligatoire */}
        <Dialog open={isRejectDialogOpen} onOpenChange={handleRejectDialogClose}>
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
                Veuillez indiquer la raison du rejet. Cette information sera
                enregistrée et permettra d'améliorer nos services.
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
                  Minimum 10 caractères requis ({rejectReason.trim().length}/10)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleRejectDialogClose(false)}
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
                    <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
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
