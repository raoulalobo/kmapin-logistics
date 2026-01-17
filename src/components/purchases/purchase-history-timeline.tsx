/**
 * Composant Timeline d'Historique pour les Demandes d'Achat Délégué
 *
 * Affiche la chronologie complète des événements (PurchaseLog)
 * avec détails enrichis et métadonnées JSON.
 *
 * Design identique à PickupHistoryTimeline pour cohérence visuelle.
 *
 * User Stories US-3.1 et US-3.2 : Visualisation de l'historique
 *
 * @example
 * ```tsx
 * <PurchaseHistoryTimeline logs={purchaseLogs} />
 * <PurchaseHistoryTimeline logs={purchaseLogs} compact className="max-h-96" />
 * ```
 */

'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PurchaseStatus } from '@/lib/db/enums';
import { PurchaseLogEventType } from '@/lib/db/purchase-log-events';
import {
  Clock,
  FileText,
  Link as LinkIcon,
  ShoppingCart,
  PackageCheck,
  XCircle,
  User,
  AlertCircle,
  RefreshCw,
  DollarSign,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PurchaseStatusBadge } from './purchase-status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
interface PurchaseLogWithRelations {
  id: string;
  purchaseId: string;
  eventType: string;
  oldStatus: PurchaseStatus | null;
  newStatus: PurchaseStatus | null;
  changedById: string | null;
  changedBy: {
    id?: string;
    name: string | null;
    email?: string;
    role: string;
  } | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

interface PurchaseHistoryTimelineProps {
  /** Liste des logs avec relations chargées */
  logs: PurchaseLogWithRelations[];
  /** Mode compact pour moins de détails */
  compact?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
}

// ============================================
// CONFIGURATION DES ÉVÉNEMENTS
// ============================================

/**
 * Configuration d'affichage par type d'événement
 * Chaque type a une icône, un label et des couleurs spécifiques
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
  [PurchaseLogEventType.CREATED]: {
    icon: ShoppingCart,
    label: 'Demande créée',
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-100',
  },
  [PurchaseLogEventType.STATUS_CHANGED]: {
    icon: RefreshCw,
    label: 'Statut modifié',
    colorClass: 'text-purple-600',
    bgColorClass: 'bg-purple-100',
  },
  [PurchaseLogEventType.ATTACHED_TO_ACCOUNT]: {
    icon: LinkIcon,
    label: 'Rattaché au compte',
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-100',
  },
  [PurchaseLogEventType.COSTS_UPDATED]: {
    icon: DollarSign,
    label: 'Coûts mis à jour',
    colorClass: 'text-emerald-600',
    bgColorClass: 'bg-emerald-100',
  },
  [PurchaseLogEventType.DOCUMENT_UPLOADED]: {
    icon: FileText,
    label: 'Document ajouté',
    colorClass: 'text-teal-600',
    bgColorClass: 'bg-teal-100',
  },
  [PurchaseLogEventType.TOKEN_REFRESHED]: {
    icon: RefreshCw,
    label: 'Token renouvelé',
    colorClass: 'text-gray-600',
    bgColorClass: 'bg-gray-100',
  },
  [PurchaseLogEventType.SYSTEM_NOTE]: {
    icon: AlertCircle,
    label: 'Note système',
    colorClass: 'text-yellow-600',
    bgColorClass: 'bg-yellow-100',
  },
};

// Configuration par défaut pour les événements non reconnus
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
 * Formatte une date de manière lisible en français
 *
 * @param date - Date à formater
 * @returns Chaîne formatée (ex: "15 janvier 2026 à 14:30")
 */
function formatDate(date: Date): string {
  return format(new Date(date), 'dd MMMM yyyy à HH:mm', { locale: fr });
}

/**
 * Formatte une date relative en français
 *
 * @param date - Date à formater
 * @returns Chaîne relative (ex: "il y a 2 heures")
 */
function formatRelativeDate(date: Date): string {
  return formatDistanceToNow(new Date(date), { locale: fr, addSuffix: true });
}

/**
 * Extrait les initiales d'un nom pour l'avatar
 *
 * @param name - Nom complet ou null
 * @returns Initiales (2 caractères max) ou "SY" pour système
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
 * Affiche des informations contextuelles supplémentaires
 *
 * @param eventType - Type d'événement
 * @param metadata - Données JSON associées
 * @returns Élément React ou null
 */
function renderMetadata(
  eventType: string,
  metadata: Record<string, unknown> | null
): React.ReactNode | null {
  if (!metadata) return null;

  switch (eventType) {
    case PurchaseLogEventType.ATTACHED_TO_ACCOUNT:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Correspondance par : <strong>{metadata.matchedBy as string}</strong>
          </p>
          <p>Email : {metadata.email as string}</p>
        </div>
      );

    case PurchaseLogEventType.COSTS_UPDATED:
      return (
        <div className="text-sm text-muted-foreground space-y-1">
          {metadata.actualProductCost && (
            <p>
              Coût produit :{' '}
              <strong>{(metadata.actualProductCost as number).toFixed(2)} €</strong>
            </p>
          )}
          {metadata.deliveryCost && (
            <p>
              Frais de livraison :{' '}
              <strong>{(metadata.deliveryCost as number).toFixed(2)} €</strong>
            </p>
          )}
          {metadata.serviceFee && (
            <p>
              Frais de service :{' '}
              <strong>{(metadata.serviceFee as number).toFixed(2)} €</strong>
            </p>
          )}
          {metadata.totalCost && (
            <p className="font-semibold">
              Total : <strong>{(metadata.totalCost as number).toFixed(2)} €</strong>
            </p>
          )}
        </div>
      );

    case PurchaseLogEventType.DOCUMENT_UPLOADED:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Type : <strong>{metadata.documentType as string}</strong>
          </p>
          <p>Fichier : {metadata.fileName as string}</p>
        </div>
      );

