/**
 * Helpers pour la création de logs QuoteLog
 *
 * Simplifie l'enregistrement des événements dans l'historique des devis.
 * Chaque helper correspond à un type d'événement spécifique (QuoteLogEventType).
 *
 * Pattern Event Sourcing Léger :
 * - Chaque événement est immutable (createdAt automatique)
 * - Les logs permettent de reconstituer l'historique complet
 * - Les métadonnées (JSON) offrent une flexibilité totale
 *
 * @module modules/quotes/lib/quote-log-helper
 */

import { prisma } from '@/lib/db/client';
import { QuoteStatus } from '@/lib/db/enums';
import { QuoteLogEventType } from '@/lib/db/quote-log-events';

// ============================================
// TYPES
// ============================================

/**
 * Paramètres de base pour tous les logs
 */
interface BaseLogParams {
  quoteId: string;
  changedById?: string; // Null si système
  notes?: string;
}

/**
 * Paramètres pour les logs de changement de statut
 */
interface StatusChangeLogParams extends BaseLogParams {
  oldStatus: QuoteStatus | null;
  newStatus: QuoteStatus;
}

/**
 * Paramètres pour le log de rattachement
 */
interface AttachedToAccountLogParams extends BaseLogParams {
  email: string;
  matchedBy: 'email' | 'localStorage' | 'prospect';
}

/**
 * Paramètres pour les logs de traitement
 */
interface TreatmentLogParams extends BaseLogParams {
  agentId: string;
  agentName?: string;
}

/**
 * Paramètres pour les logs de paiement
 */
interface PaymentLogParams extends BaseLogParams {
  paymentMethod?: string;
  amount?: number;
  currency?: string;
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
 * await createQuoteLog({
 *   quoteId: 'clxxx',
 *   eventType: QuoteLogEventType.CREATED,
 *   oldStatus: null,
 *   newStatus: QuoteStatus.DRAFT,
 *   changedById: userId,
 * });
 * ```
 */
export async function createQuoteLog(params: {
  quoteId: string;
  eventType: string;
  oldStatus?: QuoteStatus | null;
  newStatus?: QuoteStatus | null;
  changedById?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  return await prisma.quoteLog.create({
    data: {
      quoteId: params.quoteId,
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
 * Crée un log de création de devis
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteCreated({
 *   quoteId: 'clxxx',
 *   changedById: userId, // Null si création sans compte
 *   source: 'calculator',
 * });
 * ```
 */
export async function logQuoteCreated(
  params: BaseLogParams & {
    source?: 'calculator' | 'dashboard' | 'prospect';
  }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.CREATED,
    oldStatus: null,
    newStatus: QuoteStatus.DRAFT,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      source: params.source ?? 'dashboard',
    },
  });
}

/**
 * Crée un log de changement de statut
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteStatusChanged({
 *   quoteId: 'clxxx',
 *   oldStatus: QuoteStatus.DRAFT,
 *   newStatus: QuoteStatus.SENT,
 *   changedById: agentId,
 *   notes: 'Devis envoyé au client',
 * });
 * ```
 */
export async function logQuoteStatusChanged(params: StatusChangeLogParams) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.STATUS_CHANGED,
    oldStatus: params.oldStatus,
    newStatus: params.newStatus,
    changedById: params.changedById,
    notes: params.notes,
  });
}

/**
 * Crée un log de rattachement à un compte
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteAttachedToAccount({
 *   quoteId: 'clxxx',
 *   email: 'user@example.com',
 *   matchedBy: 'localStorage',
 *   notes: 'Rattachement automatique depuis le localStorage',
 * });
 * ```
 */
export async function logQuoteAttachedToAccount(
  params: AttachedToAccountLogParams
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.ATTACHED_TO_ACCOUNT,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      email: params.email,
      matchedBy: params.matchedBy,
    },
  });
}

/**
 * Crée un log de début de traitement
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteTreatmentStarted({
 *   quoteId: 'clxxx',
 *   agentId: 'clyyyy',
 *   agentName: 'Agent Dupont',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logQuoteTreatmentStarted(params: TreatmentLogParams) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.TREATMENT_STARTED,
    oldStatus: QuoteStatus.ACCEPTED,
    newStatus: QuoteStatus.IN_TREATMENT,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      agentId: params.agentId,
      agentName: params.agentName,
    },
  });
}

/**
 * Crée un log de validation du traitement
 *
 * @param params - Paramètres du log avec shipmentId
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteTreatmentValidated({
 *   quoteId: 'clxxx',
 *   agentId: 'clyyyy',
 *   shipmentId: 'clzzz',
 *   paymentMethod: 'CASH',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logQuoteTreatmentValidated(
  params: TreatmentLogParams & {
    shipmentId?: string;
    paymentMethod?: string;
  }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.TREATMENT_VALIDATED,
    oldStatus: QuoteStatus.IN_TREATMENT,
    newStatus: QuoteStatus.VALIDATED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      agentId: params.agentId,
      agentName: params.agentName,
      shipmentId: params.shipmentId,
      paymentMethod: params.paymentMethod,
    },
  });
}

/**
 * Crée un log de définition de méthode de paiement
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuotePaymentMethodSet({
 *   quoteId: 'clxxx',
 *   paymentMethod: 'BANK_TRANSFER',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logQuotePaymentMethodSet(params: PaymentLogParams) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.PAYMENT_METHOD_SET,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      paymentMethod: params.paymentMethod,
    },
  });
}

/**
 * Crée un log de réception de paiement
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuotePaymentReceived({
 *   quoteId: 'clxxx',
 *   amount: 1500.00,
 *   currency: 'EUR',
 *   changedById: agentId,
 *   notes: 'Paiement reçu en espèces',
 * });
 * ```
 */
