/**
 * Skeleton réutilisable pour les composants Timeline
 *
 * Utilisé par :
 * - ShipmentHistoryTimeline
 * - QuoteHistoryTimeline
 * - PickupHistoryTimeline
 * - PurchaseHistoryTimeline
 *
 * @param count - Nombre d'événements à afficher (défaut: 5)
 * @param compact - Mode compact avec moins d'espace (défaut: false)
 */

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TimelineSkeletonProps {
  /** Nombre d'événements à simuler */
  count?: number;
  /** Mode compact */
  compact?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
}

export function TimelineSkeleton({
  count = 5,
  compact = false,
  className,
}: TimelineSkeletonProps) {
  return (
    <div className={cn('space-y-6', compact && 'space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {/* Colonne gauche : Icône + ligne verticale */}
          <div className="flex flex-col items-center">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            {/* Ligne verticale (sauf pour le dernier élément) */}
            {i < count - 1 && (
              <div className={cn('w-0.5 bg-border', compact ? 'h-12' : 'h-16')} />
            )}
          </div>

          {/* Colonne droite : Contenu de l'événement */}
          <div className="flex-1 space-y-2">
            {/* En-tête : Titre + Date */}
            <div className="flex items-center justify-between gap-4">
              <Skeleton className={cn('h-5', compact ? 'w-[160px]' : 'w-[200px]')} />
              <Skeleton className="h-4 w-[100px] flex-shrink-0" />
            </div>

            {/* Utilisateur */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className={cn('h-4', compact ? 'w-[120px]' : 'w-[150px]')} />
            </div>

            {/* Notes / Description */}
            {!compact && (
              <>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[80%]" />
              </>
            )}

            {/* Métadonnées (détails) - visible uniquement 1 fois sur 2 pour variété */}
            {i % 2 === 0 && !compact && (
              <div className="mt-3 rounded-lg border bg-muted/20 p-3 space-y-2">
                <Skeleton className="h-3 w-[140px]" />
                <Skeleton className="h-3 w-[180px]" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
