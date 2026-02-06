/**
 * Composant Timeline d'Historique pour les Expéditions (Shipment)
 *
 * Affiche la chronologie complète des événements (ShipmentLog)
 * avec détails enrichis et métadonnées JSON.
 *
 * Design identique à PickupHistoryTimeline et QuoteHistoryTimeline
 * pour cohérence visuelle dans tout le dashboard.
 *
 * Workflow des expéditions :
 * DRAFT → PENDING_APPROVAL → APPROVED → PICKED_UP → IN_TRANSIT →
 * AT_CUSTOMS → CUSTOMS_CLEARED → OUT_FOR_DELIVERY → DELIVERED
 *
 * @example
 * ```tsx
 * // Utilisation basique
 * <ShipmentHistoryTimeline logs={shipmentLogs} />
 *
 * // Mode compact avec hauteur limitée
 * <ShipmentHistoryTimeline logs={shipmentLogs} compact className="max-h-96 overflow-y-auto" />
 * ```
 */

'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShipmentStatus } from '@/lib/db/enums';
import { ShipmentLogEventType } from '@/lib/db/shipment-log-events';
import {
  Clock,
  FileText,
  RefreshCw,
  DollarSign,
  Package,
  Truck,
  MapPin,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  User,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShipmentStatusBadge } from './shipment-status-badge';
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
 * Structure d'un log ShipmentLog avec relations chargées
 *
 * Correspond au modèle Prisma ShipmentLog avec les includes nécessaires
 * pour afficher les informations de l'utilisateur qui a effectué l'action.
 *
 * Note : Le type est flexible pour accepter directement le retour de Prisma
 * incluant JsonValue pour metadata et les champs user sélectionnés.
 */
export interface ShipmentLogWithRelations {
  id: string;
  shipmentId: string;
  eventType: string;
  oldStatus: ShipmentStatus | null;
  newStatus: ShipmentStatus | null;
  changedById: string | null;
  /** Utilisateur ayant effectué l'action (select: id, name, email, role) */
  changedBy: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
  notes: string | null;
  /** Métadonnées JSON flexibles (JsonValue de Prisma) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  createdAt: Date;
}

interface ShipmentHistoryTimelineProps {
  /** Liste des logs avec relations chargées */
  logs: ShipmentLogWithRelations[];
  /** Mode compact pour moins de détails */
  compact?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
}

// ============================================
// CONFIGURATION DES ÉVÉNEMENTS
// ============================================

