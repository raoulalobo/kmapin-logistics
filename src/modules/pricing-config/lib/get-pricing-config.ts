/**
 * Utilitaires pour récupérer la configuration des prix
 *
 * Fournit des fonctions cachées pour récupérer la configuration avec fallback aux valeurs par défaut.
 * Utilise le cache Next.js pour optimiser les performances.
 */

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db/client';
import type {
  TransportMultipliers,
  CargoTypeSurcharges,
  PrioritySurcharges,
  DeliverySpeedsPerMode,
  VolumetricWeightRatios,
  UseVolumetricWeightPerMode,
} from '../schemas/pricing-config.schema';

/**
 * Valeurs par défaut pour la configuration des prix
 * Utilisées si aucune configuration n'existe en base de données
 *
 * Basées sur les spécifications du document "calculs.pdf"
 */
export const DEFAULT_PRICING_CONFIG = {
  baseRatePerKg: 0.5,           // ANCIEN (conservé pour compatibilité)
  defaultRatePerKg: 1.0,        // NOUVEAU : Tarif par défaut pour fallback
  defaultRatePerM3: 200.0,      // NOUVEAU : Tarif par défaut pour fallback
  transportMultipliers: {
    ROAD: 1.0,
    SEA: 0.6,
    AIR: 3.0,
    RAIL: 0.8,
  } as TransportMultipliers,
  cargoTypeSurcharges: {
    GENERAL: 0,
    DANGEROUS: 0.5,    // +50%
    PERISHABLE: 0.4,   // +40%
    FRAGILE: 0.3,      // +30%
    BULK: -0.1,        // -10%
    CONTAINER: 0.2,    // +20%
    PALLETIZED: 0.15,  // +15%
    OTHER: 0.1,        // +10%
  } as CargoTypeSurcharges,
  prioritySurcharges: {
    STANDARD: 0,       // +0% (coefficient 1.0)
    NORMAL: 0.1,       // +10% (coefficient 1.1)
    EXPRESS: 0.5,      // +50% (coefficient 1.5)
    URGENT: 0.3,       // +30% (coefficient 1.3)
  } as PrioritySurcharges,
  deliverySpeedsPerMode: {
    ROAD: { min: 3, max: 7 },
    SEA: { min: 20, max: 45 },
    AIR: { min: 1, max: 3 },
    RAIL: { min: 7, max: 14 },
  } as DeliverySpeedsPerMode,
  /**
   * NOUVEAU : Ratios de conversion du poids volumétrique
   * Basés sur les spécifications du PDF :
   * - AIR: 167 kg/m³  (ratio 1/6 = 6000)
   * - ROAD: 333 kg/m³ (ratio 1/3 = 5000)
   * - SEA: 1 kg/m³    (ratio 1/1 = 1000)
   * - RAIL: 250 kg/m³ (estimation)
   */
  volumetricWeightRatios: {
    AIR: 167,
    ROAD: 333,
    SEA: 1,
    RAIL: 250,
  } as VolumetricWeightRatios,
  /**
   * NOUVEAU : Activation du poids volumétrique par mode
   * Maritime (SEA) n'utilise PAS le poids volumétrique car il utilise
   * le système "Poids ou Mesure" (Unité Payante) selon le PDF
   */
  useVolumetricWeightPerMode: {
    AIR: true,
    ROAD: true,
    SEA: false,  // Maritime utilise "Poids ou Mesure" (Unité Payante)
    RAIL: true,
  } as UseVolumetricWeightPerMode,
} as const;

/**
 * Type pour la configuration complète
 */
export interface PricingConfigData {
  baseRatePerKg: number;                        // ANCIEN (conservé)
  defaultRatePerKg: number;                     // NOUVEAU : Tarif par défaut €/kg
  defaultRatePerM3: number;                     // NOUVEAU : Tarif par défaut €/m³
  transportMultipliers: TransportMultipliers;
  cargoTypeSurcharges: CargoTypeSurcharges;
  prioritySurcharges: PrioritySurcharges;
  deliverySpeedsPerMode: DeliverySpeedsPerMode;
  volumetricWeightRatios: VolumetricWeightRatios;               // NOUVEAU
  useVolumetricWeightPerMode: UseVolumetricWeightPerMode;       // NOUVEAU
}

/**
 * Récupère la configuration des prix depuis la base de données
 * Utilise un cache Next.js avec revalidation toutes les heures
 * Fallback aux valeurs par défaut si aucune configuration n'existe
 *
 * @returns La configuration des prix (depuis DB ou valeurs par défaut)
 */
export const getPricingConfig = unstable_cache(
  async (): Promise<PricingConfigData> => {
    try {
      // Récupérer la première configuration (singleton)
      const config = await prisma.pricingConfig.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!config) {
        console.log('[getPricingConfig] Aucune configuration trouvée, utilisation des valeurs par défaut');
        return DEFAULT_PRICING_CONFIG;
      }

      // Convertir les champs JSON en types TypeScript
      return {
        baseRatePerKg: config.baseRatePerKg,
        defaultRatePerKg: config.defaultRatePerKg,
        defaultRatePerM3: config.defaultRatePerM3,
        transportMultipliers: config.transportMultipliers as TransportMultipliers,
        cargoTypeSurcharges: config.cargoTypeSurcharges as CargoTypeSurcharges,
        prioritySurcharges: config.prioritySurcharges as PrioritySurcharges,
        deliverySpeedsPerMode: config.deliverySpeedsPerMode as DeliverySpeedsPerMode,
        volumetricWeightRatios: config.volumetricWeightRatios as VolumetricWeightRatios,
        useVolumetricWeightPerMode: config.useVolumetricWeightPerMode as UseVolumetricWeightPerMode,
      };
    } catch (error) {
      console.error('[getPricingConfig] Erreur lors de la récupération de la configuration:', error);
      // En cas d'erreur, utiliser les valeurs par défaut
      return DEFAULT_PRICING_CONFIG;
    }
  },
  ['pricing-config'],
  {
    revalidate: 3600, // Cache pendant 1 heure
    tags: ['pricing-config'],
  }
);

