/**
 * Helpers pour la création de logs ShipmentLog
 *
 * Simplifie l'enregistrement des événements dans l'historique des expéditions.
 * Chaque helper correspond à un type d'événement spécifique (ShipmentLogEventType).
 *
 * Pattern Event Sourcing Léger :
 * - Chaque événement est immutable (createdAt automatique)
 * - Les logs permettent de reconstituer l'historique complet
 * - Les métadonnées (JSON) offrent une flexibilité totale
 *
 * @module modules/shipments/lib/shipment-log-helper
 *
 * @example
 * ```ts
 * import {
 *   logShipmentCreated,
 *   logStatusChanged,
 *   logPaymentReceived,
 * } from '@/modules/shipments/lib/shipment-log-helper';
 *
 * // Lors de la création d'une expédition
 * await logShipmentCreated({
 *   shipmentId: newShipment.id,
 *   changedById: userId,
 *   metadata: { source: 'quote', quoteId: 'clxxx' },
 * });
 * ```
 */

import { prisma } from '@/lib/db/client';
import { ShipmentStatus } from '@/lib/db/enums';
import { ShipmentLogEventType } from '@/lib/db/shipment-log-events';

// ============================================
// TYPES
// ============================================

/**
 * Paramètres de base pour tous les logs
 *
 * @property shipmentId - ID de l'expédition concernée
 * @property changedById - ID de l'utilisateur ayant effectué l'action (null si système)
 * @property notes - Notes ou commentaires associés à l'événement
 */
interface BaseLogParams {
  shipmentId: string;
  changedById?: string;
  notes?: string;
}

/**
 * Paramètres pour les logs de changement de statut
 *
 * @extends BaseLogParams
 * @property oldStatus - Statut avant le changement (null pour création)
 * @property newStatus - Nouveau statut après le changement
 */
interface StatusChangeLogParams extends BaseLogParams {
  oldStatus: ShipmentStatus | null;
  newStatus: ShipmentStatus;
}

/**
 * Paramètres pour le log de paiement reçu
 *
 * @extends BaseLogParams
 * @property amount - Montant du paiement (optionnel)
 * @property currency - Devise du paiement (ex: 'EUR', 'XOF')
 * @property paymentMethod - Méthode de paiement (ex: 'CASH', 'BANK_TRANSFER')
 */
interface PaymentReceivedLogParams extends BaseLogParams {
  amount?: number;
  currency?: string;
  paymentMethod?: string;
}

/**
 * Paramètres pour les logs de pickup
 *
 * @extends BaseLogParams
 * @property pickupRequestId - ID de la demande d'enlèvement associée
 * @property pickupStatus - Statut actuel de l'enlèvement
 */
interface PickupLogParams extends BaseLogParams {
  pickupRequestId: string;
  pickupStatus?: string;
  pickupDate?: Date;
  driverName?: string;
}

/**
 * Paramètres pour les logs de tracking
 *
 * @extends BaseLogParams
 * @property trackingEventId - ID de l'événement de tracking créé
 * @property location - Localisation du colis
 * @property status - Statut au moment de l'événement
 */
interface TrackingLogParams extends BaseLogParams {
  trackingEventId: string;
  location: string;
  status: string;
}

/**
 * Paramètres pour les logs de documents
 *
 * @extends BaseLogParams
 * @property documentId - ID du document uploadé
 * @property documentType - Type de document (ex: 'PROOF_OF_DELIVERY', 'INVOICE')
 * @property fileName - Nom du fichier uploadé
 */
interface DocumentLogParams extends BaseLogParams {
  documentId: string;
  documentType: string;
  fileName: string;
}

/**
 * Paramètres pour le log de livraison
 *
 * @extends BaseLogParams
 * @property deliveredAt - Date de livraison
 * @property signedBy - Nom du signataire (optionnel)
 * @property proofDocumentId - ID du document de preuve (optionnel)
 */
interface DeliveryLogParams extends BaseLogParams {
  deliveredAt: Date;
  signedBy?: string;
  proofDocumentId?: string;
}

/**
 * Paramètres pour le log de problème
 *
 * @extends BaseLogParams
 * @property problemType - Type de problème (ex: 'DAMAGE', 'DELAY', 'LOST')
 * @property description - Description détaillée du problème
 * @property severity - Niveau de gravité
 */
