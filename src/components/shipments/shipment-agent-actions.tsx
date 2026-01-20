/**
 * Composant : Actions Agent sur une expédition
 *
 * Composant interactif pour le workflow de traitement des expéditions par un agent :
 * - Boutons de transition d'état selon le statut actuel
 * - Dialog de confirmation avec commentaire optionnel
 * - Historique des actions visible dans les TrackingEvents
 *
 * Workflow complet :
 * [PENDING] → "Prendre en charge" → [PICKED_UP]
 * [PICKED_UP] → "Acheminer" → [IN_TRANSIT]
 * [IN_TRANSIT] → "Traitement administratif" → [AT_CUSTOMS]
 * [AT_CUSTOMS] → "Réceptionner" → [READY_FOR_PICKUP]
 * [READY_FOR_PICKUP] → "Confirmer retrait" → [DELIVERED]
 *
 * @module components/shipments
 * @permissions ADMIN, OPERATIONS_MANAGER
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Truck,
  Airplane,
  Buildings,
  Package,
  CheckCircle,
  XCircle,
  CircleNotch,
  Pause,
  ArrowRight,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { updateShipmentStatusAction } from '@/modules/shipments';
import { ShipmentStatus } from '@/lib/db/enums';

// ════════════════════════════════════════════════════════════════════════════
// TYPES ET CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Props du composant ShipmentAgentActions
 */
interface ShipmentAgentActionsProps {
  /** ID unique de l'expédition */
  shipmentId: string;
  /** Numéro de tracking (ex: BF-XK7-1425-00001) */
  trackingNumber: string;
  /** Statut actuel de l'expédition */
  shipmentStatus: ShipmentStatus;
  /** Pays d'origine */
  originCountry: string;
  /** Pays de destination */
  destinationCountry: string;
  /** Rôle de l'utilisateur connecté */
  userRole: string;
  /** Nom de l'agent connecté (affiché dans le popup de confirmation) */
  agentName: string;
}

/**
 * Configuration d'une transition de statut
 * Définit le bouton à afficher et le statut cible
 */
interface StatusTransition {
  /** Statut source (quand ce bouton est visible) */
  fromStatus: ShipmentStatus;
  /** Statut cible après la transition */
  toStatus: ShipmentStatus;
  /** Label du bouton */
  label: string;
  /** Label du statut cible en français */
  targetLabel: string;
  /** Description de l'action */
  description: string;
  /** Icône du bouton (composant Phosphor) */
  icon: typeof Package;
  /** Variante du bouton */
  variant: 'default' | 'secondary' | 'outline';
}

/**
 * Configuration des transitions de statut pour le workflow agent
 *
 * Chaque transition définit :
 * - Le statut source (fromStatus) : quand afficher le bouton
 * - Le statut cible (toStatus) : le nouveau statut après action
 * - Les labels et icônes pour l'interface
 *
 * Workflow : PENDING_APPROVAL → PICKED_UP → IN_TRANSIT → AT_CUSTOMS → READY_FOR_PICKUP → DELIVERED
 */
const STATUS_TRANSITIONS: StatusTransition[] = [
  {
    fromStatus: 'PENDING_APPROVAL',
    toStatus: 'PICKED_UP',
    label: 'Prendre en charge',
    targetLabel: 'Prise en charge',
    description: 'Confirmer la prise en charge de cette expédition',
    icon: Package,
    variant: 'default',
  },
  {
    fromStatus: 'PICKED_UP',
    toStatus: 'IN_TRANSIT',
    label: 'Acheminer',
    targetLabel: 'En cours d\'acheminement',
    description: 'Confirmer le départ en transit de cette expédition',
    icon: Truck,
    variant: 'default',
  },
  {
    fromStatus: 'IN_TRANSIT',
    toStatus: 'AT_CUSTOMS',
    label: 'Traitement administratif',
    targetLabel: 'En cours de dédouanement',
    description: 'L\'expédition est arrivée et entre en phase de dédouanement',
    icon: Buildings,
    variant: 'default',
  },
  {
    fromStatus: 'AT_CUSTOMS',
    toStatus: 'READY_FOR_PICKUP',
    label: 'Réceptionner',
    targetLabel: 'À retirer',
    description: 'Le dédouanement est terminé, l\'expédition est prête pour le retrait',
    icon: CheckCircle,
    variant: 'default',
  },
  {
    fromStatus: 'READY_FOR_PICKUP',
    toStatus: 'DELIVERED',
    label: 'Confirmer le retrait',
    targetLabel: 'Retiré',
    description: 'Confirmer que le client a retiré son colis',
    icon: CheckCircle,
    variant: 'default',
  },
];

/**
 * Labels français pour chaque statut
 * Adaptés au workflow agent logistique
 */