/**
 * Configuration d'affichage par type d'événement ShipmentLog
 *
 * Chaque type a :
 * - icon : Icône Lucide à afficher
 * - label : Texte en français
 * - colorClass : Couleur de l'icône (text-*)
 * - bgColorClass : Couleur de fond du cercle (bg-*)
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
  // ══════════════════════════════════════════
  // CRÉATION ET STATUT
  // ══════════════════════════════════════════

  [ShipmentLogEventType.CREATED]: {
    icon: FileText,
    label: 'Expédition créée',
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-100',
  },
  [ShipmentLogEventType.STATUS_CHANGED]: {
    icon: RefreshCw,
    label: 'Statut modifié',
    colorClass: 'text-purple-600',
    bgColorClass: 'bg-purple-100',
  },

  // ══════════════════════════════════════════
  // PAIEMENT
  // ══════════════════════════════════════════

  [ShipmentLogEventType.PAYMENT_RECEIVED]: {
    icon: DollarSign,
    label: 'Paiement reçu',
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-100',
  },

  // ══════════════════════════════════════════
  // ENLÈVEMENT (PICKUP)
  // ══════════════════════════════════════════

  [ShipmentLogEventType.PICKUP_ASSIGNED]: {
    icon: Package,
    label: 'Enlèvement assigné',
    colorClass: 'text-indigo-600',
    bgColorClass: 'bg-indigo-100',
  },
  [ShipmentLogEventType.PICKUP_COMPLETED]: {
    icon: Package,
    label: 'Enlèvement effectué',
    colorClass: 'text-cyan-600',
    bgColorClass: 'bg-cyan-100',
  },

  // ══════════════════════════════════════════
  // TRACKING
  // ══════════════════════════════════════════

  [ShipmentLogEventType.TRACKING_EVENT_ADDED]: {
    icon: Navigation,
    label: 'Événement de suivi',
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-100',
  },

  // ══════════════════════════════════════════
  // DOCUMENTS
  // ══════════════════════════════════════════

  [ShipmentLogEventType.DOCUMENT_UPLOADED]: {
    icon: Upload,
    label: 'Document ajouté',
    colorClass: 'text-teal-600',
    bgColorClass: 'bg-teal-100',
  },

  // ══════════════════════════════════════════
  // LIVRAISON
  // ══════════════════════════════════════════

  [ShipmentLogEventType.DELIVERED]: {
    icon: CheckCircle,
    label: 'Livraison effectuée',
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-100',
  },
  [ShipmentLogEventType.DELIVERY_ATTEMPT_FAILED]: {
    icon: MapPin,
    label: 'Tentative échouée',
    colorClass: 'text-orange-600',
    bgColorClass: 'bg-orange-100',
  },

  // ══════════════════════════════════════════
  // ANNULATION ET PROBLÈMES
  // ══════════════════════════════════════════

  [ShipmentLogEventType.CANCELLED]: {
    icon: XCircle,
    label: 'Expédition annulée',
    colorClass: 'text-red-600',
    bgColorClass: 'bg-red-100',
  },
  [ShipmentLogEventType.PROBLEM_REPORTED]: {
    icon: AlertTriangle,
    label: 'Problème signalé',
    colorClass: 'text-red-600',
    bgColorClass: 'bg-red-100',
  },

  // ══════════════════════════════════════════
  // COMMENTAIRES ET SYSTÈME
  // ══════════════════════════════════════════

  [ShipmentLogEventType.COMMENT_ADDED]: {
    icon: MessageSquare,
    label: 'Commentaire ajouté',
    colorClass: 'text-gray-600',
    bgColorClass: 'bg-gray-100',
  },
  [ShipmentLogEventType.SYSTEM_NOTE]: {
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
 *
 * Affiche des informations contextuelles supplémentaires
 * spécifiques à chaque type d'événement ShipmentLog.
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
    // Création avec source et résumé colis (enrichi multi-colis)
    case ShipmentLogEventType.CREATED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.source && (
            <p>
              Source :{' '}
              <strong>
                {metadata.source === 'quote'
                  ? 'Devis'
                  : metadata.source === 'dashboard'
                    ? 'Dashboard'
                    : 'API'}
              </strong>
            </p>
          )}
          {metadata.quoteId && (
            <p>Devis : {metadata.quoteId as string}</p>
          )}
          {/* Nombre de colis transférés depuis le devis (enrichi multi-colis) */}
          {metadata.packageCount && (
            <p>
              {metadata.packageCount as number} colis transféré{(metadata.packageCount as number) > 1 ? 's' : ''} depuis le devis
            </p>
          )}
        </div>
      );

    // Paiement reçu
    case ShipmentLogEventType.PAYMENT_RECEIVED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.amount && (
            <p>
              Montant :{' '}
              <strong>
                {(metadata.amount as number).toFixed(2)}{' '}
                {(metadata.currency as string) || '€'}
              </strong>
            </p>
          )}
          {metadata.paymentMethod && (
            <p>Méthode : {metadata.paymentMethod as string}</p>
          )}
        </div>
      );

    // Enlèvement assigné
    case ShipmentLogEventType.PICKUP_ASSIGNED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.pickupRequestId && (
            <p>
              Demande : <strong>{metadata.pickupRequestId as string}</strong>
            </p>
          )}
          {metadata.pickupStatus && (
            <p>Statut : {metadata.pickupStatus as string}</p>
          )}
        </div>
      );

    // Enlèvement effectué
    case ShipmentLogEventType.PICKUP_COMPLETED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.pickupDate && (
            <p>
              Date :{' '}
              {format(new Date(metadata.pickupDate as string), 'dd/MM/yyyy HH:mm', {
                locale: fr,
              })}
            </p>
          )}
          {metadata.driverName && (
            <p>
              Chauffeur : <strong>{metadata.driverName as string}</strong>
            </p>
          )}
        </div>
      );

    // Événement de tracking
    case ShipmentLogEventType.TRACKING_EVENT_ADDED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.location && (
            <p>
              Localisation : <strong>{metadata.location as string}</strong>
            </p>
          )}
          {metadata.status && <p>Statut : {metadata.status as string}</p>}
        </div>
      );

    // Document uploadé
    case ShipmentLogEventType.DOCUMENT_UPLOADED:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Type : <strong>{metadata.documentType as string}</strong>
          </p>
          <p>Fichier : {metadata.fileName as string}</p>
        </div>
      );

    // Livraison effectuée
    case ShipmentLogEventType.DELIVERED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.deliveredAt && (
            <p>
              Livré le :{' '}
              {format(new Date(metadata.deliveredAt as string), 'dd/MM/yyyy HH:mm', {
                locale: fr,
              })}
            </p>
          )}
          {metadata.signedBy && (
            <p>
              Signataire : <strong>{metadata.signedBy as string}</strong>
            </p>
          )}
        </div>
      );

    // Tentative de livraison échouée
    case ShipmentLogEventType.DELIVERY_ATTEMPT_FAILED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.reason && (
            <p>
              Raison : <strong>{metadata.reason as string}</strong>
            </p>
          )}
          {metadata.nextAttemptDate && (
            <p>
              Prochaine tentative :{' '}
              {format(
                new Date(metadata.nextAttemptDate as string),
                'dd/MM/yyyy',
                { locale: fr }
              )}
            </p>
          )}
        </div>
      );

    // Annulation
    case ShipmentLogEventType.CANCELLED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.reason && (
            <p>
              Raison : <strong>{metadata.reason as string}</strong>
            </p>
          )}
          {metadata.refundAmount && (
            <p>Remboursement : {(metadata.refundAmount as number).toFixed(2)} €</p>
          )}
        </div>
      );

    // Problème signalé
    case ShipmentLogEventType.PROBLEM_REPORTED:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Type : <strong>{metadata.problemType as string}</strong>
          </p>
          <p>
            Gravité :{' '}
            <span
              className={cn(
                'font-medium',
                metadata.severity === 'HIGH' && 'text-red-600',
                metadata.severity === 'MEDIUM' && 'text-orange-600',
                metadata.severity === 'LOW' && 'text-yellow-600'
              )}
            >
              {metadata.severity as string}
            </span>
          </p>
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
 *
 * Affiche un événement avec son icône, label, détails et avatar
 * de l'utilisateur qui a effectué l'action.
 */