interface ProblemLogParams extends BaseLogParams {
  problemType: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================
// FONCTION DE BASE
// ============================================

/**
 * Crée un log générique (fonction de base)
 *
 * Cette fonction est utilisée en interne par tous les helpers spécifiques.
 * Elle peut également être utilisée directement pour des cas non couverts.
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * // Création manuelle d'un log
 * await createShipmentLog({
 *   shipmentId: 'clxxx',
 *   eventType: ShipmentLogEventType.SYSTEM_NOTE,
 *   changedById: adminId,
 *   notes: 'Correction manuelle du statut',
 * });
 * ```
 */
export async function createShipmentLog(params: {
  shipmentId: string;
  eventType: string;
  oldStatus?: ShipmentStatus | null;
  newStatus?: ShipmentStatus | null;
  changedById?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  return await prisma.shipmentLog.create({
    data: {
      shipmentId: params.shipmentId,
      eventType: params.eventType,
      oldStatus: params.oldStatus ?? null,
      newStatus: params.newStatus ?? null,
      changedById: params.changedById ?? null,
      notes: params.notes ?? null,
      metadata: params.metadata ?? null,
    },
  });
}

// ============================================
// HELPERS DE CRÉATION DE LOGS
// ============================================

/**
 * Crée un log de création d'expédition
 *
 * Appelé automatiquement lors de la création d'une nouvelle expédition,
 * que ce soit depuis un devis validé ou directement depuis le dashboard.
 *
 * @param params - Paramètres du log
 * @param params.metadata - Métadonnées optionnelles { source: 'quote' | 'dashboard', quoteId?: string }
 * @returns Le log créé
 *
 * @example
 * ```ts
 * // Création depuis un devis
 * await logShipmentCreated({
 *   shipmentId: newShipment.id,
 *   changedById: agentId,
 *   notes: 'Expédition créée depuis le devis #Q-2024-001',
 *   metadata: { source: 'quote', quoteId: 'clxxx' },
 * });
 *
 * // Création directe
 * await logShipmentCreated({
 *   shipmentId: newShipment.id,
 *   changedById: agentId,
 *   metadata: { source: 'dashboard' },
 * });
 * ```
 */
export async function logShipmentCreated(
  params: BaseLogParams & {
    initialStatus?: ShipmentStatus;
    metadata?: {
      source: 'quote' | 'dashboard' | 'api';
      quoteId?: string;
      /** Nombre total de colis transférés depuis le devis */
      packageCount?: number;
    };
  }
) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.CREATED,
    oldStatus: null,
    newStatus: params.initialStatus ?? ShipmentStatus.DRAFT,
    changedById: params.changedById,
    notes: params.notes,
    metadata: params.metadata,
  });
}

/**
 * Crée un log de changement de statut
 *
 * Enregistre chaque transition de statut dans le workflow de l'expédition.
 * Permet de tracer l'historique complet des changements.
 *
 * @param params - Paramètres du log incluant ancien et nouveau statut
 * @returns Le log créé
 *
 * @example
 * ```ts
 * // Passage au statut IN_TRANSIT
 * await logStatusChanged({
 *   shipmentId: 'clxxx',
 *   oldStatus: ShipmentStatus.PICKED_UP,
 *   newStatus: ShipmentStatus.IN_TRANSIT,
 *   changedById: agentId,
 *   notes: 'Colis en transit vers Paris',
 * });
 *
 * // Annulation avec raison obligatoire
 * await logStatusChanged({
 *   shipmentId: 'clxxx',
 *   oldStatus: ShipmentStatus.PENDING,
 *   newStatus: ShipmentStatus.CANCELLED,
 *   changedById: agentId,
 *   notes: 'Annulé à la demande du client - remboursement effectué',
 * });
 * ```
 */
export async function logStatusChanged(params: StatusChangeLogParams) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.STATUS_CHANGED,
    oldStatus: params.oldStatus,
    newStatus: params.newStatus,
    changedById: params.changedById,
    notes: params.notes,
  });
}

/**
 * Crée un log de réception de paiement
 *
 * Enregistre la confirmation de paiement avec les détails financiers.
 *
 * @param params - Paramètres incluant montant et méthode de paiement
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logPaymentReceived({
 *   shipmentId: 'clxxx',
 *   changedById: agentId,
 *   amount: 150.00,
 *   currency: 'EUR',
 *   paymentMethod: 'CASH',
 *   notes: 'Paiement reçu en espèces à l\'enlèvement',
 * });
 * ```
 */
export async function logPaymentReceived(params: PaymentReceivedLogParams) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.PAYMENT_RECEIVED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      amount: params.amount,
      currency: params.currency,
      paymentMethod: params.paymentMethod,
    },
  });
}

