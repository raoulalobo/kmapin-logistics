/**
 * Types d'événements pour le modèle PickupLog
 *
 * Utilisé pour tracer tous les événements importants dans le cycle de vie
 * d'une demande d'enlèvement.
 *
 * Architecture Event Sourcing Léger :
 * Chaque événement représente un changement significatif d'état ou d'action
 * permettant de reconstituer l'historique complet de la demande.
 */

/**
 * Types d'événements PickupLog
 *
 * Ces constantes sont stockées dans le champ `eventType` de la table `pickup_log`
 */
export const PickupLogEventType = {
  // ============================================
  // CRÉATION ET STATUT
  // ============================================

  /**
   * Demande d'enlèvement créée
   * - Enregistré à la création de la PickupRequest
   * - oldStatus: null
   * - newStatus: NOUVEAU
   */
  CREATED: 'CREATED',

  /**
   * Changement de statut (workflow principal)
   * - Transitions: NOUVEAU → PRISE_EN_CHARGE → EFFECTUE
   * - Ou annulation: * → ANNULE
   * - oldStatus: statut précédent
   * - newStatus: nouveau statut
   * - notes: obligatoire si newStatus = ANNULE (raison d'annulation)
   */
  STATUS_CHANGED: 'STATUS_CHANGED',

  // ============================================
  // RATTACHEMENT COMPTE (US-1.3)
  // ============================================

  /**
   * Demande rattachée à un compte utilisateur
   * - Déclenché lors de la connexion/création de compte d'un utilisateur non connecté
   * - Matching automatique par email ou téléphone
   * - metadata: { email: string, matchedBy: 'email' | 'phone' }
   */
  ATTACHED_TO_ACCOUNT: 'ATTACHED_TO_ACCOUNT',

  // ============================================
  // TRANSPORTEUR
  // ============================================

  /**
   * Chauffeur/Transporteur assigné à la demande
   * - Première assignation d'un transporteur
   * - metadata: { transporterId: string, transporterName: string, driverName?: string }
   */
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',

  /**
   * Chauffeur/Transporteur modifié
   * - Changement de transporteur ou de chauffeur
   * - metadata: {
   *     oldTransporterId?: string,
   *     newTransporterId?: string,
   *     oldDriverName?: string,
   *     newDriverName?: string
   *   }
   */
  DRIVER_CHANGED: 'DRIVER_CHANGED',

  // ============================================
  // PLANIFICATION
  // ============================================

  /**
   * Date/heure d'enlèvement planifiée
   * - Agent confirme une date d'enlèvement
   * - metadata: { scheduledDate: ISO8601, timeSlot: string }
   */
  SCHEDULED: 'SCHEDULED',

  /**
   * Date/heure d'enlèvement modifiée
   * - Changement de la date/heure planifiée
   * - metadata: { oldScheduledDate?: ISO8601, newScheduledDate?: ISO8601 }
   */
  RESCHEDULED: 'RESCHEDULED',

  // ============================================
  // DOCUMENTS
  // ============================================

  /**
   * Document ajouté à la demande
   * - Photo de la marchandise, signature, preuve d'enlèvement, etc.
   * - metadata: { documentId: string, documentType: string, fileName: string }
   */
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',

  // ============================================
  // SYSTÈME
  // ============================================

  /**
   * Token de suivi renouvelé
   * - Prolongation de la validité du token (au-delà des 72h initiales)
   * - metadata: { newExpiresAt: ISO8601, reason?: string }
   */
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',

  /**
   * Note système (migration, correction manuelle, etc.)
   * - Événement générique pour actions administratives
   * - notes: description de l'action effectuée
   * - metadata: données contextuelles libres
   */
  SYSTEM_NOTE: 'SYSTEM_NOTE',
} as const;

/**
 * Type TypeScript pour les événements PickupLog
 * Permet l'autocomplétion et la vérification de type
 */
export type PickupLogEventType = typeof PickupLogEventType[keyof typeof PickupLogEventType];

/**
 * Vérifie si une valeur est un type d'événement valide
 *
 * @param value - Valeur à vérifier
 * @returns true si la valeur est un PickupLogEventType valide
 *
 * @example
 * if (isPickupLogEventType(eventType)) {
 *   // eventType est valide
 * }
 */
export function isPickupLogEventType(value: unknown): value is PickupLogEventType {
  return typeof value === 'string' && Object.values(PickupLogEventType).includes(value as PickupLogEventType);
}

/**
 * Liste de tous les types d'événements disponibles
 * Utile pour les validations, filtres, etc.
 */
export const ALL_PICKUP_LOG_EVENT_TYPES = Object.values(PickupLogEventType);
