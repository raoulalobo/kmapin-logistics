/**
 * Skeleton de chargement pour la page Gestion des Pays
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CountriesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[180px]" />
          <Skeleton className="h-4 w-[320px]" />
        </div>
        <Skeleton className="h-10 w-[150px]" />
      </div>

      {/* 3 cartes statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[110px]" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px]" />
              <Skeleton className="mt-2 h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tableau des pays */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[160px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* En-têtes */}
            <div className="grid grid-cols-5 gap-4 px-4 py-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[90px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[70px]" />
            </div>

            {/* Lignes */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-8 rounded" /> {/* Drapeau */}
                  <Skeleton className="h-5 w-[120px]" />
                </div>
                <Skeleton className="h-5 w-[60px]" />
                <Skeleton className="h-5 w-[100px]" />
                <Skeleton className="h-6 w-[80px] rounded-full" />
                <Skeleton className="h-8 w-[80px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
