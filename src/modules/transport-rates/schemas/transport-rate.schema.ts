/**
 * Schémas de validation : TransportRate (Tarifs de Transport)
 *
 * Définition des schémas Zod pour valider les données des tarifs
 * de transport par route (origine, destination, mode).
 *
 * @module modules/transport-rates/schemas
 */

import { z } from 'zod';
import { TransportMode } from '@/lib/db/enums';

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
    NORMAL: z.number().min(-5).max(5),
    URGENT: z.number().min(-5).max(5),
  })
  .optional();

/**
 * Schéma de création d'un tarif de transport
 *
 * Valide tous les champs requis pour créer une route tarifaire :
 * - Codes pays origine et destination (ISO 3166-1 alpha-2)
 * - Mode de transport (ROAD, SEA, AIR)
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

    // 0 est accepté comme valeur sentinelle pour le champ inutilisé selon le mode.
    // Ex : ROAD/AIR → ratePerM3 = 0 (non-maritime, pas de tarif volumétrique)
    //      SEA      → ratePerKg  = 0 (maritime, calcul uniquement en €/UP)
    // Le refine ci-dessous valide que le champ pertinent au mode est >= 0.01.
    ratePerKg: z
      .number({
        required_error: 'Le tarif par kg est requis',
        invalid_type_error: 'Le tarif par kg doit être un nombre',
      })
      .min(0, 'Le tarif par kg ne peut pas être négatif')
      .max(1000, 'Le tarif maximum est 1000 €/kg'),

    // Utilisé uniquement pour le mode maritime (SEA) — Unité Payante (€/UP)
    // Vaut 0 pour les modes ROAD/AIR (valeur sentinelle non-nullable en DB)
    ratePerM3: z
      .number({
        required_error: 'Le tarif par m³ est requis',
        invalid_type_error: 'Le tarif par m³ doit être un nombre',
      })
      .min(0, 'Le tarif par m³ ne peut pas être négatif')
      .max(100000, 'Le tarif maximum est 100000 €/m³'),

    cargoTypeSurcharges: cargoTypeSurchargesSchema,
    prioritySurcharges: prioritySurchargesSchema,

    isActive: z.boolean().default(true),
    notes: z.string().max(500, 'Les notes ne peuvent pas dépasser 500 caractères').optional(),
  })
  .refine((data) => data.originCountryCode !== data.destinationCountryCode, {
    message: "Le pays d'origine et de destination doivent être différents",
    path: ['destinationCountryCode'],
  })
  // Règle : mode SEA exige ratePerM3, les autres modes exigent ratePerKg
  .refine(
    (data) => {
      if (data.transportMode === 'SEA') return data.ratePerM3 !== undefined && data.ratePerM3 >= 0.01;
      return data.ratePerKg !== undefined && data.ratePerKg >= 0.01;
    },
    (data) => ({
      message:
        data.transportMode === 'SEA'
          ? 'Le tarif par m³ (€/UP) est requis pour le mode maritime'
          : 'Le tarif par kg (€/kg) est requis pour ce mode de transport',
      path: data.transportMode === 'SEA' ? ['ratePerM3'] : ['ratePerKg'],
    })
  );

/**
 * Schéma de mise à jour d'un tarif de transport
 * Tous les champs sont optionnels sauf la clé (origin, destination, mode)
 */
export const updateTransportRateSchema = z.object({
  ratePerKg: z.number().min(0.01).max(1000).optional(),
  ratePerM3: z.number().min(0.01).max(100000).optional(),
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
