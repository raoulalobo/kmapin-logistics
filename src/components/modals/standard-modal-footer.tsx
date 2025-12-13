/**
 * Composant : StandardModalFooter
 *
 * Footer standardisé pour les modales avec :
 * - Bouton "Add New" à gauche (optionnel)
 * - Boutons "Cancel" et "Submit" à droite
 * - Support des états loading et disabled
 * - Labels personnalisables
 */

'use client';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

/**
 * Props du composant StandardModalFooter
 */
interface StandardModalFooterProps {
  /**
   * Callback appelé lors du clic sur "Annuler"
   * Généralement ferme la modale
   */
  onCancel: () => void;

  /**
   * Callback appelé lors du clic sur "Soumettre"
   * Déclenche l'action principale de la modale
   */
  onSubmit: () => void;

  /**
   * Configuration du bouton "Add New" (optionnel)
   * Si fourni, affiche un bouton à gauche du footer
   */
  addNew?: {
    /** Label du bouton */
    label: string;
    /** Callback au clic */
    onClick: () => void;
    /** Icône personnalisée (optionnelle, défaut: Plus) */
    icon?: React.ReactNode;
  };

  /**
   * Labels personnalisés pour les boutons (optionnels)
   */
  labels?: {
    /** Label bouton submit (défaut: "Sélectionner") */
    submit?: string;
    /** Label bouton cancel (défaut: "Annuler") */
    cancel?: string;
  };

  /**
   * État de chargement
   * Si true, tous les boutons sont désactivés
   * et le bouton submit affiche "Chargement..."
   * @default false
   */
  isLoading?: boolean;

  /**
   * Désactive le bouton submit
   * Utilisé quand aucune sélection n'est faite
   * @default false
   */
  isSubmitDisabled?: boolean;
}

/**
 * Composant StandardModalFooter
 *
 * Footer avec layout structuré pour les StandardModals :
 * - Gauche : Bouton "Add New" optionnel
 * - Droite : Boutons "Cancel" + "Submit"
 *
 * @example
 * ```tsx
 * <StandardModalFooter
 *   onCancel={() => setOpen(false)}
 *   onSubmit={handleSubmit}
 *   addNew={{
 *     label: 'Nouvelle entreprise',
 *     onClick: () => router.push('/clients/new'),
 *   }}
 *   labels={{
 *     submit: 'Enregistrer',
 *     cancel: 'Annuler',
 *   }}
 *   isLoading={isPending}
 *   isSubmitDisabled={selectedIds.length === 0}
 * />
 * ```
 */
export function StandardModalFooter({
  onCancel,
  onSubmit,
  addNew,
  labels = {},
  isLoading = false,
  isSubmitDisabled = false,
}: StandardModalFooterProps) {
  return (
    <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
      {/* Section gauche : Bouton "Add New" (optionnel) */}
      <div>
        {addNew && (
          <Button
            type="button"
            variant="outline"
            onClick={addNew.onClick}
            disabled={isLoading}
            className="gap-2"
          >
            {/* Icône (par défaut: Plus, ou personnalisée) */}
            {addNew.icon || <Plus className="h-4 w-4" />}
            {addNew.label}
          </Button>
        )}
      </div>

      {/* Section droite : Boutons Cancel + Submit */}
      <div className="flex gap-2">
        {/* Bouton Annuler */}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {labels.cancel || 'Annuler'}
        </Button>

        {/* Bouton Soumettre */}
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || isSubmitDisabled}
        >
          {isLoading ? 'Chargement...' : labels.submit || 'Sélectionner'}
        </Button>
      </div>
    </DialogFooter>
  );
}