export async function logQuotePaymentReceived(params: PaymentLogParams) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.PAYMENT_RECEIVED,
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
 * Crée un log d'envoi au client
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteSentToClient({
 *   quoteId: 'clxxx',
 *   sentTo: 'client@example.com',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logQuoteSentToClient(
  params: BaseLogParams & { sentTo: string }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.SENT_TO_CLIENT,
    oldStatus: QuoteStatus.DRAFT,
    newStatus: QuoteStatus.SENT,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      sentTo: params.sentTo,
      sentAt: new Date().toISOString(),
    },
  });
}

/**
 * Crée un log d'acceptation par le client
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteAcceptedByClient({
 *   quoteId: 'clxxx',
 *   notes: 'Client a accepté via le portail',
 * });
 * ```
 */
export async function logQuoteAcceptedByClient(params: BaseLogParams) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.ACCEPTED_BY_CLIENT,
    oldStatus: QuoteStatus.SENT,
    newStatus: QuoteStatus.ACCEPTED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      acceptedAt: new Date().toISOString(),
    },
  });
}

/**
 * Crée un log de rejet par le client
 *
 * @param params - Paramètres du log avec raison optionnelle
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteRejectedByClient({
 *   quoteId: 'clxxx',
 *   reason: 'Prix trop élevé',
 *   notes: 'Client a rejeté via le portail',
 * });
 * ```
 */
export async function logQuoteRejectedByClient(
  params: BaseLogParams & { reason?: string }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.REJECTED_BY_CLIENT,
    oldStatus: QuoteStatus.SENT,
    newStatus: QuoteStatus.REJECTED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      rejectedAt: new Date().toISOString(),
      reason: params.reason,
    },
  });
}

/**
 * Crée un log d'annulation
 *
 * @param params - Paramètres du log avec raison obligatoire
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteCancelled({
 *   quoteId: 'clxxx',
 *   oldStatus: QuoteStatus.IN_TREATMENT,
 *   reason: 'Client a demandé l\'annulation',
 *   changedById: agentId,
 * });
 * ```
 */
export async function logQuoteCancelled(
  params: BaseLogParams & {
    oldStatus: QuoteStatus;
    reason: string;
  }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.CANCELLED,
    oldStatus: params.oldStatus,
    newStatus: QuoteStatus.CANCELLED,
    changedById: params.changedById,
    notes: params.reason, // La raison est stockée dans notes
    metadata: {
      cancelledAt: new Date().toISOString(),
      reason: params.reason,
    },
  });
}

/**
 * Crée un log d'expiration automatique
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteExpired({
 *   quoteId: 'clxxx',
 *   oldStatus: QuoteStatus.SENT,
 *   validUntil: quote.validUntil,
 * });
 * ```
 */
