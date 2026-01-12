'use client';

/**
 * Dialog pour annuler une demande d'enlèvement
 *
 * Ce composant affiche un Dialog modal qui oblige l'utilisateur à fournir
 * une raison détaillée (minimum 10 caractères) avant de pouvoir annuler
 * une demande d'enlèvement.
 *
 * Features:
 * - Validation côté client (minimum 10 caractères)
 * - Feedback visuel en cas d'erreur
 * - Bouton d'annulation pour fermer sans action
 * - State management local pour la raison et l'erreur
 * - Callback onConfirm qui reçoit la raison validée
 *
 * @module components/pickups/cancel-pickup-dialog
 */

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle } from '@phosphor-icons/react';

interface CancelPickupDialogProps {
  /** Callback appelé avec la raison lorsque l'utilisateur confirme */
  onConfirm: (reason: string) => Promise<void>;
  /** Indique si l'action est en cours (désactive les boutons) */
  isLoading?: boolean;
}

/**
 * Composant CancelPickupDialog
 *
 * Workflow:
 * 1. Utilisateur clique sur le bouton "Annuler" (trigger)
 * 2. Dialog s'ouvre avec un champ textarea
 * 3. Utilisateur tape la raison
 * 4. Validation: minimum 10 caractères requis
 * 5. Appel de onConfirm avec la raison
 * 6. Dialog se ferme et state se réinitialise
 */
export function CancelPickupDialog({ onConfirm, isLoading }: CancelPickupDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  /**
   * Handler de confirmation
   * Valide la raison, appelle onConfirm, puis ferme le dialog
   */
  async function handleConfirm() {
    // Validation côté client
    if (!reason.trim()) {
      setError('La raison d\'annulation est obligatoire');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Veuillez fournir une raison détaillée (min 10 caractères)');
      return;
    }

    // Appeler le callback avec la raison validée
    await onConfirm(reason);

    // Fermer et réinitialiser le state
    setOpen(false);
    setReason('');
    setError('');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger: Bouton rouge "Annuler" avec icône */}
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <XCircle className="h-4 w-4" />
          Annuler
        </Button>
      </DialogTrigger>

      {/* Contenu du Dialog */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler la Demande d'Enlèvement</DialogTitle>
          <DialogDescription>
            Veuillez indiquer la raison de l'annulation. Cette information sera visible dans l'historique.
          </DialogDescription>
        </DialogHeader>

        {/* Champ de saisie de la raison */}
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Raison de l'annulation *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(''); // Effacer l'erreur lors de la saisie
              }}
              placeholder="Ex: Client a annulé sa commande, adresse incorrecte, report de la date..."
              rows={4}
              className={error ? 'border-red-500' : ''}
            />
            {/* Affichage de l'erreur de validation */}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>

        {/* Footer avec boutons */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Retour
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Annulation...' : 'Confirmer l\'Annulation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
