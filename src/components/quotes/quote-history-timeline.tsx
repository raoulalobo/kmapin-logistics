/**
 * Composant Timeline d'Historique pour les Devis (Quote)
 *
 * Affiche la chronologie complète des événements (QuoteLog)
 * avec détails enrichis et métadonnées JSON.
 *
 * Design identique à PickupHistoryTimeline et PurchaseHistoryTimeline
 * pour cohérence visuelle dans tout le dashboard.
 *
 * Workflow des devis :
 * DRAFT → SENT → ACCEPTED → IN_TREATMENT → VALIDATED
 *
 * @example
 * ```tsx
 * <QuoteHistoryTimeline logs={quoteLogs} />
 * <QuoteHistoryTimeline logs={quoteLogs} compact className="max-h-96" />
 * ```
 */

'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QuoteStatus } from '@/lib/db/enums';
import { QuoteLogEventType } from '@/lib/db/quote-log-events';
import {
  Clock,
  FileText,
  Link as LinkIcon,
  Send,
  CheckCircle,
  XCircle,
  User,
  AlertCircle,
  RefreshCw,
  CreditCard,
  FileCheck,
  Hourglass,
  Ban,
  MessageSquare,
  Upload,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuoteStatusBadge } from './quote-status-badge';
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
 * Structure d'un log QuoteLog avec relations chargées
 *
 * Correspond au modèle Prisma QuoteLog avec les includes nécessaires
 */