export async function logQuoteExpired(
  params: BaseLogParams & {
    oldStatus: QuoteStatus;
    validUntil: Date;
  }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.EXPIRED,
    oldStatus: params.oldStatus,
    newStatus: QuoteStatus.EXPIRED,
    changedById: null, // Système
    notes: params.notes ?? 'Expiration automatique - date de validité dépassée',
    metadata: {
      expiredAt: new Date().toISOString(),
      validUntil: params.validUntil.toISOString(),
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
 * await logQuoteDocumentUploaded({
 *   quoteId: 'clxxx',
 *   documentId: 'clzzz',
 *   documentType: 'PROFORMA_INVOICE',
 *   fileName: 'proforma-QTE-123.pdf',
 *   changedById: userId,
 * });
 * ```
 */
export async function logQuoteDocumentUploaded(params: DocumentLogParams) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.DOCUMENT_UPLOADED,
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
 * Crée un log de commentaire
 *
 * @param params - Paramètres du log
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteCommentAdded({
 *   quoteId: 'clxxx',
 *   notes: 'Client demande une livraison le matin uniquement',
 *   isInternal: true,
 *   changedById: agentId,
 * });
 * ```
 */
export async function logQuoteCommentAdded(
  params: BaseLogParams & { isInternal?: boolean }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.COMMENT_ADDED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      isInternal: params.isInternal ?? true,
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
 * await logQuoteTokenRefreshed({
 *   quoteId: 'clxxx',
 *   newExpiresAt: new Date('2026-01-25'),
 *   reason: 'Demande client',
 * });
 * ```
 */
export async function logQuoteTokenRefreshed(
  params: BaseLogParams & {
    newExpiresAt: Date;
    reason?: string;
  }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.TOKEN_REFRESHED,
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
 * await logQuoteSystemNote({
 *   quoteId: 'clxxx',
 *   changedById: adminId,
 *   notes: 'Correction manuelle du statut suite à erreur de saisie',
 * });
 * ```
 */
export async function logQuoteSystemNote(params: BaseLogParams) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.SYSTEM_NOTE,
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
 * Pattern Snapshot/Immutable Data : Les anciennes et nouvelles valeurs
 * sont stockées dans metadata pour traçabilité complète.
 *
 * @param params - Paramètres du log incluant type d'adresse et modifications
 * @returns Le log créé
 *
 * @example Modification complète de l'adresse destinataire
 * ```ts
 * await logQuoteAddressUpdated({
 *   quoteId: 'clxxx',
 *   changedById: agentId,
 *   addressType: 'destination',
 *   changedFields: ['address', 'city', 'postalCode'],
 *   oldAddress: {
 *     address: '123 Rue de la Paix',
 *     city: 'Paris',
 *     postalCode: '75001',
 *   },
 *   newAddress: {
 *     address: '456 Avenue de l\'Indépendance',
 *     city: 'Lyon',
 *     postalCode: '69001',
 *   },
 *   notes: 'Correction suite à appel client - client a déménagé',
 *   reason: 'Déménagement client',
 * });
 * ```
 *
 * @example Modification simple du téléphone de contact
 * ```ts
 * await logQuoteAddressUpdated({
 *   quoteId: 'clxxx',
 *   changedById: agentId,
 *   addressType: 'origin',
 *   changedFields: ['contactPhone'],
 *   oldAddress: {
 *     contactPhone: '+226 70 12 34 56',
 *   },
 *   newAddress: {
 *     contactPhone: '+226 70 98 76 54',
 *   },
 *   notes: 'Mise à jour du numéro de téléphone de contact',
 * });
 * ```
 */
export async function logQuoteAddressUpdated(
  params: BaseLogParams & {
    addressType: 'origin' | 'destination';
    changedFields: string[];
    oldAddress: Record<string, string | null | undefined>;
    newAddress: Record<string, string | null | undefined>;
    reason?: string;
  }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.ADDRESS_UPDATED,
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

/**
 * Crée un log de modification générale d'un devis
 *
 * Enregistre les champs modifiés lors d'une mise à jour via le formulaire d'édition.
 * Permet de tracer qui a modifié quoi et quand.
 *
 * @param params - Paramètres du log
 * @param params.quoteId - ID du devis modifié
 * @param params.changedById - ID de l'utilisateur qui modifie
 * @param params.changedFields - Liste des noms de champs modifiés (ex: ['weight', 'originCountry'])
 * @param params.source - Source de la modification ('dashboard' pour agents, 'client-portal' pour clients)
 * @param params.notes - Description optionnelle de la modification
 * @returns Le log créé
 *
 * @example
 * ```ts
 * await logQuoteUpdated({
 *   quoteId: 'clxxx',
 *   changedById: session.user.id,
 *   changedFields: ['weight', 'originCountry', 'destinationCountry'],
 *   source: 'dashboard',
 *   notes: 'Modification du poids et des pays',
 * });
 * ```
 */
export async function logQuoteUpdated(
  params: BaseLogParams & {
    changedFields: string[];
    source?: 'dashboard' | 'client-portal';
  }
) {
  return await createQuoteLog({
    quoteId: params.quoteId,
    eventType: QuoteLogEventType.UPDATED,
    changedById: params.changedById,
    notes: params.notes,
    metadata: {
      changedFields: params.changedFields,
      source: params.source ?? 'dashboard',
      updatedAt: new Date().toISOString(),
    },
  });
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Récupère l'historique complet d'un devis
 *
 * @param quoteId - ID du devis
 * @returns Liste des logs triés par date (plus récent en premier)
 *
 * @example
 * ```ts
 * const history = await getQuoteHistory('clxxx');
 * console.log(history[0].eventType); // Dernier événement
 * ```
 */
export async function getQuoteHistory(quoteId: string) {
  return await prisma.quoteLog.findMany({
    where: { quoteId },
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
 * @param quoteId - ID du devis
 * @param eventType - Type d'événement
 * @returns Liste des logs filtrés
 *
 * @example
 * ```ts
 * const statusChanges = await getQuoteLogsByEventType(
 *   'clxxx',
 *   QuoteLogEventType.STATUS_CHANGED
 * );
 * ```
 */
export async function getQuoteLogsByEventType(
  quoteId: string,
  eventType: string
) {
  return await prisma.quoteLog.findMany({
    where: {
      quoteId,
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
 * @param quoteId - ID du devis
 * @returns Le dernier log de statut ou null
 *
 * @example
 * ```ts
 * const lastStatusChange = await getLastQuoteStatusChange('clxxx');
 * if (lastStatusChange) {
 *   console.log(`${lastStatusChange.oldStatus} → ${lastStatusChange.newStatus}`);
 * }
 * ```
 */
export async function getLastQuoteStatusChange(quoteId: string) {
  return await prisma.quoteLog.findFirst({
    where: {
      quoteId,
      eventType: QuoteLogEventType.STATUS_CHANGED,
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
