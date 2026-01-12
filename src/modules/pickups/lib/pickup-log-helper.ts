/**
 * Helpers pour la création de logs PickupLog
 *
 * Simplifie l'enregistrement des événements dans l'historique des demandes d'enlèvement.
 * Chaque helper correspond à un type d'événement spécifique (PickupLogEventType).
 *
 * Pattern Event Sourcing Léger :
 * - Chaque événement est immutable (createdAt automatique)
 * - Les logs permettent de reconstituer l'historique complet
 * - Les métadonnées (JSON) offrent une flexibilité totale
 */

import { prisma } from '@/lib/db/client';
import { PickupStatus } from '@/lib/db/enums';
import { PickupLogEventType } from '@/lib/db/pickup-log-events';

// ============================================
// TYPES
// ============================================

/**
 * Paramètres de base pour tous les logs
 */
interface BaseLogParams {
  pickupId: string;
  changedById?: string; // Null si système
  notes?: string;
}

/**
 * Paramètres pour les logs de changement de statut
 */
interface StatusChangeLogParams extends BaseLogParams {
  oldStatus: PickupStatus | null;
  newStatus: PickupStatus;
}

/**
 * Paramètres pour le log de rattachement
 */
interface AttachedToAccountLogParams extends BaseLogParams {
  email: string;
  matchedBy: 'email' | 'phone';
}

/**
 * Paramètres pour les logs de transporteur
 */
interface DriverLogParams extends BaseLogParams {
  transporterId?: string;
  transporterName?: string;
  driverName?: string;
  driverPhone?: string;
}

/**
 * Paramètres pour les logs de planification
 */
interface ScheduleLogParams extends BaseLogParams {
  scheduledDate: Date;
  timeSlot: string;
  oldScheduledDate?: Date;
}

/**
 * Paramètres pour les logs de documents
 */
interface DocumentLogParams extends BaseLogParams {
  documentId: string;
  documentType: string;
  fileName: string;
}

// ============================================
// HELPERS DE CRÉATION DE LOGS
// ============================================

/**
 * Crée un log générique (fonction de base)
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await createPickupLog({
 *   pickupId: 'clxxx',
 *   eventType: PickupLogEventType.CREATED,
 *   oldStatus: null,
 *   newStatus: PickupStatus.NOUVEAU,
 *   changedById: userId,
 * });
 * ```
 */
export async function createPickupLog(params: {
  pickupId: string;
  eventType: string;
  oldStatus?: PickupStatus | null;
  newStatus?: PickupStatus | null;
  changedById?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  return await prisma.pickupLog.create({
    data: {
      pickupId: params.pickupId,
      eventType: params.eventType,
      oldStatus: params.oldStatus ?? null,
      newStatus: params.newStatus ?? null,
      changedById: params.changedById ?? null,
      notes: params.notes ?? null,
      metadata: params.metadata ?? null,
    },
  });
}

/**
 * Crée un log de création de demande
 *
 * User Story US-1.1 et US-1.4
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logPickupCreated({
 *   pickupId: 'clxxx',
 *   changedById: userId, // Null si création sans compte
 * });
 * ```
 */
export async function logPickupCreated(params: BaseLogParams) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.CREATED,
    oldStatus: null,
    newStatus: PickupStatus.NOUVEAU,
    changedById: params.changedById,
    notes: params.notes,
  });
}

/**
 * Crée un log de changement de statut
 *
 * User Story US-3.2 (workflow)
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logStatusChanged({
 *   pickupId: 'clxxx',
 *   oldStatus: PickupStatus.NOUVEAU,
 *   newStatus: PickupStatus.PRISE_EN_CHARGE,
 *   changedById: agentId,
 *   notes: 'Demande prise en charge par Agent Dupont',
 * });
 * ```
 */
export async function logStatusChanged(params: StatusChangeLogParams) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.STATUS_CHANGED,
    oldStatus: params.oldStatus,
    newStatus: params.newStatus,
    changedById: params.changedById,
    notes: params.notes,
  });
}

/**
 * Crée un log de rattachement à un compte
 *
 * User Story US-1.3 (matching automatique)
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logAttachedToAccount({
 *   pickupId: 'clxxx',
 *   email: 'user@example.com',
 *   matchedBy: 'email',
 *   notes: 'Rattachement automatique lors de la création du compte',
 * });
 * ```
 */
export async function logAttachedToAccount(params: AttachedToAccountLogParams) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.ATTACHED_TO_ACCOUNT,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      email: params.email,
      matchedBy: params.matchedBy,
    },
  });
}

/**
 * Crée un log d'assignation de chauffeur
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logDriverAssigned({
 *   pickupId: 'clxxx',
 *   transporterId: 'clyyy',
 *   transporterName: 'Transports Dupont',
 *   driverName: 'Jean Martin',
 *   driverPhone: '+33612345678',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logDriverAssigned(params: DriverLogParams) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.DRIVER_ASSIGNED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      transporterId: params.transporterId,
      transporterName: params.transporterName,
      driverName: params.driverName,
      driverPhone: params.driverPhone,
    },
  });
}

/**
 * Crée un log de changement de chauffeur
 *
 * @param params - Paramètres du log avec ancien et nouveau transporteur
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logDriverChanged({
 *   pickupId: 'clxxx',
 *   changedById: agentId,
 *   notes: 'Changement de transporteur',
 *   // Metadata enrichi avec oldXXX et newXXX
 * });
 * ```
 */
