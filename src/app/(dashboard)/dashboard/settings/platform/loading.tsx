/**
 * Skeleton de chargement pour la page Configuration Plateforme
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function PlatformConfigLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[280px]" />
        <Skeleton className="h-4 w-[400px]" />
      </div>

      {/* Section Identité */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[320px]" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-[200px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section Branding */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[140px]" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-[160px]" />
                <Skeleton className="h-3 w-[220px]" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-[110px]" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section Contact */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[220px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent className="space-y-6">
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

      {/* Boutons d'action */}
      <div className="flex items-center justify-end gap-4">
        <Skeleton className="h-10 w-[100px]" />
        <Skeleton className="h-10 w-[200px]" />
      </div>
    </div>
  );
}
