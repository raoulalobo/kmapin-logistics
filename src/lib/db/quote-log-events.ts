/**
 * Types d'événements pour le modèle QuoteLog
 *
 * Utilisé pour tracer tous les événements importants dans le cycle de vie
 * d'un devis (Quote).
 *
 * Architecture Event Sourcing Léger :
 * Chaque événement représente un changement significatif d'état ou d'action
 * permettant de reconstituer l'historique complet du devis.
 *
 * @module lib/db/quote-log-events
 */

/**
 * Types d'événements QuoteLog
 *
 * Ces constantes sont stockées dans le champ `eventType` de la table `quote_log`
 */
export const QuoteLogEventType = {
  // ============================================
  // CRÉATION ET STATUT
  // ============================================

  /**
   * Devis créé
   * - Enregistré à la création du Quote
   * - oldStatus: null
   * - newStatus: DRAFT
   * - metadata: { source: 'calculator' | 'dashboard' | 'prospect' }
   */
  CREATED: 'CREATED',

  /**
   * Changement de statut (workflow principal)
   * - Transitions: DRAFT → SENT → ACCEPTED → IN_TREATMENT → VALIDATED
   * - Ou rejet/annulation: * → REJECTED | CANCELLED | EXPIRED
   * - oldStatus: statut précédent
   * - newStatus: nouveau statut
   * - notes: obligatoire si newStatus = CANCELLED (raison d'annulation)
   */
  STATUS_CHANGED: 'STATUS_CHANGED',

  // ============================================
  // RATTACHEMENT COMPTE
  // ============================================

  /**
   * Devis rattaché à un compte utilisateur
   * - Déclenché lors de la connexion/création de compte d'un utilisateur
   * - Le devis était précédemment créé sans compte (localStorage ou prospect)
   * - metadata: { email: string, matchedBy: 'email' | 'localStorage' | 'prospect' }
   */
  ATTACHED_TO_ACCOUNT: 'ATTACHED_TO_ACCOUNT',

  // ============================================
  // WORKFLOW TRAITEMENT (Agent)
  // ============================================

  /**
   * Traitement démarré par un agent
   * - Passage au statut IN_TREATMENT
   * - changedById: ID de l'agent qui prend en charge
   * - metadata: { agentId: string, agentName: string }
   */
  TREATMENT_STARTED: 'TREATMENT_STARTED',

  /**
   * Traitement validé par l'agent
   * - Passage au statut VALIDATED
   * - Création de l'expédition associée
   * - metadata: { shipmentId: string, paymentMethod: string }
   */
  TREATMENT_VALIDATED: 'TREATMENT_VALIDATED',

  /**
   * Méthode de paiement définie
   * - Agent choisit CASH, ON_DELIVERY ou BANK_TRANSFER
   * - metadata: { paymentMethod: string }
   */
  PAYMENT_METHOD_SET: 'PAYMENT_METHOD_SET',

  /**
   * Paiement reçu
   * - Confirmation de réception du paiement
   * - changedById: ID de l'agent qui confirme
   * - metadata: { amount: number, currency: string }
   */
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',

  // ============================================
  // ACTIONS CLIENT
  // ============================================

  /**
   * Devis envoyé au client
   * - Passage au statut SENT
   * - metadata: { sentTo: string, sentAt: ISO8601 }
   */
  SENT_TO_CLIENT: 'SENT_TO_CLIENT',

  /**
   * Devis accepté par le client
   * - Passage au statut ACCEPTED
   * - metadata: { acceptedAt: ISO8601 }
   */
  ACCEPTED_BY_CLIENT: 'ACCEPTED_BY_CLIENT',

  /**
   * Devis rejeté par le client
   * - Passage au statut REJECTED
   * - notes: raison du rejet (optionnel)
   * - metadata: { rejectedAt: ISO8601, reason?: string }
   */
  REJECTED_BY_CLIENT: 'REJECTED_BY_CLIENT',

  // ============================================
  // ANNULATION ET EXPIRATION
  // ============================================

  /**
   * Devis annulé
   * - Passage au statut CANCELLED
   * - notes: raison de l'annulation (obligatoire)
   * - metadata: { cancelledAt: ISO8601, reason: string }
   */
  CANCELLED: 'CANCELLED',

  /**
   * Devis expiré automatiquement
   * - Passage au statut EXPIRED
   * - Déclenché par job cron ou système
   * - changedById: null (système)
   * - metadata: { expiredAt: ISO8601, validUntil: ISO8601 }
   */
  EXPIRED: 'EXPIRED',

  // ============================================
  // DOCUMENTS
  // ============================================

  /**
   * Document ajouté au devis
   * - Facture pro forma, conditions, etc.
   * - metadata: { documentId: string, documentType: string, fileName: string }
   */
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',

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
  // MODIFICATION GÉNÉRALE DU DEVIS
  // ============================================

  /**
   * Devis modifié (mise à jour des champs)
   * - Enregistre toute modification via le formulaire d'édition
   * - changedById: ID de l'utilisateur qui modifie
   * - metadata: {
   *     changedFields: string[],  // Liste des champs modifiés
   *     source: 'dashboard' | 'client-portal'
   *   }
   */
  UPDATED: 'UPDATED',

  // ============================================
  // MODIFICATIONS D'ADRESSES (Snapshot Pattern)
  // ============================================

  /**
   * Adresse modifiée (expéditeur ou destinataire)
   * - Enregistre toute modification d'adresse pour traçabilité
   * - Conforme RGPD/ISO (audit trail complet)
   * - Permet la résolution de litiges
   * - notes: description de la modification (ex: "Adresse expéditeur modifiée suite à appel client")
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
   *     reason?: string // Raison de la modification (optionnel)
   *   }
   *
   * @example
   * ```ts
   * await logQuoteAddressUpdated({
   *   quoteId: 'clxxx',
   *   changedById: agentId,
   *   addressType: 'destination',
   *   changedFields: ['address', 'city'],
   *   oldAddress: { address: '123 Rue A', city: 'Paris' },
   *   newAddress: { address: '456 Rue B', city: 'Lyon' },
   *   notes: 'Correction suite à appel client',
   * });
   * ```
   */
  ADDRESS_UPDATED: 'ADDRESS_UPDATED',

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
 * Type TypeScript pour les événements QuoteLog
 * Permet l'autocomplétion et la vérification de type
 */
export type QuoteLogEventType =
  (typeof QuoteLogEventType)[keyof typeof QuoteLogEventType];

/**
 * Vérifie si une valeur est un type d'événement valide
 *
 * @param value - Valeur à vérifier
 * @returns true si la valeur est un QuoteLogEventType valide
 *
 * @example
 * if (isQuoteLogEventType(eventType)) {
 *   // eventType est valide
 * }
 */
export function isQuoteLogEventType(
  value: unknown
): value is QuoteLogEventType {
  return (
    typeof value === 'string' &&
    Object.values(QuoteLogEventType).includes(value as QuoteLogEventType)
  );
}

/**
 * Liste de tous les types d'événements disponibles
 * Utile pour les validations, filtres, etc.
 */
export const ALL_QUOTE_LOG_EVENT_TYPES = Object.values(QuoteLogEventType);
