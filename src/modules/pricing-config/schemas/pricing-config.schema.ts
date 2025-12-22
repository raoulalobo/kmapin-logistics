/**
 * Schémas de validation Zod pour la configuration des prix
 *
 * Définit les schémas de validation pour:
 * - PricingConfig (configuration globale)
 * - CountryDistance (distances entre pays)
 * - Objets JSON (multiplicateurs, surcharges, délais)
 */

import { z } from 'zod';
import { CargoType, Priority, TransportMode } from '@/generated/prisma';

/**
 * Schéma pour les multiplicateurs de transport
 * Chaque mode doit avoir un multiplicateur > 0
 */
export const transportMultipliersSchema = z.object({
  ROAD: z.number().positive().min(0.1).max(10),
  SEA: z.number().positive().min(0.1).max(10),
  AIR: z.number().positive().min(0.1).max(10),
  RAIL: z.number().positive().min(0.1).max(10),
});

/**
 * Schéma pour les surcharges de cargo
 * Valeur >= 0 (0 = pas de surcharge)
 */
export const cargoTypeSurchargesSchema = z.object({
  GENERAL: z.number().nonnegative().max(5),
  DANGEROUS: z.number().nonnegative().max(5),
  PERISHABLE: z.number().nonnegative().max(5),
  FRAGILE: z.number().nonnegative().max(5),
  BULK: z.number().nonnegative().max(5),
  CONTAINER: z.number().nonnegative().max(5),
  PALLETIZED: z.number().nonnegative().max(5),
  OTHER: z.number().nonnegative().max(5),
});

/**
 * Schéma pour les surcharges de priorité
 * Valeur >= 0 (0 = pas de surcharge)
 */
export const prioritySurchargesSchema = z.object({
  STANDARD: z.number().nonnegative().max(5),
  EXPRESS: z.number().nonnegative().max(5),
  URGENT: z.number().nonnegative().max(5),
});

/**
 * Schéma pour les délais de livraison d'un mode
 */
const deliverySpeedSchema = z.object({
  min: z.number().int().positive().min(1).max(365),
  max: z.number().int().positive().min(1).max(365),
}).refine(
  (data) => data.max >= data.min,
  { message: 'Le délai maximum doit être supérieur ou égal au délai minimum' }
);

/**
 * Schéma pour les délais de livraison par mode
 */
export const deliverySpeedsPerModeSchema = z.object({
  ROAD: deliverySpeedSchema,
  SEA: deliverySpeedSchema,
  AIR: deliverySpeedSchema,
  RAIL: deliverySpeedSchema,
});

/**
 * Schéma complet pour la configuration des prix
 * Utilisé pour la création et la mise à jour complète
 */
export const pricingConfigSchema = z.object({
  baseRatePerKg: z.number().positive().min(0.01).max(100),
  transportMultipliers: transportMultipliersSchema,
  cargoTypeSurcharges: cargoTypeSurchargesSchema,
  prioritySurcharges: prioritySurchargesSchema,
  deliverySpeedsPerMode: deliverySpeedsPerModeSchema,
});

/**
 * Schéma pour la mise à jour partielle de la configuration
 * Tous les champs sont optionnels
 */
export const updatePricingConfigSchema = pricingConfigSchema.partial();

/**
 * Schéma pour une distance entre pays
 */
export const countryDistanceSchema = z.object({
  originCountry: z.string().min(2).max(2).toUpperCase(),
  destinationCountry: z.string().min(2).max(2).toUpperCase(),
  distanceKm: z.number().int().positive().min(1).max(50000),
}).refine(
  (data) => data.originCountry !== data.destinationCountry,
  { message: 'Le pays d\'origine et de destination doivent être différents' }
);

/**
 * Schéma pour la mise à jour d'une distance
 */
export const updateCountryDistanceSchema = z.object({
  distanceKm: z.number().int().positive().min(1).max(50000),
});

/**
 * Types TypeScript inférés des schémas
 */
export type PricingConfigInput = z.infer<typeof pricingConfigSchema>;
export type UpdatePricingConfigInput = z.infer<typeof updatePricingConfigSchema>;
export type CountryDistanceInput = z.infer<typeof countryDistanceSchema>;
export type UpdateCountryDistanceInput = z.infer<typeof updateCountryDistanceSchema>;
export type TransportMultipliers = z.infer<typeof transportMultipliersSchema>;
export type CargoTypeSurcharges = z.infer<typeof cargoTypeSurchargesSchema>;
export type PrioritySurcharges = z.infer<typeof prioritySurchargesSchema>;
export type DeliverySpeedsPerMode = z.infer<typeof deliverySpeedsPerModeSchema>;
