/**
 * Composant Timeline d'Historique pour les Demandes d'Enlèvement
 *
 * Affiche la chronologie complète des événements (PickupLog)
 * avec détails enrichis et métadonnées JSON
 *
 * User Stories US-3.1 et US-3.2 : Visualisation de l'historique
 */

'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PickupStatus } from '@/lib/db/enums';
import { PickupLogEventType } from '@/lib/db/pickup-log-events';
import {
  Clock,
  FileText,
  Link as LinkIcon,
  Truck,
  Calendar,
  XCircle,
  CheckCircle,
  User,
  AlertCircle,
  RefreshCw,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PickupStatusBadge } from './pickup-status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ============================================
// TYPES
// ============================================

/**
 * Structure d'un log avec relations chargées
 */
interface PickupLogWithRelations {
  id: string;
  pickupId: string;
  eventType: string;
  oldStatus: PickupStatus | null;
  newStatus: PickupStatus | null;
  changedById: string | null;
  changedBy: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

interface PickupHistoryTimelineProps {
  logs: PickupLogWithRelations[];
  compact?: boolean; // Mode compact pour moins de détails
  className?: string;
}

// ============================================
// CONFIGURATION DES ÉVÉNEMENTS
// ============================================

/**
 * Configuration d'affichage par type d'événement
 */
const EVENT_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    label: string;
    colorClass: string;
    bgColorClass: string;
  }
> = {
  [PickupLogEventType.CREATED]: {
    icon: FileText,
    label: 'Demande créée',
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-100',
  },
  [PickupLogEventType.STATUS_CHANGED]: {
    icon: RefreshCw,
    label: 'Statut modifié',
    colorClass: 'text-purple-600',
    bgColorClass: 'bg-purple-100',
  },
  [PickupLogEventType.ATTACHED_TO_ACCOUNT]: {
    icon: LinkIcon,
    label: 'Rattaché au compte',
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-100',
  },
  [PickupLogEventType.DRIVER_ASSIGNED]: {
    icon: UserPlus,
    label: 'Chauffeur assigné',
    colorClass: 'text-indigo-600',
    bgColorClass: 'bg-indigo-100',
  },
  [PickupLogEventType.DRIVER_CHANGED]: {
    icon: UserMinus,
    label: 'Chauffeur changé',
    colorClass: 'text-orange-600',
    bgColorClass: 'bg-orange-100',
  },
  [PickupLogEventType.SCHEDULED]: {
    icon: Calendar,
    label: 'Planifié',
    colorClass: 'text-cyan-600',
    bgColorClass: 'bg-cyan-100',
  },
  [PickupLogEventType.RESCHEDULED]: {
    icon: Calendar,
    label: 'Replanifié',
    colorClass: 'text-amber-600',
    bgColorClass: 'bg-amber-100',
  },
  [PickupLogEventType.DOCUMENT_UPLOADED]: {
    icon: FileText,
    label: 'Document ajouté',
    colorClass: 'text-teal-600',
    bgColorClass: 'bg-teal-100',
  },
  [PickupLogEventType.TOKEN_REFRESHED]: {
    icon: RefreshCw,
    label: 'Token renouvelé',
    colorClass: 'text-gray-600',
    bgColorClass: 'bg-gray-100',
  },
  [PickupLogEventType.SYSTEM_NOTE]: {
    icon: AlertCircle,
    label: 'Note système',
    colorClass: 'text-yellow-600',
    bgColorClass: 'bg-yellow-100',
  },
};

// Icône par défaut
const DEFAULT_EVENT_CONFIG = {
  icon: Clock,
  label: 'Événement',
  colorClass: 'text-gray-600',
  bgColorClass: 'bg-gray-100',
};

// ============================================
// HELPERS
// ============================================

/**
 * Formatte une date de manière lisible
 */
function formatDate(date: Date): string {
  return format(date, 'dd MMMM yyyy à HH:mm', { locale: fr });
}

/**
 * Formatte une date relative (il y a X jours)
 */
function formatRelativeDate(date: Date): string {
  return formatDistanceToNow(date, { locale: fr, addSuffix: true });
}

/**
 * Extrait les initiales d'un nom
 */