interface QuoteLogWithRelations {
  id: string;
  quoteId: string;
  eventType: string;
  oldStatus: QuoteStatus | null;
  newStatus: QuoteStatus | null;
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

interface QuoteHistoryTimelineProps {
  /** Liste des logs avec relations chargées */
  logs: QuoteLogWithRelations[];
  /** Mode compact pour moins de détails */
  compact?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
}

// ============================================
// CONFIGURATION DES ÉVÉNEMENTS
// ============================================

/**
 * Configuration d'affichage par type d'événement QuoteLog
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
  // Création et statut
  [QuoteLogEventType.CREATED]: {
    icon: FileText,
    label: 'Devis créé',
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-100',
  },
  [QuoteLogEventType.STATUS_CHANGED]: {
    icon: RefreshCw,
    label: 'Statut modifié',
    colorClass: 'text-purple-600',
    bgColorClass: 'bg-purple-100',
  },

  // Rattachement compte
  [QuoteLogEventType.ATTACHED_TO_ACCOUNT]: {
    icon: LinkIcon,
    label: 'Rattaché au compte',
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-100',
  },

  // Workflow traitement (Agent)
  [QuoteLogEventType.TREATMENT_STARTED]: {
    icon: Hourglass,
    label: 'Traitement démarré',
    colorClass: 'text-indigo-600',
    bgColorClass: 'bg-indigo-100',
  },
  [QuoteLogEventType.TREATMENT_VALIDATED]: {
    icon: FileCheck,
    label: 'Traitement validé',
    colorClass: 'text-emerald-600',
    bgColorClass: 'bg-emerald-100',
  },
  [QuoteLogEventType.PAYMENT_METHOD_SET]: {
    icon: CreditCard,
    label: 'Méthode de paiement définie',
    colorClass: 'text-cyan-600',
    bgColorClass: 'bg-cyan-100',
  },
  [QuoteLogEventType.PAYMENT_RECEIVED]: {
    icon: DollarSign,
    label: 'Paiement reçu',
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-100',
  },

  // Actions client
  [QuoteLogEventType.SENT_TO_CLIENT]: {
    icon: Send,
    label: 'Envoyé au client',
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-100',
  },
  [QuoteLogEventType.ACCEPTED_BY_CLIENT]: {
    icon: CheckCircle,
    label: 'Accepté par le client',
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-100',
  },
  [QuoteLogEventType.REJECTED_BY_CLIENT]: {
    icon: XCircle,
    label: 'Refusé par le client',
    colorClass: 'text-red-600',
    bgColorClass: 'bg-red-100',
  },

  // Annulation et expiration
  [QuoteLogEventType.CANCELLED]: {
    icon: Ban,
    label: 'Devis annulé',
    colorClass: 'text-red-600',
    bgColorClass: 'bg-red-100',
  },
  [QuoteLogEventType.EXPIRED]: {
    icon: Clock,
    label: 'Devis expiré',
    colorClass: 'text-orange-600',
    bgColorClass: 'bg-orange-100',
  },

  // Documents
  [QuoteLogEventType.DOCUMENT_UPLOADED]: {
    icon: Upload,
    label: 'Document ajouté',
    colorClass: 'text-teal-600',
    bgColorClass: 'bg-teal-100',
  },

  // Commentaires
  [QuoteLogEventType.COMMENT_ADDED]: {
    icon: MessageSquare,
    label: 'Commentaire ajouté',
    colorClass: 'text-gray-600',
    bgColorClass: 'bg-gray-100',
  },

  // Système
  [QuoteLogEventType.TOKEN_REFRESHED]: {
    icon: RefreshCw,
    label: 'Token renouvelé',
    colorClass: 'text-gray-600',
    bgColorClass: 'bg-gray-100',
  },
  [QuoteLogEventType.SYSTEM_NOTE]: {
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
 * spécifiques à chaque type d'événement QuoteLog.
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
    // Rattachement au compte utilisateur
    case QuoteLogEventType.ATTACHED_TO_ACCOUNT:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Correspondance par : <strong>{metadata.matchedBy as string}</strong>
          </p>
          {metadata.email && <p>Email : {metadata.email as string}</p>}
        </div>
      );

    // Traitement démarré par un agent
    case QuoteLogEventType.TREATMENT_STARTED:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Agent : <strong>{metadata.agentName as string}</strong>
          </p>
        </div>
      );

    // Traitement validé avec création d'expédition
    case QuoteLogEventType.TREATMENT_VALIDATED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.shipmentId && (
            <p>
              Expédition créée : <strong>{metadata.shipmentId as string}</strong>
            </p>
          )}
          {metadata.paymentMethod && (
            <p>
              Mode de paiement : <strong>{metadata.paymentMethod as string}</strong>
            </p>
          )}
        </div>
      );

    // Méthode de paiement définie
    case QuoteLogEventType.PAYMENT_METHOD_SET:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Méthode : <strong>{metadata.paymentMethod as string}</strong>
          </p>
        </div>
      );

    // Paiement reçu
    case QuoteLogEventType.PAYMENT_RECEIVED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.amount && (
            <p>
              Montant :{' '}
              <strong>
                {(metadata.amount as number).toFixed(2)} {metadata.currency || '€'}
              </strong>
            </p>
          )}
        </div>
      );

    // Envoyé au client
    case QuoteLogEventType.SENT_TO_CLIENT:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.sentTo && <p>Destinataire : {metadata.sentTo as string}</p>}
          {metadata.sentAt && (
            <p>
              Envoyé le :{' '}
              {format(new Date(metadata.sentAt as string), 'dd/MM/yyyy HH:mm', {
                locale: fr,
              })}
            </p>
          )}
        </div>
      );

    // Document uploadé
    case QuoteLogEventType.DOCUMENT_UPLOADED:
      return (
        <div className="text-sm text-muted-foreground">
          <p>
            Type : <strong>{metadata.documentType as string}</strong>
          </p>
          <p>Fichier : {metadata.fileName as string}</p>
        </div>
      );

    // Token renouvelé
    case QuoteLogEventType.TOKEN_REFRESHED:
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

    // Annulation
    case QuoteLogEventType.CANCELLED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.reason && (
            <p>
              Raison : <strong>{metadata.reason as string}</strong>
            </p>
          )}
        </div>
      );

    // Expiration automatique
    case QuoteLogEventType.EXPIRED:
      return (
        <div className="text-sm text-muted-foreground">
          {metadata.validUntil && (
            <p>
              Valide jusqu'au :{' '}
              {format(new Date(metadata.validUntil as string), 'dd/MM/yyyy', {
                locale: fr,
              })}
            </p>
          )}
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
  log: QuoteLogWithRelations;
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
          {log.eventType === QuoteLogEventType.STATUS_CHANGED &&
            log.oldStatus &&
            log.newStatus && (
              <div className="mt-2 flex items-center space-x-2">
                <QuoteStatusBadge status={log.oldStatus} />
                <span className="text-gray-400">→</span>
                <QuoteStatusBadge status={log.newStatus} />
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
 * Affiche l'historique complet d'un devis dans une card
 * avec titre, description et liste des événements.
 *
 * @param logs - Liste des logs QuoteLog avec relations chargées
 * @param compact - Mode compact (moins de détails)
 * @param className - Classes CSS additionnelles
 */
export function QuoteHistoryTimeline({
  logs,
  compact = false,
  className,
}: QuoteHistoryTimelineProps) {
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
            <p>Aucun événement enregistré pour ce devis</p>
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
export function QuoteHistoryTimelineCompact({
  logs,
  className,
}: Omit<QuoteHistoryTimelineProps, 'compact'>) {
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
