/**
 * Exports des enums Prisma pour compatibilité Turbopack/Next.js 16
 *
 * Ce fichier exporte directement les enums depuis le client Prisma généré.
 * Compatible ESM avec Next.js 16 et Turbopack.
 *
 * Les enums Prisma sont à la fois des valeurs et des types en TypeScript,
 * donc un seul export suffit pour les deux usages.
 *
 * Note: InvoiceStatus a été supprimé car les factures ne sont plus stockées
 * en base de données. Elles sont générées à la volée depuis les devis payés.
 *
 * @module lib/db/enums
 */

// Export direct ESM des enums depuis le client Prisma généré
// Les enums TypeScript servent à la fois de valeurs et de types
export {
  CargoType,
  TransportMode,
  QuoteStatus,
  ShipmentStatus,
  Priority,
  PickupStatus,
  PickupTimeSlot,
  ProspectStatus,
  NotificationType,
  DocumentType,
  UserRole,
  ClientType,
  PurchaseStatus,
  DeliveryMode,
} from '@/generated/prisma';
