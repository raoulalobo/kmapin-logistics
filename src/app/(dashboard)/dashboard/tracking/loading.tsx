/**
 * Skeleton de chargement pour la page Tracking
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function TrackingLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[280px]" />
        <Skeleton className="h-4 w-[400px]" />
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-12 w-[140px] self-end" />
          </div>
        </CardContent>
      </Card>

      {/* Résultats de tracking */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-[180px]" />
                <Skeleton className="h-6 w-[100px] rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Infos expédition */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-5 w-[140px]" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-5 w-[130px]" />
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3 mt-6">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[180px]" />
                      <Skeleton className="h-3 w-[120px]" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
