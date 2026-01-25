/**
 * Types d'événements pour le modèle ShipmentLog
 *
 * Utilisé pour tracer tous les événements importants dans le cycle de vie
 * d'une expédition (Shipment).
 *
 * Architecture Event Sourcing Léger :
 * Chaque événement représente un changement significatif d'état ou d'action
 * permettant de reconstituer l'historique complet de l'expédition.
 *
 * @module lib/db/shipment-log-events
 *
 * @example
 * ```ts
 * import { ShipmentLogEventType } from '@/lib/db/shipment-log-events';
 *
 * // Utilisation dans une action
 * await createShipmentLog({
 *   shipmentId: 'clxxx',
 *   eventType: ShipmentLogEventType.CREATED,
 *   oldStatus: null,
 *   newStatus: ShipmentStatus.DRAFT,
 * });
 * ```
 */

/**
 * Types d'événements ShipmentLog
 *
 * Ces constantes sont stockées dans le champ `eventType` de la table `shipment_log`
 */
export const ShipmentLogEventType = {
  // ============================================
  // CRÉATION ET STATUT
  // ============================================

  /**
   * Expédition créée
   * - Enregistré à la création du Shipment
   * - oldStatus: null
   * - newStatus: DRAFT ou PENDING
   * - metadata: { source: 'quote' | 'dashboard' | 'api', quoteId?: string }
   *
   * @example Création depuis un devis validé
   * ```ts
   * await logShipmentCreated({
   *   shipmentId: 'clxxx',
   *   changedById: agentId,
   *   metadata: { source: 'quote', quoteId: 'clyyy' },
   * });
   * ```
   */
  CREATED: 'CREATED',

  /**
   * Changement de statut (workflow principal)
   * - Transitions: DRAFT → PENDING → CONFIRMED → PICKED_UP → IN_TRANSIT → DELIVERED
   * - Ou annulation: * → CANCELLED
   * - oldStatus: statut précédent
   * - newStatus: nouveau statut
   * - notes: obligatoire si newStatus = CANCELLED (raison d'annulation)
   *
   * @example Passage au statut IN_TRANSIT
   * ```ts
   * await logStatusChanged({
   *   shipmentId: 'clxxx',
   *   oldStatus: ShipmentStatus.PICKED_UP,
   *   newStatus: ShipmentStatus.IN_TRANSIT,
   *   changedById: agentId,
   *   notes: 'Colis remis au transporteur',
   * });
   * ```
   */
  STATUS_CHANGED: 'STATUS_CHANGED',

  // ============================================
  // PAIEMENT
  // ============================================

  /**
   * Paiement reçu
   * - Confirmation de réception du paiement
   * - changedById: ID de l'agent qui confirme
   * - metadata: { amount?: number, currency?: string, paymentMethod?: string }
   *
   * @example
   * ```ts
   * await logPaymentReceived({
   *   shipmentId: 'clxxx',
   *   changedById: agentId,
   *   metadata: { amount: 150.00, currency: 'EUR', paymentMethod: 'CASH' },
   * });
   * ```
   */
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',

  // ============================================
  // ENLÈVEMENT (PICKUP)
  // ============================================

  /**
   * Demande d'enlèvement associée
   * - Liaison avec une PickupRequest existante ou nouvellement créée
   * - metadata: { pickupRequestId: string, pickupStatus: string }
   *
   * @example
   * ```ts
   * await logPickupAssigned({
   *   shipmentId: 'clxxx',
   *   changedById: agentId,
   *   metadata: { pickupRequestId: 'clzzz', pickupStatus: 'NOUVEAU' },
   * });
   * ```
   */
  PICKUP_ASSIGNED: 'PICKUP_ASSIGNED',

  /**
   * Enlèvement effectué
   * - Le colis a été récupéré chez l'expéditeur
   * - metadata: { pickupDate: ISO8601, driverName?: string }
   */
  PICKUP_COMPLETED: 'PICKUP_COMPLETED',

  // ============================================
  // TRACKING
  // ============================================

  /**
   * Événement de tracking ajouté
   * - Nouveau point dans le suivi de l'expédition
   * - metadata: { trackingEventId: string, location: string, status: string }
   *
   * @example
   * ```ts
   * await logTrackingEventAdded({
   *   shipmentId: 'clxxx',
   *   changedById: agentId,
   *   metadata: {
   *     trackingEventId: 'clwww',
   *     location: 'Paris - Hub Principal',
   *     status: 'IN_TRANSIT',
   *   },
   * });
   * ```
   */
  TRACKING_EVENT_ADDED: 'TRACKING_EVENT_ADDED',

  // ============================================
  // DOCUMENTS
  // ============================================

  /**
   * Document ajouté à l'expédition
   * - Bon de livraison, photos, preuve de livraison, etc.
   * - metadata: { documentId: string, documentType: string, fileName: string }
   *
   * @example
   * ```ts
   * await logDocumentUploaded({
   *   shipmentId: 'clxxx',
   *   changedById: agentId,
   *   metadata: {
   *     documentId: 'clvvv',
   *     documentType: 'PROOF_OF_DELIVERY',
   *     fileName: 'signature-destinataire.jpg',
   *   },
   * });
   * ```
   */
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',

  // ============================================
  // LIVRAISON
  // ============================================

  /**
   * Expédition livrée
   * - Confirmation de livraison au destinataire
   * - metadata: { deliveredAt: ISO8601, signedBy?: string, proofDocumentId?: string }
   *
   * @example
   * ```ts
   * await logDelivered({
   *   shipmentId: 'clxxx',
   *   changedById: agentId,
   *   metadata: {
   *     deliveredAt: new Date().toISOString(),
   *     signedBy: 'M. Dupont',
   *   },
   * });
   * ```
   */
  DELIVERED: 'DELIVERED',

  /**
   * Tentative de livraison échouée
   * - Le destinataire était absent ou refus
   * - metadata: { attemptedAt: ISO8601, reason: string, nextAttemptDate?: ISO8601 }
   */
  DELIVERY_ATTEMPT_FAILED: 'DELIVERY_ATTEMPT_FAILED',

  // ============================================
  // ANNULATION ET PROBLÈMES
  // ============================================

  /**
   * Expédition annulée
   * - Passage au statut CANCELLED
   * - notes: raison de l'annulation (obligatoire)
   * - metadata: { cancelledAt: ISO8601, reason: string, refundAmount?: number }
   */
  CANCELLED: 'CANCELLED',

  /**
   * Problème signalé sur l'expédition
   * - Incident, retard, dommage, etc.
   * - metadata: { problemType: string, description: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' }
   */
  PROBLEM_REPORTED: 'PROBLEM_REPORTED',

  // ============================================
  // COMMENTAIRES ET NOTES
  // ============================================

  /**
   * Commentaire ajouté par un agent
   * - notes: contenu du commentaire
   * - metadata: { isInternal: boolean }
   */
  COMMENT_ADDED: 'COMMENT_ADDED',

  // ============================================
  // MODIFICATIONS D'ADRESSES (Snapshot Pattern)
  // ============================================

  /**
   * Adresse modifiée (expéditeur ou destinataire)
   * - Enregistre toute modification d'adresse pour traçabilité
   * - Conforme RGPD/ISO (audit trail complet)
   * - Permet la résolution de litiges (preuve de modification)
   * - notes: description de la modification
   * - metadata: {
   *     addressType: 'origin' | 'destination',
   *     changedFields: string[],  // ex: ['address', 'city', 'postalCode']
   *     oldAddress: {
   *       address?: string,
   *       city?: string,
   *       postalCode?: string,
   *       contactName?: string,
   *       contactPhone?: string,
   *       contactEmail?: string
   *     },
   *     newAddress: {
   *       address?: string,
   *       city?: string,
   *       postalCode?: string,
   *       contactName?: string,
   *       contactPhone?: string,
   *       contactEmail?: string
   *     },
   *     reason?: string // Raison de la modification
   *   }
   *
   * @example Modification de l'adresse de livraison
   * ```ts
   * await logShipmentAddressUpdated({
   *   shipmentId: 'clxxx',
   *   changedById: agentId,
   *   addressType: 'destination',
   *   changedFields: ['address'],
   *   oldAddress: { address: '123 Rue Ancienne' },
   *   newAddress: { address: '456 Rue Nouvelle' },
   *   notes: 'Client a déménagé - nouvelle adresse confirmée par téléphone',
   * });
   * ```
   */
  ADDRESS_UPDATED: 'ADDRESS_UPDATED',

  // ============================================
  // SYSTÈME
  // ============================================

  /**
   * Note système (migration, correction manuelle, etc.)
   * - Événement générique pour actions administratives
   * - notes: description de l'action effectuée
   * - metadata: données contextuelles libres
   */
  SYSTEM_NOTE: 'SYSTEM_NOTE',
} as const;

