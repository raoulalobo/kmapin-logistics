/**
 * Skeleton réutilisable pour les grilles de cartes (statistiques, KPI)
 *
 * Utilisé pour :
 * - Statistiques dashboard (revenus, expéditions, etc.)
 * - Cartes de résumé sur les pages de liste
 * - KPI par statut
 *
 * @param count - Nombre de cartes (défaut: 4)
 * @param columns - Colonnes en mode desktop (défaut: 4)
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CardGridSkeletonProps {
  /** Nombre de cartes à afficher */
  count?: number;
  /** Nombre de colonnes en mode desktop (lg:) */
  columns?: 2 | 3 | 4;
  /** Classes CSS additionnelles */
  className?: string;
}

export function CardGridSkeleton({
  count = 4,
  columns = 4,
  className,
}: CardGridSkeletonProps) {
  const gridCols = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  };

  return (
    <div
      className={cn(
        'grid gap-4 md:grid-cols-2',
        gridCols[columns],
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            {/* Titre de la carte */}
            <Skeleton className="h-4 w-[120px]" />
            {/* Icône */}
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            {/* Valeur principale (grand nombre ou montant) */}
            <Skeleton className="h-8 w-[80px]" />
            {/* Description / Variation */}
            <Skeleton className="mt-2 h-3 w-[140px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
