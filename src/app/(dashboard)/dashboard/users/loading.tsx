/**
 * Skeleton de chargement pour la page Gestion des Utilisateurs
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>

      {/* 4 cartes statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[50px]" />
              <Skeleton className="mt-2 h-3 w-[110px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tableau 5 colonnes */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[160px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-[140px]" />
                    <Skeleton className="h-3 w-[110px]" />
                  </div>
                </div>
                <Skeleton className="h-5 w-[180px]" />
                <Skeleton className="h-6 w-[100px] rounded-full" />
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