const STATUS_LABELS: Record<ShipmentStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_APPROVAL: 'Enregistré',
  APPROVED: 'Approuvé',
  PICKED_UP: 'Prise en charge',
  IN_TRANSIT: 'En cours d\'acheminement',
  AT_CUSTOMS: 'En cours de dédouanement',
  CUSTOMS_CLEARED: 'Dédouané',
  OUT_FOR_DELIVERY: 'En livraison',
  READY_FOR_PICKUP: 'À retirer',
  DELIVERED: 'Retiré',
  CANCELLED: 'Annulé',
  ON_HOLD: 'En attente',
  EXCEPTION: 'Exception',
};

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Composant d'actions agent sur une expédition
 *
 * Affiche les boutons d'action appropriés selon le statut de l'expédition :
 * - PENDING : Bouton "Prendre en charge"
 * - PICKED_UP : Bouton "Acheminer"
 * - IN_TRANSIT : Bouton "Traitement administratif"
 * - AT_CUSTOMS : Bouton "Réceptionner"
 * - READY_FOR_PICKUP : Bouton "Confirmer le retrait"
 * - DELIVERED/CANCELLED : Aucun bouton (lecture seule)
 */
export function ShipmentAgentActions({
  shipmentId,
  trackingNumber,
  shipmentStatus,
  originCountry,
  destinationCountry,
  userRole,
  agentName,
}: ShipmentAgentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS POUR LES DIALOGS
  // ═══════════════════════════════════════════════════════════════════════════

  // Dialog de transition de statut
  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<StatusTransition | null>(null);
  const [transitionComment, setTransitionComment] = useState('');

  // Dialog d'annulation
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Dialog de mise en attente
  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  // ═══════════════════════════════════════════════════════════════════════════
  // VÉRIFICATION DES PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Seuls les ADMIN et OPERATIONS_MANAGER peuvent gérer les expéditions
  const canManageShipments = userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER';

  if (!canManageShipments) {
    return null; // Pas de boutons pour les autres rôles
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DES ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Ouvrir le dialog de transition avec la configuration appropriée
   */
  function openTransitionDialog(transition: StatusTransition) {
    setSelectedTransition(transition);
    setTransitionComment('');
    setIsTransitionDialogOpen(true);
  }

  /**
   * Exécuter la transition de statut
   */
  function handleTransition() {
    if (!selectedTransition) return;

    startTransition(async () => {
      const result = await updateShipmentStatusAction(shipmentId, {
        status: selectedTransition.toStatus,
        notes: transitionComment || `Transition vers ${selectedTransition.targetLabel}`,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la mise à jour du statut');
      } else {
        toast.success(`Expédition passée à "${selectedTransition.targetLabel}"`);
        setIsTransitionDialogOpen(false);
        setSelectedTransition(null);
        setTransitionComment('');
        router.refresh();
      }
    });
  }

  /**
   * Mettre l'expédition en attente
   */
  function handlePutOnHold() {
    if (!holdReason.trim() || holdReason.trim().length < 10) {
      toast.error('Veuillez fournir une raison d\'au moins 10 caractères');
      return;
    }

    startTransition(async () => {
      const result = await updateShipmentStatusAction(shipmentId, {
        status: 'ON_HOLD',
        notes: holdReason,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la mise en attente');
      } else {
        toast.success('Expédition mise en attente');
        setIsHoldDialogOpen(false);
        setHoldReason('');
        router.refresh();
      }
    });
  }

  /**
   * Annuler l'expédition
   */
  function handleCancel() {
    if (!cancelReason.trim() || cancelReason.trim().length < 10) {
      toast.error('Veuillez fournir une raison d\'au moins 10 caractères');
      return;
    }

    startTransition(async () => {
      const result = await updateShipmentStatusAction(shipmentId, {
        status: 'CANCELLED',
        notes: cancelReason,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de l\'annulation');
      } else {
        toast.success('Expédition annulée');
        setIsCancelDialogOpen(false);
        setCancelReason('');
        router.refresh();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU CONDITIONNEL SELON LE STATUT
  // ═══════════════════════════════════════════════════════════════════════════

  // Pas de boutons si l'expédition est terminée ou annulée
  if (shipmentStatus === 'DELIVERED' || shipmentStatus === 'CANCELLED') {
    return (
      <div className="text-center py-4">
        <Badge variant={shipmentStatus === 'DELIVERED' ? 'default' : 'destructive'} className="text-base px-4 py-2">
          {STATUS_LABELS[shipmentStatus]}
        </Badge>
        <p className="text-sm text-muted-foreground mt-2">
          {shipmentStatus === 'DELIVERED'
            ? 'Cette expédition a été livrée avec succès.'
            : 'Cette expédition a été annulée.'}
        </p>
      </div>
    );
  }

  // Trouver la transition disponible pour le statut actuel
  const availableTransition = STATUS_TRANSITIONS.find(
    (t) => t.fromStatus === shipmentStatus
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU DU COMPOSANT
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* INDICATEUR DE PROGRESSION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <span className="font-medium">Statut actuel :</span>
        <Badge variant="outline" className="font-semibold">
          {STATUS_LABELS[shipmentStatus] || shipmentStatus}
        </Badge>
        {availableTransition && (
          <>
            <ArrowRight className="h-4 w-4" />
            <span className="text-primary font-medium">
              Prochaine étape : {availableTransition.targetLabel}
            </span>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOUTONS PRINCIPAUX */}
      {/* Grille responsive : 1 colonne sur mobile, 3 colonnes sur desktop */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Bouton de transition principal */}
        {availableTransition && (
          <Dialog open={isTransitionDialogOpen} onOpenChange={setIsTransitionDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant={availableTransition.variant}
                className="w-full justify-center"
                disabled={isPending}
                onClick={() => openTransitionDialog(availableTransition)}
              >
                <availableTransition.icon className="mr-2 h-4 w-4" />
                {availableTransition.label}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTransition && (
                    <selectedTransition.icon className="h-5 w-5 text-primary" />
                  )}
                  {selectedTransition?.label} - {trackingNumber}
                </DialogTitle>
                <DialogDescription>
                  {selectedTransition?.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Résumé de l'expédition et informations de l'agent */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Agent</span>
                    <span className="font-medium">{agentName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date/Heure</span>
                    <span className="font-medium">
                      {new Date().toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Route</span>
                    <span className="font-medium">
                      {originCountry} → {destinationCountry}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transition</span>
                    <span className="font-semibold text-primary">
                      {STATUS_LABELS[shipmentStatus]} → {selectedTransition?.targetLabel}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Commentaire optionnel */}
                <div className="space-y-2">
                  <Label htmlFor="transition-comment">Commentaire (optionnel)</Label>
                  <Textarea
                    id="transition-comment"
                    placeholder="Ex: Colis récupéré par le transporteur, documents vérifiés..."
                    value={transitionComment}
                    onChange={(e) => setTransitionComment(e.target.value)}
                    disabled={isPending}
                    className="h-20"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsTransitionDialogOpen(false);
                    setSelectedTransition(null);
                    setTransitionComment('');
                  }}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button onClick={handleTransition} disabled={isPending}>
                  {isPending ? (
                    <>
                      <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Bouton Mettre en attente - visible sauf si déjà ON_HOLD, DELIVERED ou CANCELLED */}
        {shipmentStatus !== 'ON_HOLD' && (
          <Dialog open={isHoldDialogOpen} onOpenChange={setIsHoldDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="w-full justify-center" disabled={isPending}>
                <Pause className="mr-2 h-4 w-4" />
                Mettre en attente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pause className="h-5 w-5 text-orange-500" />
                  Mettre en attente - {trackingNumber}
                </DialogTitle>
                <DialogDescription>
                  L'expédition sera suspendue jusqu'à résolution du problème.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Informations de l'agent */}
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Agent</span>
                    <span className="font-medium">{agentName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date/Heure</span>
                    <span className="font-medium">
                      {new Date().toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hold-reason">Raison de la mise en attente *</Label>
                  <Textarea
                    id="hold-reason"
                    placeholder="Ex: Documents manquants, problème de paiement, attente instructions client..."
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    disabled={isPending}
                    className="h-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 caractères requis ({holdReason.length}/10)
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsHoldDialogOpen(false);
                    setHoldReason('');
                  }}
                  disabled={isPending}
                >
                  Retour
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePutOnHold}
                  disabled={isPending || holdReason.trim().length < 10}
                >
                  {isPending ? (
                    <>
                      <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                      Mise en attente...
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Confirmer la mise en attente
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Bouton Reprendre - visible si ON_HOLD */}
        {shipmentStatus === 'ON_HOLD' && (
          <Button
            variant="default"
            className="w-full justify-center"
            disabled={isPending}
            onClick={() => {
              // Reprendre au statut PENDING_APPROVAL pour recommencer le workflow
              startTransition(async () => {
                const result = await updateShipmentStatusAction(shipmentId, {
                  status: 'PENDING_APPROVAL',
                  notes: 'Expédition reprise après mise en attente',
                });
                if (!result.success) {
                  toast.error(result.error || 'Erreur lors de la reprise');
                } else {
                  toast.success('Expédition reprise');
                  router.refresh();
                }
              });
            }}
          >
            <Play className="mr-2 h-4 w-4" />
            Reprendre le traitement
          </Button>
        )}

        {/* Bouton Annuler */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full justify-center" disabled={isPending}>
              <XCircle className="mr-2 h-4 w-4" />
              Annuler l'expédition
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Annuler l'expédition {trackingNumber} ?
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible. L'expédition sera définitivement annulée.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Informations de l'agent */}
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Agent</span>
                  <span className="font-medium">{agentName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date/Heure</span>
                  <span className="font-medium">
                    {new Date().toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Raison de l'annulation *</Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Ex: Demande client, erreur de saisie, colis endommagé..."
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
                  setCancelReason('');
                }}
                disabled={isPending}
              >
                Retour
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
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
