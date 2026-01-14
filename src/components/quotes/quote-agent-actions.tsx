/**
 * Composant : Actions Agent sur un devis
 *
 * Composant interactif pour le workflow de traitement des devis par un agent :
 * - Bouton "Traiter devis" → Dialog choix paiement → Statut IN_TREATMENT
 * - Bouton "Valider" (visible si IN_TREATMENT) → Création expédition → Statut VALIDATED
 * - Bouton "Annuler" → Dialog raison → Statut CANCELLED
 *
 * Workflow complet :
 * [SENT/ACCEPTED] → [Traiter] → [IN_TREATMENT] → [Valider] → [VALIDATED] + Expédition créée
 *                               [IN_TREATMENT] → [Annuler] → [CANCELLED]
 *
 * @module components/quotes
 * @permissions ADMIN, OPERATIONS_MANAGER
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  CheckCircle,
  XCircle,
  CircleNotch,
  CurrencyDollar,
  Truck,
  Bank,
  Package,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  startQuoteTreatmentAction,
  validateQuoteTreatmentAction,
  cancelQuoteAction,
} from '@/modules/quotes';

// ════════════════════════════════════════════════════════════════════════════
// TYPES ET CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Props du composant QuoteAgentActions
 */
interface QuoteAgentActionsProps {
  /** ID unique du devis */
  quoteId: string;
  /** Numéro du devis (ex: QTE-20250114-00001) */
  quoteNumber: string;
  /** Statut actuel du devis */
  quoteStatus: string;
  /** Montant estimé du devis */
  estimatedCost: number;
  /** Devise (EUR, USD, etc.) */
  currency: string;
  /** Pays d'origine (code ISO) */
  originCountry: string;
  /** Pays de destination (code ISO) */
  destinationCountry: string;
  /** Rôle de l'utilisateur connecté */
  userRole: string;
}

/**
 * Méthodes de paiement disponibles pour le traitement
 * Correspond à l'enum QuotePaymentMethod dans schema.zmodel
 */
const PAYMENT_METHODS = [
  {
    value: 'CASH',
    label: 'Comptant',
    description: 'Paiement immédiat à la commande',
    icon: CurrencyDollar,
  },
  {
    value: 'ON_DELIVERY',
    label: 'À la livraison',
    description: 'Paiement à la réception de la marchandise',
    icon: Truck,
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Virement bancaire',
    description: 'Le RIB sera envoyé par email au client',
    icon: Bank,
  },
] as const;

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Composant d'actions agent sur un devis
 *
 * Affiche les boutons d'action appropriés selon le statut du devis :
 * - SENT/ACCEPTED : Boutons "Traiter devis" et "Annuler"
 * - IN_TREATMENT : Boutons "Valider" et "Annuler"
 * - VALIDATED/CANCELLED : Aucun bouton (lecture seule)
 */