    case PurchaseLogEventType.TOKEN_REFRESHED:
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
 * Affiche un événement avec son icône, label, détails et avatar
 */
function TimelineItem({
  log,
  isLast,
  compact,
}: {
  log: PurchaseLogWithRelations;
  isLast: boolean;
  compact?: boolean;
}) {
  const config = EVENT_CONFIG[log.eventType] || DEFAULT_EVENT_CONFIG;
  const Icon = config.icon;

  return (
    <div className="relative pb-8">
      {/* Ligne verticale de connexion */}
      {!isLast && (
        <span
          className="absolute left-5 top-10 -ml-px h-full w-0.5 bg-gray-200"
          aria-hidden="true"
        />
      )}

      <div className="relative flex items-start space-x-3">
        {/* Icône de l'événement (cercle coloré) */}
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

            {/* Avatar de l'utilisateur qui a effectué l'action */}
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

            {/* Indicateur Système (pas d'utilisateur) */}
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

          {/* Badges de transition de statut */}
          {log.eventType === PurchaseLogEventType.STATUS_CHANGED &&
            log.oldStatus &&
            log.newStatus && (
              <div className="mt-2 flex items-center space-x-2">
                <PurchaseStatusBadge status={log.oldStatus} />
                <span className="text-gray-400">→</span>
                <PurchaseStatusBadge status={log.newStatus} />
              </div>
            )}

          {/* Notes (raison d'annulation, commentaires, etc.) */}
          {log.notes && !compact && (
            <p className="mt-2 text-sm text-gray-600 italic">
              &quot;{log.notes}&quot;
            </p>
          )}

          {/* Métadonnées enrichies (coûts, documents, etc.) */}
          {!compact && log.metadata && (
            <div className="mt-2">
              {renderMetadata(log.eventType, log.metadata)}
            </div>
          )}

          {/* Date complète en mode non compact */}
          {!compact && (
            <p className="mt-1 text-xs text-gray-400">
              {formatDate(log.createdAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Timeline complète avec Card wrapper
 *
 * Affiche l'historique complet d'une demande d'achat délégué
 * dans une card avec titre et description.
 *
 * @param logs - Liste des logs avec relations chargées
 * @param compact - Mode compact (moins de détails)
 * @param className - Classes CSS additionnelles
 */
export function PurchaseHistoryTimeline({
  logs,
  compact = false,
  className,
}: PurchaseHistoryTimelineProps) {
  // Trier par date décroissante (plus récent en premier)
  const sortedLogs = [...logs].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // État vide
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
 * Timeline compacte (sans card wrapper)
 *
 * Version sans wrapper Card pour intégration dans d'autres composants.
 * Affiche toujours en mode compact.
 */
export function PurchaseHistoryTimelineCompact({
  logs,
  className,
}: Omit<PurchaseHistoryTimelineProps, 'compact'>) {
  const sortedLogs = [...logs].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