/**
 * Type TypeScript pour les événements ShipmentLog
 * Permet l'autocomplétion et la vérification de type
 */
export type ShipmentLogEventType =
  (typeof ShipmentLogEventType)[keyof typeof ShipmentLogEventType];

/**
 * Vérifie si une valeur est un type d'événement valide
 *
 * @param value - Valeur à vérifier
 * @returns true si la valeur est un ShipmentLogEventType valide
 *
 * @example
 * ```ts
 * if (isShipmentLogEventType(eventType)) {
 *   // eventType est valide, TypeScript le sait
 *   console.log(eventType); // Type: ShipmentLogEventType
 * }
 * ```
 */
export function isShipmentLogEventType(
  value: unknown
): value is ShipmentLogEventType {
  return (
    typeof value === 'string' &&
    Object.values(ShipmentLogEventType).includes(value as ShipmentLogEventType)
  );
}

/**
 * Liste de tous les types d'événements disponibles
 * Utile pour les validations, filtres, dropdowns, etc.
 *
 * @example
 * ```tsx
 * // Dans un composant de filtre
 * <Select>
 *   {ALL_SHIPMENT_LOG_EVENT_TYPES.map((type) => (
 *     <SelectItem key={type} value={type}>{type}</SelectItem>
 *   ))}
 * </Select>
 * ```
 */
export const ALL_SHIPMENT_LOG_EVENT_TYPES = Object.values(ShipmentLogEventType);
