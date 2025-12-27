/**
 * Schémas de validation : TransportRate (Tarifs de Transport)
 *
 * Définition des schémas Zod pour valider les données des tarifs
 * de transport par route (origine, destination, mode).
 *
 * @module modules/transport-rates/schemas
 */

import { z } from 'zod';
import { TransportMode } from '@/generated/prisma';

/**
 * Schéma de validation pour les surcharges cargo (JSON)
 * Identique à celui de PricingConfig pour cohérence
 */
export const cargoTypeSurchargesSchema = z
  .object({
    GENERAL: z.number().min(-5).max(5),
    DANGEROUS: z.number().min(-5).max(5),
    PERISHABLE: z.number().min(-5).max(5),
    FRAGILE: z.number().min(-5).max(5),
    BULK: z.number().min(-5).max(5),
    CONTAINER: z.number().min(-5).max(5),
    PALLETIZED: z.number().min(-5).max(5),
    OTHER: z.number().min(-5).max(5),
  })
  .optional();

/**
 * Schéma de validation pour les surcharges priorité (JSON)
 */
export const prioritySurchargesSchema = z
  .object({
    STANDARD: z.number().min(-5).max(5),
    EXPRESS: z.number().min(-5).max(5),
    URGENT: z.number().min(-5).max(5),
  })
  .optional();

/**
 * Schéma de création d'un tarif de transport
 *
 * Valide tous les champs requis pour créer une route tarifaire :
 * - Codes pays origine et destination (ISO 3166-1 alpha-2)
 * - Mode de transport (ROAD, SEA, AIR, RAIL)
 * - Tarifs au kg et au m³
 * - Surcharges optionnelles personnalisées
 */
export const createTransportRateSchema = z
  .object({
    originCountryCode: z
      .string()
      .length(2, 'Le code pays doit être au format ISO (2 lettres)')
      .regex(/^[A-Z]{2}$/, 'Le code pays doit être en majuscules (ex: FR, DE)')
      .toUpperCase(),

    destinationCountryCode: z
      .string()
      .length(2, 'Le code pays doit être au format ISO (2 lettres)')
      .regex(/^[A-Z]{2}$/, 'Le code pays doit être en majuscules (ex: FR, DE)')
      .toUpperCase(),

    transportMode: z.nativeEnum(TransportMode, {
      errorMap: () => ({ message: 'Mode de transport invalide' }),
    }),

    ratePerKg: z
      .number({
        required_error: 'Le tarif par kg est requis',
        invalid_type_error: 'Le tarif par kg doit être un nombre',
      })
      .positive('Le tarif par kg doit être positif')
      .min(0.01, 'Le tarif minimum est 0.01 €/kg')
      .max(1000, 'Le tarif maximum est 1000 €/kg'),

    ratePerM3: z
      .number({
        required_error: 'Le tarif par m³ est requis',
        invalid_type_error: 'Le tarif par m³ doit être un nombre',
      })
      .positive('Le tarif par m³ doit être positif')
      .min(0.01, 'Le tarif minimum est 0.01 €/m³')
      .max(100000, 'Le tarif maximum est 100000 €/m³'),

    cargoTypeSurcharges: cargoTypeSurchargesSchema,
    prioritySurcharges: prioritySurchargesSchema,

    isActive: z.boolean().default(true),
    notes: z.string().max(500, 'Les notes ne peuvent pas dépasser 500 caractères').optional(),
  })
  .refine((data) => data.originCountryCode !== data.destinationCountryCode, {
    message: "Le pays d'origine et de destination doivent être différents",
    path: ['destinationCountryCode'],
  });

/**
 * Schéma de mise à jour d'un tarif de transport
 * Tous les champs sont optionnels sauf la clé (origin, destination, mode)
 */
export const updateTransportRateSchema = z.object({
  ratePerKg: z.number().positive().min(0.01).max(1000).optional(),
  ratePerM3: z.number().positive().min(0.01).max(100000).optional(),
  cargoTypeSurcharges: cargoTypeSurchargesSchema,
  prioritySurcharges: prioritySurchargesSchema,
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Schéma pour filtrer les tarifs
 * Tous les critères sont optionnels
 */
export const filterTransportRatesSchema = z.object({
  originCountryCode: z.string().length(2).toUpperCase().optional(),
  destinationCountryCode: z.string().length(2).toUpperCase().optional(),
  transportMode: z.nativeEnum(TransportMode).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Types TypeScript exportés
 */
export type CreateTransportRateInput = z.infer<typeof createTransportRateSchema>;
export type UpdateTransportRateInput = z.infer<typeof updateTransportRateSchema>;
export type FilterTransportRatesInput = z.infer<typeof filterTransportRatesSchema>;
