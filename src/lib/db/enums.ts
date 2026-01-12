/**
 * Exports des enums Prisma pour compatibilité Turbopack/Next.js 16
 *
 * Ce fichier résout les problèmes d'interopérabilité entre CommonJS et ES Modules
 * en utilisant require() au lieu d'import, similaire à la technique utilisée dans client.ts
 *
 * @module lib/db/enums
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PrismaModule = require('@/generated/prisma');

/**
 * Enum pour les types de marchandise
 *
 * Valeurs possibles :
 * - GENERAL : Marchandise générale
 * - DANGEROUS : Marchandise dangereuse (nécessite certification)
 * - PERISHABLE : Denrées périssables (réfrigération requise)
 * - FRAGILE : Marchandise fragile (manipulation délicate)
 * - BULK : Vrac (liquide, granulés)
 * - CONTAINER : Conteneurs standardisés (20ft, 40ft)
 * - PALLETIZED : Palettisé
 * - OTHER : Autre type
 */
export const CargoType = PrismaModule.CargoType;

/**
 * Enum pour les modes de transport
 *
 * Valeurs possibles :
 * - ROAD : Transport routier
 * - SEA : Transport maritime
 * - AIR : Transport aérien
 * - RAIL : Transport ferroviaire
 */
export const TransportMode = PrismaModule.TransportMode;

/**
 * Enum pour le statut des devis
 *
 * Valeurs possibles :
 * - DRAFT : Brouillon (non envoyé)
 * - SENT : Envoyé au client
 * - ACCEPTED : Accepté par le client
 * - REJECTED : Rejeté par le client
 * - EXPIRED : Expiré (après date de validité)
 */
export const QuoteStatus = PrismaModule.QuoteStatus;

/**
 * Enum pour le statut des expéditions
 *
 * Valeurs possibles :
 * - DRAFT : Brouillon
 * - PENDING_APPROVAL : En attente d'approbation
 * - APPROVED : Approuvée
 * - PICKED_UP : Récupérée
 * - IN_TRANSIT : En transit
 * - AT_CUSTOMS : En douane
 * - CUSTOMS_CLEARED : Dédouanée
 * - OUT_FOR_DELIVERY : En cours de livraison
 * - READY_FOR_PICKUP : Prête pour récupération
 * - DELIVERED : Livrée
 * - CANCELLED : Annulée
 * - ON_HOLD : En attente
 * - EXCEPTION : Exception
 */
export const ShipmentStatus = PrismaModule.ShipmentStatus;

/**
 * Enum pour la priorité
 *
 * Valeurs possibles :
 * - STANDARD : Livraison standard
 * - EXPRESS : Livraison express (+30%)
 * - URGENT : Livraison urgente (+50%)
 */
export const Priority = PrismaModule.Priority;

/**
 * Enum pour le statut des demandes de collecte
 *
 * Valeurs possibles :
 * - REQUESTED : Demandée
 * - SCHEDULED : Planifiée
 * - IN_PROGRESS : En cours
 * - COMPLETED : Terminée
 * - CANCELED : Annulée
 */
export const PickupStatus = PrismaModule.PickupStatus;

/**
 * Enum pour les créneaux horaires de collecte
 *
 * Valeurs possibles :
 * - MORNING : Matin (8h-12h)
 * - AFTERNOON : Après-midi (12h-17h)
 * - EVENING : Soir (17h-20h)
 * - SPECIFIC_TIME : Heure précise
 * - FLEXIBLE : Flexible
 */
export const PickupTimeSlot = PrismaModule.PickupTimeSlot;

/**
 * Enum pour le statut des factures
 *
 * Valeurs possibles :
 * - DRAFT : Brouillon
 * - SENT : Envoyée
 * - VIEWED : Consultée
 * - PAID : Payée
 * - OVERDUE : En retard
 * - CANCELLED : Annulée
 */
export const InvoiceStatus = PrismaModule.InvoiceStatus;

/**
 * Enum pour le statut des prospects
 *
 * Valeurs possibles :
 * - PENDING : En attente
 * - CONVERTED : Converti en client
 * - EXPIRED : Expiré
 */
export const ProspectStatus = PrismaModule.ProspectStatus;

/**
 * Enum pour les types de notifications
 *
 * Valeurs possibles :
 * - INFO : Information
 * - WARNING : Avertissement
 * - ERROR : Erreur
 * - SUCCESS : Succès
 */
export const NotificationType = PrismaModule.NotificationType;

/**
 * Enum pour les types de documents
 *
 * Valeurs possibles :
 * - INVOICE : Facture
 * - QUOTE : Devis
 * - POD : Preuve de livraison
 * - CMR : Lettre de voiture
 * - CUSTOMS : Document de douane
 * - PACKING_LIST : Liste de colisage
 * - CERTIFICATE : Certificat
 * - OTHER : Autre
 */
export const DocumentType = PrismaModule.DocumentType;

/**
 * Enum pour les rôles utilisateur
 *
 * Valeurs possibles :
 * - ADMIN : Administrateur système (accès complet)
 * - OPERATIONS_MANAGER : Gestionnaire des opérations
 * - FINANCE_MANAGER : Gestionnaire financier
 * - CLIENT : Client externe
 * - VIEWER : Observateur (lecture seule)
 */
export const UserRole = PrismaModule.UserRole;

/**
 * Export de tous les enums pour import groupé
 *
 * @example
 * ```ts
 * import * as Enums from '@/lib/db/enums';
 *
 * const status = Enums.QuoteStatus.DRAFT;
 * ```
 */
export const Enums = {
  CargoType,
  TransportMode,
  QuoteStatus,
  ShipmentStatus,
  Priority,
  PickupStatus,
  PickupTimeSlot,
  InvoiceStatus,
  ProspectStatus,
  NotificationType,
  DocumentType,
  UserRole,
};

// Export des types TypeScript pour l'autocomplétion
export type {
  CargoType,
  TransportMode,
  QuoteStatus,
  ShipmentStatus,
  Priority,
  PickupStatus,
  PickupTimeSlot,
  InvoiceStatus,
  ProspectStatus,
  NotificationType,
  DocumentType,
  UserRole,
} from '@/generated/prisma';