function getInitials(name: string | null): string {
  if (!name) return 'SY'; // Système

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Rend les détails du metadata selon le type d'événement
 */
function renderMetadata(
  eventType: string,
  metadata: Record<string, unknown> | null
): React.ReactNode | null {
  if (!metadata) return null;

  switch (eventType) {
    case PickupLogEventType.ATTACHED_TO_ACCOUNT:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Correspondance par : <strong>{metadata.matchedBy as string}</strong>
          </p>
          <p>Email : {metadata.email as string}</p>
        </div>
      );

    case PickupLogEventType.DRIVER_ASSIGNED:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Chauffeur : <strong>{metadata.driverName as string}</strong>
          </p>
          {metadata.driverPhone && <p>Tél : {metadata.driverPhone as string}</p>}
        </div>
      );

    case PickupLogEventType.DRIVER_CHANGED:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Ancien chauffeur : <strong>{metadata.oldDriverName as string}</strong>
          </p>
          <p>
            Nouveau chauffeur : <strong>{metadata.newDriverName as string}</strong>
          </p>
        </div>
      );

    case PickupLogEventType.SCHEDULED:
    case PickupLogEventType.RESCHEDULED:
      const scheduledDate = metadata.scheduledDate as string;
      const oldScheduledDate = metadata.oldScheduledDate as string;
      return (
        <div className="text-sm text-muted-foreground">
          {oldScheduledDate && (
            <p>
              Ancienne date :{' '}
              {format(new Date(oldScheduledDate), 'dd/MM/yyyy', { locale: fr })}
            </p>
          )}
          <p>
            {oldScheduledDate ? 'Nouvelle date' : 'Date'} :{' '}
            <strong>
              {format(new Date(scheduledDate), 'dd/MM/yyyy', { locale: fr })}
            </strong>
          </p>
          <p>Créneau : {metadata.timeSlot as string}</p>
        </div>
      );

    case PickupLogEventType.DOCUMENT_UPLOADED:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Type : <strong>{metadata.documentType as string}</strong>
          </p>
          <p>Fichier : {metadata.fileName as string}</p>
        </div>
      );

    case PickupLogEventType.TOKEN_REFRESHED:
      const newExpiresAt = metadata.newExpiresAt as string;
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Nouvelle expiration :{' '}
            {format(new Date(newExpiresAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </p>
          {metadata.reason && <p>Raison : {metadata.reason as string}</p>}
        </div>
      );

    default:
      return null;
  }
}

// ============================================
// COMPOSANTS
// ============================================

/**
 * Item individuel de la timeline
 */
function TimelineItem({
  log,
  isLast,
  compact,
}: {
  log: PickupLogWithRelations;
  isLast: boolean;
  compact?: boolean;
}) {
  const config = EVENT_CONFIG[log.eventType] || DEFAULT_EVENT_CONFIG;
  const Icon = config.icon;

  return (
    <div className="relative pb-8">
      {/* Ligne verticale */}
      {!isLast && (
        <span
          className="absolute left-5 top-10 -ml-px h-full w-0.5 bg-gray-200"
          aria-hidden="true"
        />
      )}

      <div className="relative flex items-start space-x-3">
        {/* Icône de l'événement */}
        <div className="relative">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white',
              config.bgColorClass
            )}
          >
            <Icon className={cn('h-5 w-5', config.colorClass)} />
          </div>
        </div>

        {/* Contenu de l'événement */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeDate(log.createdAt)}
              </p>
            </div>

            {/* Avatar de l'utilisateur */}
            {log.changedBy && (
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(log.changedBy.name)}
                  </AvatarFallback>
                </Avatar>
                {!compact && (
                  <span className="text-xs text-muted-foreground">
                    {log.changedBy.name || log.changedBy.email}
                  </span>
                )}
              </div>
            )}

            {/* Système (pas d'utilisateur) */}
            {!log.changedBy && (
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-3 w-3 text-gray-500" />
                </div>
                {!compact && (
                  <span className="text-xs text-muted-foreground">Système</span>
                )}
              </div>
            )}
          </div>

          {/* Détails du changement de statut */}
          {log.eventType === PickupLogEventType.STATUS_CHANGED &&
            log.oldStatus &&
            log.newStatus && (
              <div className="mt-2 flex items-center space-x-2">
                <PickupStatusBadge status={log.oldStatus} />
                <span className="text-gray-400">→</span>
                <PickupStatusBadge status={log.newStatus} />
              </div>
            )}

          {/* Notes */}
          {log.notes && !compact && (
            <p className="mt-2 text-sm text-gray-600 italic">&quot;{log.notes}&quot;</p>
          )}

          {/* Métadonnées enrichies */}
          {!compact && log.metadata && (
            <div className="mt-2">{renderMetadata(log.eventType, log.metadata)}</div>
          )}

          {/* Date complète en mode non compact */}
          {!compact && (
            <p className="mt-1 text-xs text-gray-400">{formatDate(log.createdAt)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Timeline complète
 *
 * @param logs - Liste des logs avec relations chargées
 * @param compact - Mode compact (moins de détails)
 * @param className - Classes CSS additionnelles
 *
 * @example
 * ```tsx
 * <PickupHistoryTimeline logs={pickupHistory} />
 * <PickupHistoryTimeline logs={pickupHistory} compact className="max-h-96 overflow-y-auto" />
 * ```
 */
export function PickupHistoryTimeline({
  logs,
  compact = false,
  className,
}: PickupHistoryTimelineProps) {
  // Trier par date décroissante (plus récent en premier)
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (logs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p>Aucun événement enregistré pour cette demande</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Historique</span>
        </CardTitle>
        <CardDescription>
          {logs.length} événement{logs.length > 1 ? 's' : ''} enregistré
          {logs.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flow-root">
          <ul className="-mb-8">
            {sortedLogs.map((log, index) => (
              <li key={log.id}>
                <TimelineItem
                  log={log}
                  isLast={index === sortedLogs.length - 1}
                  compact={compact}
                />
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Timeline compacte (sans card wrapper, pour intégration)
 */
export function PickupHistoryTimelineCompact({
  logs,
  className,
}: Omit<PickupHistoryTimelineProps, 'compact'>) {
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (logs.length === 0) {
    return (
      <div className={cn('text-center text-muted-foreground py-4', className)}>
        <p className="text-sm">Aucun événement</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flow-root">
        <ul className="-mb-8">
          {sortedLogs.map((log, index) => (
            <li key={log.id}>
              <TimelineItem
                log={log}
                isLast={index === sortedLogs.length - 1}
                compact={true}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