export function QuoteAgentActions({
  quoteId,
  quoteNumber,
  quoteStatus,
  estimatedCost,
  currency,
  originCountry,
  destinationCountry,
  userRole,
}: QuoteAgentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS POUR LES DIALOGS
  // ═══════════════════════════════════════════════════════════════════════════

  // Dialog "Traiter devis"
  const [isTreatDialogOpen, setIsTreatDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [treatmentComment, setTreatmentComment] = useState('');

  // Dialog "Valider"
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [validateComment, setValidateComment] = useState('');
  const [packageCount, setPackageCount] = useState(1);
  const [cargoDescription, setCargoDescription] = useState('');

  // Dialog "Annuler"
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // ═══════════════════════════════════════════════════════════════════════════
  // VÉRIFICATION DES PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Seuls les ADMIN et OPERATIONS_MANAGER peuvent traiter les devis
  const canTreatQuotes = userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER';

  if (!canTreatQuotes) {
    return null; // Pas de boutons pour les autres rôles
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DES ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Démarrer le traitement du devis
   * Statut : SENT/ACCEPTED → IN_TREATMENT
   */
  function handleStartTreatment() {
    if (!paymentMethod) {
      toast.error('Veuillez sélectionner une méthode de paiement');
      return;
    }

    startTransition(async () => {
      const result = await startQuoteTreatmentAction(quoteId, {
        paymentMethod: paymentMethod as 'CASH' | 'ON_DELIVERY' | 'BANK_TRANSFER',
        comment: treatmentComment || null,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors du démarrage du traitement');
      } else {
        // Message spécifique si virement bancaire
        if (paymentMethod === 'BANK_TRANSFER') {
          toast.success('Traitement démarré ! Un email avec le RIB sera envoyé au client.');
        } else {
          toast.success('Traitement démarré avec succès !');
        }
        setIsTreatDialogOpen(false);
        resetTreatmentForm();
        router.refresh();
      }
    });
  }

  /**
   * Valider le traitement et créer l'expédition
   * Statut : IN_TREATMENT → VALIDATED
   */
  function handleValidateTreatment() {
    startTransition(async () => {
      const result = await validateQuoteTreatmentAction(quoteId, {
        comment: validateComment || null,
        packageCount: packageCount,
        cargoDescription: cargoDescription || undefined,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la validation');
      } else {
        toast.success(
          `Devis validé ! Expédition créée avec le numéro ${result.data.trackingNumber}`
        );
        setIsValidateDialogOpen(false);
        resetValidateForm();
        // Rediriger vers la nouvelle expédition
        router.push(`/dashboard/shipments/${result.data.shipmentId}`);
      }
    });
  }

  /**
   * Annuler le devis
   * Statut : ANY → CANCELLED
   */
  function handleCancelQuote() {
    if (!cancelReason.trim() || cancelReason.trim().length < 10) {
      toast.error('Veuillez fournir une raison d\'au moins 10 caractères');
      return;
    }

    startTransition(async () => {
      const result = await cancelQuoteAction(quoteId, {
        reason: cancelReason,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de l\'annulation');
      } else {
        toast.success('Devis annulé avec succès');
        setIsCancelDialogOpen(false);
        resetCancelForm();
        router.refresh();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Réinitialiser le formulaire de traitement */
  function resetTreatmentForm() {
    setPaymentMethod('CASH');
    setTreatmentComment('');
  }

  /** Réinitialiser le formulaire de validation */
  function resetValidateForm() {
    setValidateComment('');
    setPackageCount(1);
    setCargoDescription('');
  }

  /** Réinitialiser le formulaire d'annulation */
  function resetCancelForm() {
    setCancelReason('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU CONDITIONNEL SELON LE STATUT
  // ═══════════════════════════════════════════════════════════════════════════

  // Pas de boutons si le devis est déjà validé ou annulé
  if (quoteStatus === 'VALIDATED' || quoteStatus === 'CANCELLED') {
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU DU COMPOSANT
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOUTONS PRINCIPAUX */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-3">
        {/* Bouton "Traiter devis" - visible si SENT ou ACCEPTED */}
        {(quoteStatus === 'SENT' || quoteStatus === 'ACCEPTED') && (
          <Dialog open={isTreatDialogOpen} onOpenChange={setIsTreatDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="flex-1" disabled={isPending}>
                <Play className="mr-2 h-4 w-4" />
                Traiter le devis
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Traiter le devis {quoteNumber}
                </DialogTitle>
                <DialogDescription>
                  Sélectionnez la méthode de paiement et ajoutez un commentaire optionnel.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Résumé du devis */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-semibold">
                      {estimatedCost.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      {currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Route</span>
                    <span className="font-medium">
                      {originCountry} → {destinationCountry}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Sélection de la méthode de paiement */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Méthode de paiement *
                  </Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon;
                        return (
                          <SelectItem key={method.value} value={method.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{method.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Description de la méthode sélectionnée */}
                  {paymentMethod && (
                    <p className="text-sm text-muted-foreground">
                      {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.description}
                    </p>
                  )}

                  {/* Avertissement pour virement bancaire */}
                  {paymentMethod === 'BANK_TRANSFER' && (
                    <Badge variant="secondary" className="mt-2">
                      <Bank className="mr-1 h-3 w-3" />
                      Un email avec le RIB sera automatiquement envoyé au client
                    </Badge>
                  )}
                </div>

                {/* Commentaire optionnel */}
                <div className="space-y-2">
                  <Label htmlFor="treatment-comment">Commentaire (optionnel)</Label>
                  <Textarea
                    id="treatment-comment"
                    placeholder="Ex: Client contacté par téléphone, accord confirmé..."
                    value={treatmentComment}
                    onChange={(e) => setTreatmentComment(e.target.value)}
                    disabled={isPending}
                    className="h-20"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsTreatDialogOpen(false);
                    resetTreatmentForm();
                  }}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button onClick={handleStartTreatment} disabled={isPending}>
                  {isPending ? (
                    <>
                      <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Démarrer le traitement
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Bouton "Valider" - visible si IN_TREATMENT */}
        {quoteStatus === 'IN_TREATMENT' && (
          <Dialog open={isValidateDialogOpen} onOpenChange={setIsValidateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="flex-1" disabled={isPending}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Valider et créer l'expédition
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Valider le devis {quoteNumber}
                </DialogTitle>
                <DialogDescription>
                  Cette action créera automatiquement une expédition liée à ce devis.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Résumé du devis */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-semibold">
                      {estimatedCost.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      {currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Route</span>
                    <span className="font-medium">
                      {originCountry} → {destinationCountry}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Nombre de colis */}
                <div className="space-y-2">
                  <Label htmlFor="package-count">Nombre de colis</Label>
                  <Input
                    id="package-count"
                    type="number"
                    min={1}
                    value={packageCount}
                    onChange={(e) => setPackageCount(parseInt(e.target.value) || 1)}
                    disabled={isPending}
                  />
                </div>

                {/* Description de la marchandise */}
                <div className="space-y-2">
                  <Label htmlFor="cargo-description">Description de la marchandise</Label>
                  <Textarea
                    id="cargo-description"
                    placeholder="Ex: Palettes de marchandises générales..."
                    value={cargoDescription}
                    onChange={(e) => setCargoDescription(e.target.value)}
                    disabled={isPending}
                    className="h-20"
                  />
                </div>

                {/* Commentaire optionnel */}
                <div className="space-y-2">
                  <Label htmlFor="validate-comment">Commentaire de validation (optionnel)</Label>
                  <Textarea
                    id="validate-comment"
                    placeholder="Ex: Documents reçus et vérifiés..."
                    value={validateComment}
                    onChange={(e) => setValidateComment(e.target.value)}
                    disabled={isPending}
                    className="h-20"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsValidateDialogOpen(false);
                    resetValidateForm();
                  }}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button onClick={handleValidateTreatment} disabled={isPending}>
                  {isPending ? (
                    <>
                      <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                      Validation...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Valider et créer l'expédition
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Bouton "Annuler" - visible pour tous les statuts sauf VALIDATED et CANCELLED */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              className={quoteStatus === 'IN_TREATMENT' ? 'flex-1' : ''}
              disabled={isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Annuler le devis
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Annuler le devis {quoteNumber} ?
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Veuillez indiquer la raison de l'annulation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Raison de l'annulation *</Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Ex: Client ne répond plus depuis 30 jours, tarifs refusés..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={isPending}
                  className="h-24"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 caractères requis ({cancelReason.length}/10)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCancelDialogOpen(false);
                  resetCancelForm();
                }}
                disabled={isPending}
              >
                Retour
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelQuote}
                disabled={isPending || cancelReason.trim().length < 10}
              >
                {isPending ? (
                  <>
                    <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                    Annulation...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Confirmer l'annulation
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
