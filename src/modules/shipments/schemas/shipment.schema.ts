/**
 * Schémas de validation : Expéditions (Shipments)
 *
 * Définition des schémas Zod pour valider les données
 * des expéditions (création, modification, recherche)
 *
 * @module modules/shipments/schemas
 */

import { z } from 'zod';
import {
  CargoType,
  TransportMode,
  Priority,
  ShipmentStatus,
} from '@/generated/prisma';

/**
 * Schéma de validation pour la création d'une expédition
 *
 * Valide toutes les informations d'une expédition :
 * - Informations d'origine et de destination
 * - Détails de la marchandise (type, poids, volume)
 * - Modes de transport et priorité
 * - Dates de collecte et livraison
 * - Informations de coût
 */
export const shipmentSchema = z.object({
  // === Informations du client ===
  companyId: z
    .string()
    .cuid('ID de compagnie invalide'),

  // === Origine ===
  originAddress: z
    .string()
    .min(5, "L'adresse d'origine doit contenir au moins 5 caractères")
    .max(200, "L'adresse d'origine ne peut pas dépasser 200 caractères"),

  originCity: z
    .string()
    .min(2, "La ville d'origine doit contenir au moins 2 caractères")
    .max(100, "La ville d'origine ne peut pas dépasser 100 caractères"),

  originPostalCode: z
    .string()
    .regex(/^[\d\w\s\-]+$/, "Code postal d'origine invalide")
    .min(2, "Le code postal d'origine doit contenir au moins 2 caractères")
    .max(20, "Le code postal d'origine ne peut pas dépasser 20 caractères"),

  originCountry: z
    .string()
    .length(2, "Le code pays d'origine doit être au format ISO (2 lettres)")
    .regex(/^[A-Z]{2}$/, "Le code pays d'origine doit être en majuscules (ex: FR, US)"),

  originContact: z
    .string()
    .min(2, 'Le nom du contact doit contenir au moins 2 caractères')
    .max(100, 'Le nom du contact ne peut pas dépasser 100 caractères')
    .optional()
    .nullable(),

  originPhone: z
    .string()
    .regex(
      /^[\d\s\+\-\(\)]+$/,
      'Le numéro de téléphone contient des caractères invalides'
    )
    .min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres')
    .max(20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères')
    .optional()
    .nullable(),

  // === Destination ===
  destinationAddress: z
    .string()
    .min(5, 'L\'adresse de destination doit contenir au moins 5 caractères')
    .max(200, 'L\'adresse de destination ne peut pas dépasser 200 caractères'),

  destinationCity: z
    .string()
    .min(2, 'La ville de destination doit contenir au moins 2 caractères')
    .max(100, 'La ville de destination ne peut pas dépasser 100 caractères'),

  destinationPostalCode: z
    .string()
    .regex(/^[\d\w\s\-]+$/, 'Code postal de destination invalide')
    .min(2, 'Le code postal de destination doit contenir au moins 2 caractères')
    .max(20, 'Le code postal de destination ne peut pas dépasser 20 caractères'),

  destinationCountry: z
    .string()
    .length(2, 'Le code pays de destination doit être au format ISO (2 lettres)')
    .regex(/^[A-Z]{2}$/, 'Le code pays de destination doit être en majuscules (ex: FR, US)'),

  destinationContact: z
    .string()
    .min(2, 'Le nom du contact doit contenir au moins 2 caractères')
    .max(100, 'Le nom du contact ne peut pas dépasser 100 caractères')
    .optional()
    .nullable(),

  destinationPhone: z
    .string()
    .regex(
      /^[\d\s\+\-\(\)]+$/,
      'Le numéro de téléphone contient des caractères invalides'
    )
    .min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres')
    .max(20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères')
    .optional()
    .nullable(),

  // === Informations de la marchandise ===
  cargoType: z.nativeEnum(CargoType, {
    errorMap: () => ({ message: 'Type de marchandise invalide' }),
  }),

  weight: z
    .number()
    .positive('Le poids doit être positif')
    .max(100000, 'Le poids ne peut pas dépasser 100 tonnes'),

  volume: z
    .number()
    .positive('Le volume doit être positif')
    .max(10000, 'Le volume ne peut pas dépasser 10000 m³')
    .optional()
    .nullable(),

  // === Dimensions (pour calcul automatique du coût) ===
  length: z
    .number()
    .nonnegative('La longueur doit être positive ou nulle')
    .max(10000, 'La longueur ne peut pas dépasser 10000 centimètres (100 mètres)')
    .optional()
    .nullable(),

  width: z
    .number()
    .nonnegative('La largeur doit être positive ou nulle')
    .max(10000, 'La largeur ne peut pas dépasser 10000 centimètres (100 mètres)')
    .optional()
    .nullable(),

  height: z
    .number()
    .nonnegative('La hauteur doit être positive ou nulle')
    .max(10000, 'La hauteur ne peut pas dépasser 10000 centimètres (100 mètres)')
    .optional()
    .nullable(),

  packageCount: z
    .number()
    .int('Le nombre de colis doit être un entier')
    .positive('Le nombre de colis doit être positif')
    .max(10000, 'Le nombre de colis ne peut pas dépasser 10000'),

  value: z
    .number()
    .nonnegative('La valeur ne peut pas être négative')
    .max(10000000, 'La valeur ne peut pas dépasser 10 millions')
    .optional()
    .nullable(),

  currency: z
    .string()
    .length(3, 'Le code devise doit être au format ISO (3 lettres)')
    .regex(/^[A-Z]{3}$/, 'Le code devise doit être en majuscules (ex: EUR, USD)')
    .default('EUR'),

  description: z
    .string()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(1000, 'La description ne peut pas dépasser 1000 caractères'),

  specialInstructions: z
    .string()
    .max(500, 'Les instructions spéciales ne peuvent pas dépasser 500 caractères')
    .optional()
    .nullable(),

  isDangerous: z.boolean().default(false),

  isFragile: z.boolean().default(false),

  // === Transport et priorité ===
  transportMode: z
    .array(z.nativeEnum(TransportMode))
    .min(1, 'Au moins un mode de transport est requis')
    .max(4, 'Maximum 4 modes de transport'),

  priority: z
    .nativeEnum(Priority, {
      errorMap: () => ({ message: 'Priorité invalide' }),
    })
    .default('STANDARD'),

  // === Dates ===
  requestedPickupDate: z
    .string()
    .datetime('Date de collecte invalide')
    .optional()
    .nullable(),

  estimatedDeliveryDate: z
    .string()
    .datetime('Date de livraison estimée invalide')
    .optional()
    .nullable(),

  // === Coûts ===
  estimatedCost: z
    .number()
    .nonnegative('Le coût estimé ne peut pas être négatif')
    .optional()
    .nullable(),

  // === Statut (pour la création, toujours DRAFT) ===
  status: z
    .nativeEnum(ShipmentStatus, {
      errorMap: () => ({ message: 'Statut invalide' }),
    })
    .default('DRAFT')
    .optional(),
});

/**
 * Type TypeScript inféré du schéma de création
 * Utilisé pour le typage dans les composants et actions
 */
export type ShipmentFormData = z.infer<typeof shipmentSchema>;

/**
 * Schéma pour la mise à jour d'une expédition
 * Tous les champs sont optionnels sauf ceux requis pour l'intégrité
 */
export const shipmentUpdateSchema = shipmentSchema
  .partial()
  .extend({
    // Lors d'une mise à jour, on peut modifier le statut
    status: z.nativeEnum(ShipmentStatus).optional(),

    // Dates de collecte et livraison réelles (peuvent être définies lors de la mise à jour)
    actualPickupDate: z.string().datetime().optional().nullable(),
    actualDeliveryDate: z.string().datetime().optional().nullable(),

    // Coût réel (peut être défini lors de la mise à jour)
    actualCost: z.number().nonnegative().optional().nullable(),

    // Facture associée (peut être liée lors de la mise à jour)
    invoiceId: z.string().cuid().optional().nullable(),
  });

/**
 * Type pour les mises à jour partielles
 */
export type ShipmentUpdateData = z.infer<typeof shipmentUpdateSchema>;

/**
 * Schéma pour la recherche/filtrage d'expéditions
 */
export const shipmentSearchSchema = z.object({
  // Recherche textuelle
  query: z.string().max(100).optional(),

  // Filtres par statut
  status: z.nativeEnum(ShipmentStatus).optional(),

  // Filtres par compagnie
  companyId: z.string().cuid().optional(),

  // Filtres par dates
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  // Filtres par pays
  originCountry: z.string().length(2).optional(),
  destinationCountry: z.string().length(2).optional(),

  // Filtres par transport
  transportMode: z.nativeEnum(TransportMode).optional(),
  cargoType: z.nativeEnum(CargoType).optional(),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),

  // Tri
  sortBy: z.enum(['createdAt', 'status', 'estimatedDeliveryDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Type pour les paramètres de recherche
 */
export type ShipmentSearchParams = z.infer<typeof shipmentSearchSchema>;

/**
 * Schéma pour la mise à jour du statut d'une expédition
 * Utilisé pour les transitions d'état (ex: approuver, livrer, annuler)
 */
export const shipmentStatusUpdateSchema = z.object({
  status: z.nativeEnum(ShipmentStatus, {
    errorMap: () => ({ message: 'Statut invalide' }),
  }),
  notes: z
    .string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .optional(),
});

/**
 * Type pour la mise à jour du statut
 */
export type ShipmentStatusUpdate = z.infer<typeof shipmentStatusUpdateSchema>;