/**
 * Crée un log d'assignation de pickup
 *
 * Enregistre la liaison entre l'expédition et une demande d'enlèvement.
 *
 * @param params - Paramètres incluant l'ID de la demande d'enlèvement
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logPickupAssigned({
 *   shipmentId: 'clxxx',
 *   pickupRequestId: 'clyyy',
 *   pickupStatus: 'NOUVEAU',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logPickupAssigned(params: PickupLogParams) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.PICKUP_ASSIGNED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      pickupRequestId: params.pickupRequestId,
      pickupStatus: params.pickupStatus,
    },
  });
}

/**
 * Crée un log d'enlèvement effectué
 *
 * Enregistre que le colis a été récupéré chez l'expéditeur.
 *
 * @param params - Paramètres incluant la date et le chauffeur
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logPickupCompleted({
 *   shipmentId: 'clxxx',
 *   pickupRequestId: 'clyyy',
 *   pickupDate: new Date(),
 *   driverName: 'Jean Martin',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logPickupCompleted(params: PickupLogParams) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.PICKUP_COMPLETED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      pickupRequestId: params.pickupRequestId,
      pickupDate: params.pickupDate?.toISOString(),
      driverName: params.driverName,
    },
  });
}

/**
 * Crée un log d'ajout d'événement de tracking
 *
 * Enregistre chaque nouveau point dans le suivi de l'expédition.
 *
 * @param params - Paramètres incluant localisation et statut
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logTrackingEventAdded({
 *   shipmentId: 'clxxx',
 *   trackingEventId: 'clzzz',
 *   location: 'Paris - Hub Principal',
 *   status: 'IN_TRANSIT',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logTrackingEventAdded(params: TrackingLogParams) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.TRACKING_EVENT_ADDED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      trackingEventId: params.trackingEventId,
      location: params.location,
      status: params.status,
    },
  });
}

/**
 * Crée un log d'ajout de document
 *
 * Enregistre l'upload d'un document associé à l'expédition.
 *
 * @param params - Paramètres incluant type et nom du document
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logDocumentUploaded({
 *   shipmentId: 'clxxx',
 *   documentId: 'clvvv',
 *   documentType: 'PROOF_OF_DELIVERY',
 *   fileName: 'signature-client.jpg',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logDocumentUploaded(params: DocumentLogParams) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.DOCUMENT_UPLOADED,
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
 * Crée un log de livraison effectuée
 *
 * Enregistre la confirmation de livraison avec les détails.
 *
 * @param params - Paramètres incluant date et signataire
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logDelivered({
 *   shipmentId: 'clxxx',
 *   deliveredAt: new Date(),
 *   signedBy: 'M. Dupont',
 *   changedById: agentId,
 *   notes: 'Livré au bureau - signature obtenue',
 * });
 * ```
 */
export async function logDelivered(params: DeliveryLogParams) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.DELIVERED,
    newStatus: ShipmentStatus.DELIVERED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      deliveredAt: params.deliveredAt.toISOString(),
      signedBy: params.signedBy,
      proofDocumentId: params.proofDocumentId,
    },
  });
}

/**
 * Crée un log de tentative de livraison échouée
 *
 * Enregistre une tentative de livraison infructueuse.
 *
 * @param params - Paramètres incluant date et raison
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logDeliveryAttemptFailed({
 *   shipmentId: 'clxxx',
 *   attemptedAt: new Date(),
 *   reason: 'Destinataire absent',
 *   nextAttemptDate: new Date('2026-01-22'),
 *   changedById: agentId,
 * });
 * ```
 */
export async function logDeliveryAttemptFailed(
  params: BaseLogParams & {
    attemptedAt: Date;
    reason: string;
    nextAttemptDate?: Date;
  }
) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.DELIVERY_ATTEMPT_FAILED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      attemptedAt: params.attemptedAt.toISOString(),
      reason: params.reason,
      nextAttemptDate: params.nextAttemptDate?.toISOString(),
    },
  });
}

