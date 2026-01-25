/**
 * Skeleton de chargement pour la page Paramètres
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>

      {/* Navigation onglets */}
      <div className="flex gap-4 border-b">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-[140px]" />
        ))}
      </div>

      {/* Section Profil */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-[160px]" />
              <Skeleton className="h-4 w-[220px]" />
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section Sécurité */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[160px]" />
          <Skeleton className="h-4 w-[280px]" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-[140px]" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-[200px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section Notifications */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-[180px]" />
                <Skeleton className="h-3 w-[250px]" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      <div className="flex items-center justify-end gap-4">
        <Skeleton className="h-10 w-[100px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
    </div>
  );
}
