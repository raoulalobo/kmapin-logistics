/**
 * Skeleton de chargement pour le Dashboard principal
 *
 * Affiche pendant le chargement de la page d'accueil du dashboard
 * avec statistiques, graphiques et activités récentes
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[300px]" /> {/* Titre "Tableau de bord" */}
        <Skeleton className="h-4 w-[400px]" /> {/* Sous-titre */}
      </div>

      {/* 4 cartes KPI principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="mt-2 h-3 w-[150px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grille : 2 graphiques côte-à-côte */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Graphique Revenus */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[180px]" />
            <Skeleton className="h-4 w-[250px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        {/* Graphique Expéditions */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[280px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Liste des activités récentes */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                {/* Icône / Avatar */}
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                {/* Contenu */}
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-[60%]" />
                </div>
                {/* Date */}
                <Skeleton className="h-3 w-[100px] flex-shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
