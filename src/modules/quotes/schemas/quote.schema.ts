/**
 * Schémas de validation : Devis (Quotes)
 *
 * Définition des schémas Zod pour valider les données
 * des devis (création, modification, recherche, acceptation/rejet)
 *
 * @module modules/quotes/schemas
 */

import { z } from 'zod';
import { QuoteStatus, CargoType, TransportMode } from '@/generated/prisma';

/**
 * Schéma de validation pour la création d'un devis
 *
 * Valide toutes les informations d'un devis :
 * - Informations du client
 * - Route (origine → destination)
 * - Détails de la marchandise (type, poids, volume)
 * - Modes de transport
 * - Coût estimé et validité
 */
export const quoteSchema = z.object({
  // === Informations du client ===
  companyId: z
    .string()
    .cuid('ID de compagnie invalide'),

  // === Route ===
  originCountry: z
    .string()
    .length(2, "Le code pays d'origine doit être au format ISO (2 lettres)")
    .regex(/^[A-Z]{2}$/, "Le code pays d'origine doit être en majuscules (ex: FR, US)"),

  destinationCountry: z
    .string()
    .length(2, 'Le code pays de destination doit être au format ISO (2 lettres)')
    .regex(/^[A-Z]{2}$/, 'Le code pays de destination doit être en majuscules (ex: FR, US)'),

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

  // === Transport ===
  transportMode: z
    .array(z.nativeEnum(TransportMode))
    .min(1, 'Au moins un mode de transport est requis')
    .max(4, 'Maximum 4 modes de transport'),

  // === Coût et validité ===
  estimatedCost: z
    .number()
    .positive('Le coût estimé doit être positif')
    .max(10000000, 'Le coût estimé ne peut pas dépasser 10 millions'),

  currency: z
    .string()
    .length(3, 'Le code devise doit être au format ISO (3 lettres)')
    .regex(/^[A-Z]{3}$/, 'Le code devise doit être en majuscules (ex: EUR, USD)')
    .default('EUR'),

  validUntil: z
    .string()
    .datetime('Date de validité invalide'),

  // === Statut (pour la création, toujours DRAFT) ===
  status: z
    .nativeEnum(QuoteStatus, {
      errorMap: () => ({ message: 'Statut invalide' }),
    })
    .default('DRAFT')
    .optional(),
});

/**
 * Type TypeScript inféré du schéma de création
 * Utilisé pour le typage dans les composants et actions
 */
export type QuoteFormData = z.infer<typeof quoteSchema>;

/**
 * Schéma pour la mise à jour d'un devis
 * Tous les champs sont optionnels
 */
export const quoteUpdateSchema = quoteSchema
  .partial()
  .extend({
    // Lors d'une mise à jour, on peut modifier le statut
    status: z.nativeEnum(QuoteStatus).optional(),

    // Dates d'acceptation/rejet (peuvent être définies lors de la mise à jour)
    acceptedAt: z.string().datetime().optional().nullable(),
    rejectedAt: z.string().datetime().optional().nullable(),
  });

/**
 * Type pour les mises à jour partielles
 */
export type QuoteUpdateData = z.infer<typeof quoteUpdateSchema>;

/**
 * Schéma pour la recherche/filtrage de devis
 */
export const quoteSearchSchema = z.object({
  // Recherche textuelle (numéro de devis)
  query: z.string().max(100).optional(),

  // Filtres par statut
  status: z.nativeEnum(QuoteStatus).optional(),

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

  // Filtrer les devis expirés
  expired: z.boolean().optional(),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),

  // Tri
  sortBy: z.enum(['createdAt', 'validUntil', 'estimatedCost', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Type pour les paramètres de recherche
 */
export type QuoteSearchParams = z.infer<typeof quoteSearchSchema>;

/**
 * Schéma pour accepter un devis
 */
export const quoteAcceptSchema = z.object({
  notes: z
    .string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .optional()
    .nullable(),
});

/**
 * Type pour l'acceptation d'un devis
 */
export type QuoteAcceptData = z.infer<typeof quoteAcceptSchema>;

/**
 * Schéma pour rejeter un devis
 */
export const quoteRejectSchema = z.object({
  reason: z
    .string()
    .min(10, 'La raison du rejet doit contenir au moins 10 caractères')
    .max(500, 'La raison du rejet ne peut pas dépasser 500 caractères'),
});

/**
 * Type pour le rejet d'un devis
 */
export type QuoteRejectData = z.infer<typeof quoteRejectSchema>;

/**
 * Schéma pour envoyer un devis à un client
 */
export const quoteSendSchema = z.object({
  email: z
    .string()
    .email('Email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères')
    .optional(), // Si non fourni, utiliser l'email de la compagnie

  message: z
    .string()
    .max(1000, 'Le message ne peut pas dépasser 1000 caractères')
    .optional()
    .nullable(),
});

/**
 * Type pour l'envoi d'un devis
 */
export type QuoteSendData = z.infer<typeof quoteSendSchema>;

/**
 * Helper pour vérifier si un devis est expiré
 */
export function isQuoteExpired(validUntil: Date): boolean {
  return new Date() > validUntil;
}

/**
 * Helper pour calculer le nombre de jours restants avant expiration
 */
export function daysUntilExpiration(validUntil: Date): number {
  const now = new Date();
  const diff = validUntil.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
