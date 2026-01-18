/**
 * Composant : Actions de paiement sur un devis
 *
 * Composant interactif pour la gestion du paiement d'un devis :
 * - Bouton "Paiement reçu" → Marque la date de réception du paiement
 * - Bouton "Télécharger facture" → Génère un PDF de facture à la volée
 *
 * Workflow :
 * [VALIDATED] + paymentReceivedAt=null → [Paiement reçu] → paymentReceivedAt=now
 * paymentReceivedAt!=null → [Télécharger facture] → PDF généré
 *
 * @module components/quotes
 * @permissions ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CurrencyDollar,
  CheckCircle,
  CircleNotch,
  FilePdf,
  Download,
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
import { Badge } from '@/components/ui/badge';

import { markQuotePaymentReceivedAction } from '@/modules/quotes';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Props du composant QuotePaymentActions
 */
interface QuotePaymentActionsProps {
  /** ID unique du devis */
  quoteId: string;
  /** Numéro du devis (ex: QTE-20250114-00001) */
  quoteNumber: string;
  /** Statut actuel du devis */
  quoteStatus: string;
  /** Date de réception du paiement (null si pas encore reçu) */
  paymentReceivedAt: Date | null;
  /** Nom de la personne ayant confirmé le paiement */
  paymentReceivedByName?: string | null;
  /** Montant estimé du devis (pour affichage) */
  estimatedCost: number;
  /** Devise (EUR, USD, etc.) */
  currency: string;
  /** Rôle de l'utilisateur connecté */
  userRole: string;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Composant d'actions de paiement sur un devis
 *
 * Affiche les boutons appropriés selon l'état du paiement :
 * - Si VALIDATED et pas de paiement : Bouton "Paiement reçu"
 * - Si paiement reçu : Badge vert + Bouton "Télécharger facture"
 */
export function QuotePaymentActions({
  quoteId,
  quoteNumber,
  quoteStatus,
  paymentReceivedAt,
  paymentReceivedByName,
  estimatedCost,
  currency,
  userRole,
}: QuotePaymentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // VÉRIFICATION DES PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Rôles autorisés à marquer le paiement comme reçu
  const canMarkPayment =
    userRole === 'ADMIN' ||
    userRole === 'OPERATIONS_MANAGER' ||
    userRole === 'FINANCE_MANAGER';

  // Les clients peuvent télécharger la facture s'ils ont accès au devis
  const canDownloadInvoice = true; // Le RBAC de l'API gère l'accès

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONS D'AFFICHAGE
  // ═══════════════════════════════════════════════════════════════════════════

  // Le bouton "Paiement reçu" n'est visible que si :
  // 1. Le devis est VALIDATED
  // 2. Le paiement n'a pas encore été reçu
  // 3. L'utilisateur a les permissions
  const showPaymentButton =
    quoteStatus === 'VALIDATED' && !paymentReceivedAt && canMarkPayment;

  // Le bouton "Télécharger facture" n'est visible que si le paiement est reçu
  const showInvoiceButton = paymentReceivedAt && canDownloadInvoice;

  // Ne rien afficher si aucune action n'est disponible
  if (!showPaymentButton && !showInvoiceButton) {
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Marquer le paiement comme reçu
   */
  function handleMarkPaymentReceived() {
    startTransition(async () => {
      const result = await markQuotePaymentReceivedAction(quoteId);

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la confirmation du paiement');
      } else {
        toast.success('Paiement confirmé ! La facture est maintenant disponible.');
        setIsDialogOpen(false);
        router.refresh();
      }
    });
  }

  /**
   * Télécharger la facture PDF
   * Ouvre l'URL de l'API dans un nouvel onglet pour déclencher le téléchargement
   */
  function handleDownloadInvoice() {
    // Ouvrir l'URL de l'API PDF dans un nouvel onglet
    // L'API vérifiera l'authentification et générera le PDF à la volée
    window.open(`/api/pdf/quote-invoice/${quoteId}`, '_blank');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU DU COMPOSANT
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ÉTAT DU PAIEMENT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {paymentReceivedAt && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-900">Paiement reçu</p>
            <p className="text-sm text-green-700">
              Confirmé le{' '}
              {new Date(paymentReceivedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {paymentReceivedByName && ` par ${paymentReceivedByName}`}
            </p>
          </div>
          <Badge variant="default" className="bg-green-600">
            {estimatedCost.toFixed(2)} {currency}
          </Badge>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOUTONS D'ACTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-3">
        {/* Bouton "Paiement reçu" */}
        {showPaymentButton && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="flex-1" disabled={isPending}>
                <CurrencyDollar className="mr-2 h-4 w-4" />
                Paiement reçu
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CurrencyDollar className="h-5 w-5 text-green-600" />
                  Confirmer la réception du paiement
                </DialogTitle>
                <DialogDescription>
                  Cette action marquera le devis {quoteNumber} comme payé et permettra
                  de générer la facture.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {/* Résumé du montant */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Numéro de devis</span>
                    <span className="font-semibold">{quoteNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-semibold text-green-600">
                      {estimatedCost.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      {currency}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  Une fois confirmé, vous pourrez télécharger la facture PDF générée
                  automatiquement à partir des données du devis.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button
                  variant="default"
                  onClick={handleMarkPaymentReceived}
                  disabled={isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isPending ? (
                    <>
                      <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                      Confirmation...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmer le paiement
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Bouton "Télécharger facture" */}
        {showInvoiceButton && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownloadInvoice}
          >
            <Download className="mr-2 h-4 w-4" />
            <FilePdf className="mr-2 h-4 w-4 text-red-500" />
            Télécharger la facture
          </Button>
        )}
      </div>
    </div>
  );
}
