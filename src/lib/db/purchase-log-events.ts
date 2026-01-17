/**
 * Types d'événements pour le modèle PurchaseLog
 *
 * Utilisé pour tracer tous les événements importants dans le cycle de vie
 * d'une demande d'achat délégué.
 *
 * Architecture Event Sourcing Léger :
 * Chaque événement représente un changement significatif d'état ou d'action
 * permettant de reconstituer l'historique complet de la demande.
 */

/**
 * Types d'événements PurchaseLog
 *
 * Ces constantes sont stockées dans le champ `eventType` de la table `purchase_log`
 */
export const PurchaseLogEventType = {
  // ============================================
  // CRÉATION ET STATUT
  // ============================================

  /**
   * Demande d'achat créée
   * - Enregistré à la création de la PurchaseRequest
   * - oldStatus: null
   * - newStatus: NOUVEAU
   */
  CREATED: 'CREATED',

  /**
   * Changement de statut (workflow principal)
   * - Transitions: NOUVEAU → EN_COURS → LIVRE
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
  // COÛTS ET FINANCES
  // ============================================

  /**
   * Mise à jour des coûts réels de l'achat
   * - Enregistrement du coût produit, frais de livraison, frais de service
   * - metadata: { actualProductCost, deliveryCost, serviceFee, totalCost }
   */
  COSTS_UPDATED: 'COSTS_UPDATED',

  // ============================================
  // DOCUMENTS
  // ============================================

  /**
   * Document ajouté à la demande
   * - Preuve d'achat, facture fournisseur, photo du produit, etc.
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
 * Type TypeScript pour les événements PurchaseLog
 * Permet l'autocomplétion et la vérification de type
 */
export type PurchaseLogEventType =
  (typeof PurchaseLogEventType)[keyof typeof PurchaseLogEventType];

/**
 * Vérifie si une valeur est un type d'événement valide
 *
 * @param value - Valeur à vérifier
 * @returns true si la valeur est un PurchaseLogEventType valide
 *
 * @example
 * if (isPurchaseLogEventType(eventType)) {
 *   // eventType est valide
 * }
 */
export function isPurchaseLogEventType(
  value: unknown
): value is PurchaseLogEventType {
  return (
    typeof value === 'string' &&
    Object.values(PurchaseLogEventType).includes(value as PurchaseLogEventType)
  );
}

/**
 * Liste de tous les types d'événements disponibles
 * Utile pour les validations, filtres, etc.
 */
export const ALL_PURCHASE_LOG_EVENT_TYPES = Object.values(PurchaseLogEventType);
