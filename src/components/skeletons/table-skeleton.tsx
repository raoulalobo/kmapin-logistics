/**
 * Skeleton réutilisable pour les tableaux de données
 *
 * Utilisé pour les listes dans :
 * - Quotes, Shipments, Pickups, Purchases
 * - Clients, Users, Countries
 *
 * @param rows - Nombre de lignes (défaut: 5)
 * @param columns - Nombre de colonnes (défaut: 5)
 * @param showHeader - Afficher l'en-tête du tableau (défaut: true)
 */

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  /** Nombre de lignes de données */
  rows?: number;
  /** Nombre de colonnes */
  columns?: number;
  /** Afficher l'en-tête du tableau */
  showHeader?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* En-tête du tableau */}
      {showHeader && (
        <div
          className="grid gap-4 px-4 py-2 border-b"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-[80%]" />
          ))}
        </div>
      )}

      {/* Lignes du tableau */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="space-y-2">
              <Skeleton
                className={cn(
                  'h-5',
                  // Première colonne plus large (identifiant/titre)
                  colIndex === 0 && 'w-[140px]',
                  // Colonnes du milieu
                  colIndex > 0 && colIndex < columns - 1 && 'w-[100px]',
                  // Dernière colonne (actions) plus petite
                  colIndex === columns - 1 && 'w-[80px]'
                )}
              />
              {/* Sous-texte uniquement pour la première colonne */}
              {colIndex === 0 && <Skeleton className="h-3 w-[100px]" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