/**
 * Crée un log d'annulation
 *
 * Enregistre l'annulation de l'expédition avec la raison.
 *
 * @param params - Paramètres incluant raison et montant remboursé
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logCancelled({
 *   shipmentId: 'clxxx',
 *   oldStatus: ShipmentStatus.PENDING,
 *   reason: 'Demande client - marchandise plus disponible',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logCancelled(
  params: BaseLogParams & {
    oldStatus: ShipmentStatus;
    reason: string;
    refundAmount?: number;
  }
) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.CANCELLED,
    oldStatus: params.oldStatus,
    newStatus: ShipmentStatus.CANCELLED,
    changedById: params.changedById,
    notes: params.reason, // La raison est stockée dans notes
    metadata: {
      cancelledAt: new Date().toISOString(),
      reason: params.reason,
      refundAmount: params.refundAmount,
    },
  });
}

/**
 * Crée un log de problème signalé
 *
 * Enregistre un incident sur l'expédition (dommage, perte, retard).
 *
 * @param params - Paramètres incluant type et gravité du problème
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logProblemReported({
 *   shipmentId: 'clxxx',
 *   problemType: 'DAMAGE',
 *   description: 'Carton écrasé, contenu possiblement endommagé',
 *   severity: 'MEDIUM',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logProblemReported(params: ProblemLogParams) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.PROBLEM_REPORTED,
    changedById: params.changedById,
    notes: params.description,
    metadata: {
      problemType: params.problemType,
      description: params.description,
      severity: params.severity,
      reportedAt: new Date().toISOString(),
    },
  });
}

/**
 * Crée un log de commentaire ajouté
 *
 * Enregistre un commentaire d'un agent sur l'expédition.
 *
 * @param params - Paramètres incluant le commentaire
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logCommentAdded({
 *   shipmentId: 'clxxx',
 *   changedById: agentId,
 *   notes: 'Client prévenu du retard - nouvelle date confirmée',
 *   isInternal: true,
 * });
 * ```
 */
export async function logCommentAdded(
  params: BaseLogParams & {
    isInternal?: boolean;
  }
) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.COMMENT_ADDED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      isInternal: params.isInternal ?? false,
    },
  });
}

/**
 * Crée un log de note système
 *
 * Enregistre une action administrative ou système.
 *
 * @param params - Paramètres de base
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logSystemNote({
 *   shipmentId: 'clxxx',
 *   changedById: adminId,
 *   notes: 'Correction manuelle du statut suite à erreur technique',
 * });
 * ```
 */
export async function logSystemNote(params: BaseLogParams) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.SYSTEM_NOTE,
    changedById: params.changedById,
    notes: params.notes,
  });
}

/**
 * Crée un log de modification d'adresse
 *
 * Enregistre toute modification des adresses expéditeur ou destinataire
 * pour assurer un audit trail complet et permettre la résolution de litiges.
 *
 * Cas d'usage typiques :
 * - Client déménage après création du Shipment
 * - Correction d'erreur de saisie
 * - Changement de point de livraison (bureau vs domicile)
 * - Mise à jour des coordonnées de contact
 *
 * Pattern Snapshot/Immutable Data : Les anciennes et nouvelles valeurs
 * sont stockées dans metadata pour traçabilité complète.
 *
 * @param params - Paramètres du log incluant type d'adresse et modifications
 * @returns Le log créé
 *
 * @example Modification de l'adresse de livraison suite à déménagement client
 * ```ts
 * await logShipmentAddressUpdated({
 *   shipmentId: 'clxxx',
 *   changedById: agentId,
 *   addressType: 'destination',
 *   changedFields: ['address', 'city'],
 *   oldAddress: {
 *     address: '123 Rue Ancienne',
 *     city: 'Ouagadougou',
 *   },
 *   newAddress: {
 *     address: '456 Rue Nouvelle',
 *     city: 'Bobo-Dioulasso',
 *   },
 *   notes: 'Client a déménagé - nouvelle adresse confirmée par téléphone le 20/01/2026',
 *   reason: 'Déménagement client',
 * });
 * ```
 *
 * @example Correction de l'email de contact expéditeur
 * ```ts
 * await logShipmentAddressUpdated({
 *   shipmentId: 'clxxx',
 *   changedById: agentId,
 *   addressType: 'origin',
 *   changedFields: ['contactEmail'],
 *   oldAddress: {
 *     contactEmail: 'ancien@example.com',
 *   },
 *   newAddress: {
 *     contactEmail: 'nouveau@example.com',
 *   },
 *   notes: 'Correction de l\'email - erreur de saisie initiale',
 *   reason: 'Erreur de saisie',
 * });
 * ```
 *
 * @example Changement de point de livraison (bureau → domicile)
 * ```ts
 * await logShipmentAddressUpdated({
 *   shipmentId: 'clxxx',
 *   changedById: agentId,
 *   addressType: 'destination',
 *   changedFields: ['address', 'contactName', 'contactPhone'],
 *   oldAddress: {
 *     address: 'Société ABC - 10 Rue du Commerce',
 *     contactName: 'Secrétariat',
 *     contactPhone: '+226 25 11 22 33',
 *   },
 *   newAddress: {
 *     address: '25 Avenue Résidentielle',
 *     contactName: 'M. Dupont',
 *     contactPhone: '+226 70 99 88 77',
 *   },
 *   notes: 'Changement de lieu de livraison : bureau → domicile (demande client)',
 *   reason: 'Préférence client',
 * });
 * ```
 */
