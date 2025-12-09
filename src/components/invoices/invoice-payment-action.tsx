/**
 * Composant : Action de paiement d'une facture
 *
 * Composant interactif pour marquer une facture comme payée :
 * - Formulaire de paiement avec méthode et date
 * - Validation des données
 * - Gestion des états de chargement
 * - Feedback utilisateur
 *
 * @module components/invoices
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2, CreditCard } from 'lucide-react';
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

import { markInvoiceAsPaidAction } from '@/modules/invoices';

/**
 * Props du composant InvoicePaymentAction
 */
interface InvoicePaymentActionProps {
  invoiceId: string;
  invoiceStatus: string;
  invoiceTotal: number;
  currency: string;
}

/**
 * Méthodes de paiement disponibles
 */
const paymentMethods = [
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
  { value: 'CREDIT_CARD', label: 'Carte bancaire' },
  { value: 'CHECK', label: 'Chèque' },
  { value: 'CASH', label: 'Espèces' },
  { value: 'OTHER', label: 'Autre' },
] as const;

/**
 * Composant d'action de paiement
 */
export function InvoicePaymentAction({
  invoiceId,
  invoiceStatus,
  invoiceTotal,
  currency,
}: InvoicePaymentActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // États du formulaire
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [paidDate, setPaidDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );

  /**
   * Marquer la facture comme payée
   */
  function handleMarkAsPaid() {
    // Validation
    if (!paymentMethod) {
      toast.error('Veuillez sélectionner une méthode de paiement');
      return;
    }

    if (!paidDate) {
      toast.error('Veuillez sélectionner une date de paiement');
      return;
    }

    startTransition(async () => {
      const result = await markInvoiceAsPaidAction(invoiceId, {
        paymentMethod,
        paidDate,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de l\'enregistrement du paiement');
      } else {
        toast.success('Facture marquée comme payée avec succès !');
        setIsDialogOpen(false);
        // Rafraîchir la page pour afficher le nouveau statut
        router.refresh();
      }
    });
  }

  // Afficher le bouton seulement si la facture n'est pas déjà payée ou annulée
  if (invoiceStatus === 'PAID' || invoiceStatus === 'CANCELLED') {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Dialog de paiement */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="default" className="w-full" disabled={isPending}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Marquer comme payée
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer le paiement</DialogTitle>
            <DialogDescription>
              Enregistrez les informations de paiement pour cette facture de{' '}
              <span className="font-semibold">
                {invoiceTotal.toFixed(2)} {currency}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Méthode de paiement */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">Méthode de paiement *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Sélectionnez une méthode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date de paiement */}
            <div className="space-y-2">
              <Label htmlFor="paid-date">Date de paiement *</Label>
              <Input
                id="paid-date"
                type="datetime-local"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                max={new Date().toISOString().slice(0, 16)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Date et heure de réception du paiement
              </p>
            </div>

            {/* Résumé */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-semibold">
                  {invoiceTotal.toFixed(2)} {currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Méthode</span>
                <span className="font-medium">
                  {paymentMethods.find((m) => m.value === paymentMethod)?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {new Date(paidDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Confirmer le paiement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
