/**
 * Skeleton réutilisable pour les formulaires
 *
 * Utilisé pour les pages de création/édition :
 * - Nouveau devis, nouvelle expédition
 * - Édition de client, utilisateur
 * - Formulaires de configuration
 *
 * @param fields - Nombre de champs (défaut: 6)
 * @param showActions - Afficher les boutons d'action (défaut: true)
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FormSkeletonProps {
  /** Nombre de champs de formulaire */
  fields?: number;
  /** Afficher les boutons d'action en bas */
  showActions?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
}

export function FormSkeleton({
  fields = 6,
  showActions = true,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* En-tête du formulaire */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" /> {/* Titre */}
        <Skeleton className="h-4 w-[350px]" /> {/* Description */}
      </div>

      {/* Carte principale du formulaire */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[280px]" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Champs du formulaire */}
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              {/* Label */}
              <Skeleton className="h-4 w-[120px]" />
              {/* Input / Select / Textarea */}
              <Skeleton
                className={cn(
                  // Champs texte normaux
                  i % 4 !== 3 && 'h-10 w-full',
                  // Un champ sur 4 est un textarea (plus haut)
                  i % 4 === 3 && 'h-24 w-full'
                )}
              />
              {/* Message d'aide (1 champ sur 3) */}
              {i % 3 === 0 && <Skeleton className="h-3 w-[200px]" />}
            </div>
          ))}

          {/* Section additionnelle optionnelle (simuler des groupes) */}
          {fields > 4 && (
            <>
              <Separator className="my-6" />
              <Skeleton className="h-5 w-[160px]" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      {showActions && (
        <div className="flex items-center justify-end gap-4">
          <Skeleton className="h-10 w-[100px]" /> {/* Annuler */}
          <Skeleton className="h-10 w-[140px]" /> {/* Enregistrer */}
        </div>
      )}
    </div>
  );
}