export async function logShipmentAddressUpdated(
  params: BaseLogParams & {
    addressType: 'origin' | 'destination';
    changedFields: string[];
    oldAddress: Record<string, string | null | undefined>;
    newAddress: Record<string, string | null | undefined>;
    reason?: string;
  }
) {
  return await createShipmentLog({
    shipmentId: params.shipmentId,
    eventType: ShipmentLogEventType.ADDRESS_UPDATED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      addressType: params.addressType,
      changedFields: params.changedFields,
      oldAddress: params.oldAddress,
      newAddress: params.newAddress,
      reason: params.reason,
      updatedAt: new Date().toISOString(),
    },
  });
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Récupère l'historique complet d'une expédition
 *
 * Retourne tous les logs triés par date décroissante (plus récent en premier).
 * Inclut les informations de l'utilisateur ayant effectué chaque action.
 *
 * @param shipmentId - ID de l'expédition
 * @returns Liste des logs avec informations utilisateur
 *
 * @example
 * ```ts
 * const history = await getShipmentHistory('clxxx');
 *
 * // Afficher l'historique
 * history.forEach((log) => {
 *   console.log(`${log.createdAt}: ${log.eventType}`);
 *   if (log.changedBy) {
 *     console.log(`  Par: ${log.changedBy.name}`);
 *   }
 * });
 * ```
 */
export async function getShipmentHistory(shipmentId: string) {
  return await prisma.shipmentLog.findMany({
    where: { shipmentId },
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
 * Filtre les logs d'une expédition par type d'événement.
 * Utile pour voir uniquement les changements de statut, les paiements, etc.
 *
 * @param shipmentId - ID de l'expédition
 * @param eventType - Type d'événement à filtrer
 * @returns Liste des logs filtrés
 *
 * @example
 * ```ts
 * // Voir tous les changements de statut
 * const statusChanges = await getShipmentLogsByEventType(
 *   'clxxx',
 *   ShipmentLogEventType.STATUS_CHANGED
 * );
 *
 * // Voir tous les paiements
 * const payments = await getShipmentLogsByEventType(
 *   'clxxx',
 *   ShipmentLogEventType.PAYMENT_RECEIVED
 * );
 * ```
 */
export async function getShipmentLogsByEventType(
  shipmentId: string,
  eventType: string
) {
  return await prisma.shipmentLog.findMany({
    where: {
      shipmentId,
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
 * Utile pour connaître le dernier changement de statut effectué.
 *
 * @param shipmentId - ID de l'expédition
 * @returns Le dernier log de statut ou null
 *
 * @example
 * ```ts
 * const lastStatusChange = await getLastStatusChange('clxxx');
 * if (lastStatusChange) {
 *   console.log(`${lastStatusChange.oldStatus} → ${lastStatusChange.newStatus}`);
 *   console.log(`Par: ${lastStatusChange.changedBy?.name}`);
 * }
 * ```
 */
export async function getLastStatusChange(shipmentId: string) {
  return await prisma.shipmentLog.findFirst({
    where: {
      shipmentId,
      eventType: ShipmentLogEventType.STATUS_CHANGED,
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

/**
 * Compte le nombre de logs par type pour une expédition
 *
 * Utile pour des statistiques ou vérifications rapides.
 *
 * @param shipmentId - ID de l'expédition
 * @returns Objet avec le compte par type d'événement
 *
 * @example
 * ```ts
 * const counts = await getShipmentLogCounts('clxxx');
 * console.log(`Changements de statut: ${counts.STATUS_CHANGED ?? 0}`);
 * console.log(`Documents: ${counts.DOCUMENT_UPLOADED ?? 0}`);
 * ```
 */
export async function getShipmentLogCounts(shipmentId: string) {
  const logs = await prisma.shipmentLog.groupBy({
    by: ['eventType'],
    where: { shipmentId },
    _count: { eventType: true },
  });

  return logs.reduce(
    (acc, log) => {
      acc[log.eventType] = log._count.eventType;
      return acc;
    },
    {} as Record<string, number>
  );
}
