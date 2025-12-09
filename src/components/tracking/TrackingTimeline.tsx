/**
 * Composant TrackingTimeline
 *
 * Affiche une timeline verticale des événements de tracking d'une expédition.
 * Composant client pour l'interactivité (hover, animations).
 *
 * Features:
 * - Timeline verticale avec icônes de statut
 * - Affichage de la localisation et date/heure
 * - Support des coordonnées GPS (latitude/longitude)
 * - Description optionnelle pour chaque événement
 * - Design responsive avec Tailwind CSS
 */

'use client';

import { MapPin, Clock, CheckCircle2, Package, Plane, Ship, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrackingEventData } from '@/modules/tracking';

interface TrackingTimelineProps {
  events: TrackingEventData[];
  className?: string;
}

/**
 * Obtenir l'icône appropriée selon le statut de l'événement
 */
function getStatusIcon(status: string) {
  switch (status) {
    case 'DELIVERED':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'IN_TRANSIT':
      return <Truck className="h-4 w-4 text-blue-600" />;
    case 'AT_CUSTOMS':
    case 'CUSTOMS_CLEARED':
      return <Package className="h-4 w-4 text-purple-600" />;
    case 'PICKED_UP':
      return <Package className="h-4 w-4 text-orange-600" />;
    case 'OUT_FOR_DELIVERY':
      return <Truck className="h-4 w-4 text-indigo-600" />;
    default:
      return <MapPin className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * Obtenir la couleur du point de la timeline selon le statut
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'DELIVERED':
      return 'bg-green-500';
    case 'IN_TRANSIT':
      return 'bg-blue-500';
    case 'AT_CUSTOMS':
    case 'CUSTOMS_CLEARED':
      return 'bg-purple-500';
    case 'PICKED_UP':
      return 'bg-orange-500';
    case 'OUT_FOR_DELIVERY':
      return 'bg-indigo-500';
    default:
      return 'bg-muted-foreground';
  }
}

/**
 * Formater le statut en français
 */
function formatStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    DRAFT: 'Brouillon',
    PENDING_APPROVAL: 'En attente d\'approbation',
    APPROVED: 'Approuvé',
    PICKED_UP: 'Collecté',
    IN_TRANSIT: 'En transit',
    AT_CUSTOMS: 'En douane',
    CUSTOMS_CLEARED: 'Dédouané',
    OUT_FOR_DELIVERY: 'En cours de livraison',
    DELIVERED: 'Livré',
    CANCELLED: 'Annulé',
    ON_HOLD: 'En attente',
    EXCEPTION: 'Exception',
  };
  return statusLabels[status] || status;
}

export function TrackingTimeline({ events, className }: TrackingTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Aucun événement de tracking disponible
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative space-y-4', className)}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="flex gap-4 group">
            {/* Timeline visuelle */}
            <div className="relative flex flex-col items-center">
              {/* Point de la timeline */}
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-background z-10',
                  getStatusColor(event.status)
                )}
              >
                {getStatusIcon(event.status)}
              </div>

              {/* Ligne verticale (sauf pour le dernier élément) */}
              {!isLast && (
                <div className="absolute top-8 bottom-0 w-0.5 bg-border translate-y-0" />
              )}
            </div>

            {/* Contenu de l'événement */}
            <div className="flex-1 pb-6">
              {/* Statut et localisation */}
              <div className="mb-1">
                <h4 className="font-semibold text-sm">
                  {formatStatus(event.status)}
                </h4>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{event.location}</span>
                  {/* Afficher les coordonnées GPS si disponibles */}
                  {event.latitude && event.longitude && (
                    <span className="text-xs ml-2">
                      ({event.latitude.toFixed(4)}, {event.longitude.toFixed(4)})
                    </span>
                  )}
                </div>
              </div>

              {/* Description optionnelle */}
              {event.description && (
                <p className="text-sm text-foreground/80 mt-2">
                  {event.description}
                </p>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Clock className="h-3 w-3" />
                <time dateTime={new Date(event.timestamp).toISOString()}>
                  {new Date(event.timestamp).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  à{' '}
                  {new Date(event.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>

              {/* Métadonnées supplémentaires si disponibles */}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Voir les détails
                  </summary>
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