/**
 * Distances par défaut entre pays (en km)
 * Utilisées si aucune distance n'est configurée en base de données
 */
export const DEFAULT_COUNTRY_DISTANCES: Record<string, Record<string, number>> = {
  FR: { DE: 800, ES: 1000, IT: 1100, BE: 300, NL: 500, GB: 450, PL: 1500, CN: 8200, US: 6200, IN: 7000 },
  DE: { FR: 800, ES: 1800, IT: 1200, BE: 700, NL: 600, GB: 900, PL: 600, CN: 7500, US: 6500, IN: 6500 },
  ES: { FR: 1000, DE: 1800, IT: 1400, BE: 1300, NL: 1500, GB: 1300, PL: 2500, CN: 10500, US: 6500, IN: 8500 },
  IT: { FR: 1100, DE: 1200, ES: 1400, BE: 1200, NL: 1300, GB: 1600, PL: 1300, CN: 8000, US: 7000, IN: 6000 },
  BE: { FR: 300, DE: 700, ES: 1300, IT: 1200, NL: 200, GB: 400, PL: 1200, CN: 8000, US: 6200, IN: 7200 },
  NL: { FR: 500, DE: 600, ES: 1500, IT: 1300, BE: 200, GB: 500, PL: 1100, CN: 7800, US: 6000, IN: 7000 },
  GB: { FR: 450, DE: 900, ES: 1300, IT: 1600, BE: 400, NL: 500, PL: 1700, CN: 8500, US: 5500, IN: 7500 },
  PL: { FR: 1500, DE: 600, ES: 2500, IT: 1300, BE: 1200, NL: 1100, GB: 1700, CN: 7000, US: 7500, IN: 6000 },
  CN: { FR: 8200, DE: 7500, ES: 10500, IT: 8000, BE: 8000, NL: 7800, GB: 8500, PL: 7000, US: 11000, IN: 3800 },
  US: { FR: 6200, DE: 6500, ES: 6500, IT: 7000, BE: 6200, NL: 6000, GB: 5500, PL: 7500, CN: 11000, IN: 13000 },
  IN: { FR: 7000, DE: 6500, ES: 8500, IT: 6000, BE: 7200, NL: 7000, GB: 7500, PL: 6000, CN: 3800, US: 13000 },
};

/**
 * Type pour une distance en cache
 */
interface CachedDistance {
  originCountry: string;
  destinationCountry: string;
  distanceKm: number;
}

/**
 * Récupère toutes les distances entre pays depuis la base de données
 * Utilise un cache Next.js avec revalidation toutes les heures
 *
 * IMPORTANT: Retourne un tableau de données brutes au lieu d'un Map
 * car Next.js unstable_cache sérialise en JSON (les Maps perdent leurs méthodes)
 *
 * @returns Tableau des distances entre pays
 */
export const getCountryDistancesData = unstable_cache(
  async (): Promise<CachedDistance[]> => {
    try {
      const distances = await prisma.countryDistance.findMany({
        select: {
          originCountry: true,
          destinationCountry: true,
          distanceKm: true,
        },
      });

      return distances;
    } catch (error) {
      console.error('[getCountryDistancesData] Erreur lors de la récupération des distances:', error);
      return [];
    }
  },
  ['country-distances'],
  {
    revalidate: 3600, // Cache pendant 1 heure
    tags: ['country-distances'],
  }
);

/**
 * Récupère la distance entre deux pays
 * Utilise la base de données si disponible, sinon fallback aux valeurs par défaut
 *
 * @param originCountry - Code pays ISO (ex: "FR")
 * @param destinationCountry - Code pays ISO (ex: "DE")
 * @returns Distance en kilomètres, ou 1000 par défaut si non trouvée
 */
export async function getCountryDistance(
  originCountry: string,
  destinationCountry: string
): Promise<number> {
  // Récupérer les données des distances depuis le cache
  const distancesData = await getCountryDistancesData();

  // Chercher dans la base de données (recherche dans le tableau)
  const dbDistance = distancesData.find(
    (d) => d.originCountry === originCountry && d.destinationCountry === destinationCountry
  );
  if (dbDistance) {
    return dbDistance.distanceKm;
  }

  // Fallback aux valeurs par défaut
  const defaultDistance = DEFAULT_COUNTRY_DISTANCES[originCountry]?.[destinationCountry];
  if (defaultDistance) {
    return defaultDistance;
  }

  // Si aucune distance n'est trouvée, retourner 1000 km par défaut
  console.warn(
    `[getCountryDistance] Aucune distance trouvée pour ${originCountry} -> ${destinationCountry}, utilisation de 1000 km par défaut`
  );
  return 1000;
}
