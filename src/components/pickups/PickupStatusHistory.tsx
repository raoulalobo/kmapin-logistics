/**
 * Composant : Historique des Changements de Statut
 *
 * Affiche la timeline complète des changements de statut d'une demande
 * d'enlèvement avec :
 * - Ancien statut → Nouveau statut
 * - Date/heure du changement
 * - Nom de l'agent qui a effectué le changement
 * - Notes explicatives (si disponibles)
 *
 * Design : Timeline verticale avec badges colorés selon les codes couleur
 * standardisés (Bleu/Orange/Vert/Rouge).
 *
 * @module components/pickups/PickupStatusHistory
 */

'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, ArrowRight, User } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getPickupStatusConfig } from '@/lib/utils/pickup-status';
import type { PickupStatusHistoryItem } from '@/modules/pickups';

interface PickupStatusHistoryProps {
  /**
   * Liste des entrées d'historique triées chronologiquement
   * (du plus ancien au plus récent)
   */
  history: PickupStatusHistoryItem[];

  /**
   * Afficher un message si l'historique est vide
   * @default true
   */
  showEmptyState?: boolean;
}

/**
 * Composant PickupStatusHistory
 *
 * Affiche une timeline verticale des changements de statut avec :
 * - Point coloré selon le nouveau statut
 * - Transition "Ancien → Nouveau" avec icônes
 * - Timestamp formaté en français
 * - Nom et email de l'agent
 * - Notes explicatives en dessous si disponibles
 *
 * @example
 * ```tsx
 * const history = await getPickupStatusHistory(pickupId);
 * <PickupStatusHistory history={history.data || []} />
 * ```
 */
export function PickupStatusHistory({
  history,
  showEmptyState = true,
}: PickupStatusHistoryProps) {
  // État vide
  if (history.length === 0 && showEmptyState) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Historique des Statuts
          </CardTitle>
          <CardDescription>
            Timeline complète des changements de statut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Aucun historique pour le moment. Les changements de statut apparaîtront ici.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Historique des Statuts
        </CardTitle>
        <CardDescription>
          {history.length} changement{history.length > 1 ? 's' : ''} enregistré{history.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {history.map((entry, index) => {
            const isFirst = index === 0;
            const isLast = index === history.length - 1;

            // Configurations des statuts
            const oldStatusConfig = entry.oldStatus
              ? getPickupStatusConfig(entry.oldStatus)
              : null;
            const newStatusConfig = getPickupStatusConfig(entry.newStatus);
            const NewStatusIcon = newStatusConfig.icon;

            return (
              <div key={entry.id} className="relative">
                {/* Ligne verticale de connexion */}
                {!isLast && (
                  <div
                    className="absolute left-[15px] top-[40px] h-[calc(100%+24px)] w-[2px] bg-gray-200"
                    aria-hidden="true"
                  />
                )}

                <div className="flex gap-4">
                  {/* Point et icône du statut */}
                  <div className="relative flex flex-col items-center">
                    {/* Point coloré selon le nouveau statut */}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${newStatusConfig.bgColor} ring-4 ring-white`}
                    >
                      <NewStatusIcon className={`h-4 w-4 ${newStatusConfig.textColor}`} weight="fill" />
                    </div>
                  </div>

                  {/* Contenu de l'entrée */}
                  <div className="flex-1 pb-6">
                    {/* Transition de statut */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {entry.oldStatus ? (
                        <>
                          {/* Ancien statut */}
                          <Badge className={oldStatusConfig!.color}>
                            {oldStatusConfig!.label}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-gray-400" weight="bold" />
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 font-medium">Création</span>
                      )}

                      {/* Nouveau statut */}
                      <Badge className={newStatusConfig.color}>
                        {newStatusConfig.label}
                      </Badge>
                    </div>

                    {/* Timestamp */}
                    <div className="text-sm text-gray-600 mb-2">
                      {format(new Date(entry.changedAt), 'PPP à HH:mm', { locale: fr })}
                    </div>

                    {/* Agent */}
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {entry.changedBy.name || 'Utilisateur inconnu'}
                      </span>
                      <span className="text-gray-500">
                        ({entry.changedBy.email})
                      </span>
                    </div>

                    {/* Notes explicatives */}
                    {entry.notes && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3 border border-gray-200">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {entry.notes}
                        </p>
                      </div>
                    )}

                    {/* Séparateur visuel entre les entrées (sauf dernière) */}
                    {!isLast && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
