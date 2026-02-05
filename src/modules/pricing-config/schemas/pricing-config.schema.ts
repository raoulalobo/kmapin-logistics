/**
 * Schémas de validation Zod pour la configuration des prix
 *
 * Définit les schémas de validation pour:
 * - PricingConfig (configuration globale)
 * - CountryDistance (distances entre pays)
 * - Objets JSON (multiplicateurs, surcharges, délais)
 */

import { z } from 'zod';
import { CargoType, Priority, TransportMode } from '@/lib/db/enums';

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
 * Valeur entre -1 et 5 :
 *   - Négatif = réduction (ex: -0.1 = -10%, -1 = -100% = gratuit)
 *   - 0 = pas de surcharge
 *   - Positif = surcharge (ex: 0.5 = +50%, 5 = +500%)
 */
export const cargoTypeSurchargesSchema = z.object({
  GENERAL: z.number().min(-1).max(5),
  DANGEROUS: z.number().min(-1).max(5),
  PERISHABLE: z.number().min(-1).max(5),
  FRAGILE: z.number().min(-1).max(5),
  BULK: z.number().min(-1).max(5),
  CONTAINER: z.number().min(-1).max(5),
  PALLETIZED: z.number().min(-1).max(5),
  OTHER: z.number().min(-1).max(5),
});

/**
 * Schéma pour les surcharges de priorité
 * Valeur entre -1 et 5 :
 *   - Négatif = réduction (ex: -0.1 = -10%)
 *   - 0 = pas de surcharge
 *   - Positif = surcharge (ex: 0.5 = +50%)
 * Coefficients multiplicateurs : ex: NORMAL: 0.1 = +10%
 */
export const prioritySurchargesSchema = z.object({
  STANDARD: z.number().min(-1).max(5),
  NORMAL: z.number().min(-1).max(5),   // Priorité normale (+10% dans le PDF)
  EXPRESS: z.number().min(-1).max(5),
  URGENT: z.number().min(-1).max(5),
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
 * Schéma pour les ratios de conversion du poids volumétrique
 * Définit combien de kg équivaut 1 m³ pour chaque mode de transport
 *
 * Exemples de valeurs (basées sur le PDF) :
 * - AIR: 167 kg/m³  (ratio 1/6 = 6000)
 * - ROAD: 333 kg/m³ (ratio 1/3 = 5000)
 * - SEA: 1 kg/m³    (ratio 1/1 = 1000, utilisé pour Unité Payante)
 * - RAIL: 250 kg/m³
 */
export const volumetricWeightRatiosSchema = z.object({
  AIR: z.number().positive().min(1).max(1000),
  ROAD: z.number().positive().min(1).max(1000),
  SEA: z.number().positive().min(0.1).max(1000),
  RAIL: z.number().positive().min(1).max(1000),
});

/**
 * Schéma pour l'activation du poids volumétrique par mode
 * Permet d'activer/désactiver le calcul de poids volumétrique pour chaque mode
 *
 * Exemples :
 * - AIR: true  → Utilise le poids volumétrique
 * - ROAD: true → Utilise le poids volumétrique
 * - SEA: false → Maritime utilise "Poids ou Mesure" (Unité Payante)
 * - RAIL: true → Utilise le poids volumétrique
 */
export const useVolumetricWeightPerModeSchema = z.object({
  AIR: z.boolean(),
  ROAD: z.boolean(),
  SEA: z.boolean(),
  RAIL: z.boolean(),
});

/**
 * Schéma complet pour la configuration des prix
 * Utilisé pour la création et la mise à jour complète
 */
export const pricingConfigSchema = z.object({
  baseRatePerKg: z.number().positive().min(0.01).max(100),
  defaultRatePerKg: z.number().positive().min(0.01).max(100),
  defaultRatePerM3: z.number().positive().min(1).max(10000),
  transportMultipliers: transportMultipliersSchema,
  cargoTypeSurcharges: cargoTypeSurchargesSchema,
  prioritySurcharges: prioritySurchargesSchema,
  deliverySpeedsPerMode: deliverySpeedsPerModeSchema,
  volumetricWeightRatios: volumetricWeightRatiosSchema,
  useVolumetricWeightPerMode: useVolumetricWeightPerModeSchema,
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
export type VolumetricWeightRatios = z.infer<typeof volumetricWeightRatiosSchema>;
export type UseVolumetricWeightPerMode = z.infer<typeof useVolumetricWeightPerModeSchema>;