export async function logDriverChanged(
  params: DriverLogParams & {
    oldTransporterId?: string;
    newTransporterId?: string;
    oldDriverName?: string;
    newDriverName?: string;
  }
) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.DRIVER_CHANGED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      oldTransporterId: params.oldTransporterId,
      newTransporterId: params.newTransporterId,
      oldDriverName: params.oldDriverName,
      newDriverName: params.newDriverName,
    },
  });
}

/**
 * Crée un log de planification
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logScheduled({
 *   pickupId: 'clxxx',
 *   scheduledDate: new Date('2026-01-15'),
 *   timeSlot: 'MORNING',
 *   changedById: agentId,
 *   notes: 'Enlèvement planifié pour le 15 janvier matin',
 * });
 * ```
 */
export async function logScheduled(params: ScheduleLogParams) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.SCHEDULED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      scheduledDate: params.scheduledDate.toISOString(),
      timeSlot: params.timeSlot,
    },
  });
}

/**
 * Crée un log de replanification
 *
 * @param params - Paramètres du log avec anciennes et nouvelles dates
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logRescheduled({
 *   pickupId: 'clxxx',
 *   oldScheduledDate: new Date('2026-01-15'),
 *   scheduledDate: new Date('2026-01-20'),
 *   timeSlot: 'AFTERNOON',
 *   changedById: agentId,
 *   notes: 'Report de l\'enlèvement à la demande du client',
 * });
 * ```
 */
export async function logRescheduled(params: ScheduleLogParams) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.RESCHEDULED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      oldScheduledDate: params.oldScheduledDate?.toISOString(),
      newScheduledDate: params.scheduledDate.toISOString(),
      timeSlot: params.timeSlot,
    },
  });
}

/**
 * Crée un log d'ajout de document
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logDocumentUploaded({
 *   pickupId: 'clxxx',
 *   documentId: 'clzzz',
 *   documentType: 'PROOF_OF_PICKUP',
 *   fileName: 'signature-client.jpg',
 *   changedById: userId,
 * });
 * ```
 */
export async function logDocumentUploaded(params: DocumentLogParams) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.DOCUMENT_UPLOADED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      documentId: params.documentId,
      documentType: params.documentType,
      fileName: params.fileName,
    },
  });
}

/**
 * Crée un log de renouvellement de token
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logTokenRefreshed({
 *   pickupId: 'clxxx',
 *   notes: 'Token renouvelé pour 72h supplémentaires',
 * });
 * ```
 */
export async function logTokenRefreshed(
  params: BaseLogParams & {
    newExpiresAt: Date;
    reason?: string;
  }
) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.TOKEN_REFRESHED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      newExpiresAt: params.newExpiresAt.toISOString(),
      reason: params.reason,
    },
  });
}

/**
 * Crée un log de note système
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logSystemNote({
 *   pickupId: 'clxxx',
 *   changedById: adminId,
 *   notes: 'Correction manuelle du statut suite à erreur de saisie',
 * });
 * ```
 */
export async function logSystemNote(params: BaseLogParams) {
  return await createPickupLog({
    pickupId: params.pickupId,
    eventType: PickupLogEventType.SYSTEM_NOTE,
    changedById: params.changedById,
    notes: params.notes,
  });
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Récupère l'historique complet d'une demande
 *
 * @param pickupId - ID de la demande
 * @returns Liste des logs triés par date (plus récent en premier)
 *
 * @example
 * ```ts
 * const history = await getPickupHistory('clxxx');
 * console.log(history[0].eventType); // Dernier événement
 * ```
 */
export async function getPickupHistory(pickupId: string) {
  return await prisma.pickupLog.findMany({
    where: { pickupId },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Récupère les logs par type d'événement
 *
 * @param pickupId - ID de la demande
 * @param eventType - Type d'événement
 * @returns Liste des logs filtrés
 *
 * @example
 * ```ts
 * const statusChanges = await getPickupLogsByEventType(
 *   'clxxx',
 *   PickupLogEventType.STATUS_CHANGED
 * );
 * ```
 */
export async function getPickupLogsByEventType(
  pickupId: string,
  eventType: string
) {
  return await prisma.pickupLog.findMany({
    where: {
      pickupId,
      eventType,
    },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Récupère le dernier log de changement de statut
 *
 * @param pickupId - ID de la demande
 * @returns Le dernier log de statut ou null
 *
 * @example
 * ```ts
 * const lastStatusChange = await getLastStatusChange('clxxx');
 * if (lastStatusChange) {
 *   console.log(`${lastStatusChange.oldStatus} → ${lastStatusChange.newStatus}`);
 * }
 * ```
 */
export async function getLastStatusChange(pickupId: string) {
  return await prisma.pickupLog.findFirst({
    where: {
      pickupId,
      eventType: PickupLogEventType.STATUS_CHANGED,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
