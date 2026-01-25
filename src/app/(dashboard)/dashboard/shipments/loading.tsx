/**
 * Skeleton de chargement pour la page Liste des Expéditions
 *
 * Affiché automatiquement par Next.js pendant le chargement de page.tsx
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ShipmentsLoading() {
  return (
    <div className="space-y-6">
      {/* En-tête avec titre et bouton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" /> {/* Titre */}
          <Skeleton className="h-4 w-[350px]" /> {/* Description */}
        </div>
        <Skeleton className="h-10 w-[180px]" /> {/* Bouton "Nouvelle expédition" */}
      </div>

      {/* Statistiques rapides (4 cartes) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px]" />
              <Skeleton className="mt-2 h-3 w-[140px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-9 w-[120px] rounded-full" />
        ))}
      </div>

      {/* Liste des expéditions (tableau avec 6 colonnes) */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* En-têtes du tableau */}
            <div className="grid grid-cols-6 gap-4 px-4 py-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[140px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[90px]" />
              <Skeleton className="h-4 w-[70px]" />
            </div>

            {/* Lignes du tableau (5 expéditions simulées) */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-4 rounded-lg border p-4"
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-[140px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
                <Skeleton className="h-5 w-[120px]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[130px]" />
                  <Skeleton className="h-3 w-[110px]" />
                </div>
                <Skeleton className="h-6 w-[80px] rounded-full" />
                <Skeleton className="h-5 w-[100px]" />
                <Skeleton className="h-8 w-[80px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-[180px]" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[90px]" />
          <Skeleton className="h-9 w-[90px]" />
        </div>
      </div>
    </div>
  );
}