function TimelineItem({
  log,
  isLast,
  compact,
}: {
  log: ShipmentLogWithRelations;
  isLast: boolean;
  compact?: boolean;
}) {
  const config = EVENT_CONFIG[log.eventType] || DEFAULT_EVENT_CONFIG;
  const Icon = config.icon;

  return (
    <div className="relative pb-8">
      {/* Ligne verticale de connexion entre les événements */}
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

          {/* Badges de transition de statut (pour STATUS_CHANGED) */}
          {log.eventType === ShipmentLogEventType.STATUS_CHANGED &&
            log.oldStatus &&
            log.newStatus && (
              <div className="mt-2 flex items-center space-x-2">
                <ShipmentStatusBadge status={log.oldStatus} />
                <span className="text-gray-400">→</span>
                <ShipmentStatusBadge status={log.newStatus} />
              </div>
            )}

          {/* Notes (raison d'annulation, commentaires, etc.) */}
          {log.notes && !compact && (
            <p className="mt-2 text-sm text-gray-600 italic">
              &quot;{log.notes}&quot;
            </p>
          )}

          {/* Métadonnées enrichies selon le type d'événement */}
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
 * Affiche l'historique complet d'une expédition dans une card
 * avec titre, description et liste des événements.
 *
 * @param logs - Liste des logs ShipmentLog avec relations chargées
 * @param compact - Mode compact (moins de détails)
 * @param className - Classes CSS additionnelles
 *
 * @example
 * ```tsx
 * // Récupérer les logs
 * const logs = await getShipmentHistory(shipmentId);
 *
 * // Afficher la timeline
 * <ShipmentHistoryTimeline logs={logs} />
 *
 * // Mode compact avec scroll
 * <ShipmentHistoryTimeline
 *   logs={logs}
 *   compact
 *   className="max-h-96 overflow-y-auto"
 * />
 * ```
 */
export function ShipmentHistoryTimeline({
  logs,
  compact = false,
  className,
}: ShipmentHistoryTimelineProps) {
  // Trier par date décroissante (plus récent en premier)
  const sortedLogs = [...logs].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // État vide : aucun événement enregistré
  if (logs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p>Aucun événement enregistré pour cette expédition</p>
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
 *
 * @example
 * ```tsx
 * // Dans un onglet ou section
 * <ShipmentHistoryTimelineCompact
 *   logs={logs}
 *   className="max-h-64 overflow-y-auto"
 * />
 * ```
 */
export function ShipmentHistoryTimelineCompact({
  logs,
  className,
}: Omit<ShipmentHistoryTimelineProps, 'compact'>) {
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
