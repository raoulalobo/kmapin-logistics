/**
 * Composant : StandardModalItem
 *
 * Affiche un item individuel dans une StandardModal avec :
 * - Checkbox pour la sélection
 * - Point coloré indiquant le statut
 * - Label et description
 * - Badge optionnel
 * - Support état désactivé avec tooltip explicatif
 */

'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { StandardModalItem } from './standard-modal-types';

/**
 * Couleurs des indicateurs de statut (points colorés)
 * Utilisent les classes Tailwind pour cohérence avec le design system
 */
const STATUS_COLORS = {
  active: 'bg-green-500', // Vert - Item actif/actuel
  inactive: 'bg-gray-400', // Gris - Item inactif
  pending: 'bg-yellow-500', // Jaune - En attente
  default: 'bg-blue-500', // Bleu - Défaut
} as const;

/**
 * Props du composant StandardModalItem
 */
interface StandardModalItemProps {
  /** L'item à afficher */
  item: StandardModalItem;

  /** Indique si l'item est actuellement sélectionné */
  isSelected: boolean;

  /**
   * Callback appelé lors du clic pour toggle la sélection
   * @param id - ID de l'item à toggle
   */
  onToggle: (id: string) => void;
}

/**
 * Composant StandardModalItem
 *
 * Affiche un item sélectionnable avec checkbox, indicateur de statut,
 * label, description et badge optionnel.
 *
 * @example
 * ```tsx
 * <StandardModalItemComponent
 *   item={{
 *     id: 'perm-1',
 *     label: 'Voir les expéditions',
 *     description: 'Permission de lecture',
 *     status: 'active',
 *     category: 'Opérations',
 *   }}
 *   isSelected={true}
 *   onToggle={(id) => console.log('Toggled', id)}
 * />
 * ```
 */
export function StandardModalItemComponent({
  item,
  isSelected,
  onToggle,
}: StandardModalItemProps) {
  /**
   * Contenu principal de l'item
   * Structure : Checkbox | Point coloré | Label + Description + Badge
   */
  const content = (
    <div
      className={cn(
        // Layout et spacing
        'flex items-center gap-3 rounded-lg border p-3',
        // Transition douce
        'transition-colors',
        // État sélectionné : bordure et fond primary
        isSelected && 'border-primary bg-primary/5',
        // État normal non disabled : cursor pointer + hover
        !item.disabled && 'cursor-pointer hover:bg-accent',
        // État disabled : cursor not-allowed + opacité réduite
        item.disabled && 'cursor-not-allowed opacity-50'
      )}
      onClick={() => !item.disabled && onToggle(item.id)}
      role="button"
      tabIndex={item.disabled ? -1 : 0}
      aria-disabled={item.disabled}
      onKeyDown={(e) => {
        // Support clavier : Espace ou Entrée pour toggle
        if (!item.disabled && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          onToggle(item.id);
        }
      }}
    >
      {/* Checkbox de sélection */}
      <Checkbox
        checked={isSelected}
        disabled={item.disabled}
        onCheckedChange={() => !item.disabled && onToggle(item.id)}
        aria-label={`Sélectionner ${item.label}`}
      />

      {/* Indicateur de statut (point coloré) */}
      {item.status && (
        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            STATUS_COLORS[item.status]
          )}
          aria-label={`Statut: ${item.status}`}
          title={`Statut: ${item.status}`}
        />
      )}

      {/* Container principal : Label + Description + Badge */}
      <div className="flex-1 min-w-0">
        {/* Ligne du haut : Label + Badge */}
        <div className="flex items-center gap-2">
          {/* Label principal */}
          <p className="font-medium text-sm truncate">{item.label}</p>

          {/* Badge optionnel */}
          {item.badge && (
            <Badge variant={item.badge.variant} className="text-xs shrink-0">
              {item.badge.text}
            </Badge>
          )}
        </div>

        {/* Description (ligne du bas, optionnelle) */}
        {item.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );

  /**
   * Si l'item est désactivé ET qu'une raison est fournie,
   * wrap le contenu dans un Tooltip pour afficher la raison
   */
  if (item.disabled && item.disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>{item.disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Sinon, retourner le contenu tel quel
  return content;
}
