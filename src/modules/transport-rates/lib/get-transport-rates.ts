/**
 * Utilitaires : Récupération des Tarifs de Transport
 *
 * Fonctions pour récupérer les tarifs de transport depuis la base de données
 * avec mise en cache Next.js pour optimiser les performances.
 *
 * @module modules/transport-rates/lib
 */

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db/client';
import { TransportMode } from '@/generated/prisma';

/**
 * Interface pour un tarif de transport
 *
 * Représente une route avec ses tarifs et surcharges
 */
export interface TransportRateData {
  id: string;
  originCountryCode: string;
  destinationCountryCode: string;
  transportMode: TransportMode;
  ratePerKg: number;
  ratePerM3: number;
  cargoTypeSurcharges: any;
  prioritySurcharges: any;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Récupère un tarif pour une route spécifique
 *
 * Recherche dans la base de données le tarif configuré pour
 * une combinaison (origine, destination, mode de transport).
 *
 * @param originCountryCode - Code pays ISO origine (ex: "FR")
 * @param destinationCountryCode - Code pays ISO destination (ex: "BF")
 * @param transportMode - Mode de transport (ROAD, SEA, AIR, RAIL)
 * @returns Tarif trouvé ou null si non configuré
 *
 * @example
 * ```typescript
 * const rate = await getTransportRate('FR', 'BF', 'SEA');
 * if (rate) {
 *   const baseCost = Math.max(
 *     weight * rate.ratePerKg,
 *     volume * rate.ratePerM3
 *   );
 * }
 * ```
 *
 * **Cache** : 1 heure (tag: 'transport-rates')
 */
export const getTransportRate = unstable_cache(
  async (
    originCountryCode: string,
    destinationCountryCode: string,
    transportMode: TransportMode
  ): Promise<TransportRateData | null> => {
    try {
      const rate = await prisma.transportRate.findUnique({
        where: {
          originCountryCode_destinationCountryCode_transportMode: {
            originCountryCode: originCountryCode.toUpperCase(),
            destinationCountryCode: destinationCountryCode.toUpperCase(),
            transportMode,
          },
        },
      });

      return rate;
    } catch (error) {
      console.error('[getTransportRate] Erreur:', error);
      return null;
    }
  },
  ['transport-rate'],
  {
    revalidate: 3600, // 1 heure
    tags: ['transport-rates'],
  }
);

/**
 * Récupère tous les tarifs actifs
 *
 * Liste tous les tarifs de transport configurés et actifs,
 * triés par origine, destination et mode.
 *
 * @returns Liste des tarifs actifs
 *
 * **Utilisation** : Interface admin, rapports
 *
 * **Cache** : 1 heure (tag: 'transport-rates')
 */
export const getAllTransportRates = unstable_cache(
  async (): Promise<TransportRateData[]> => {
    try {
      return await prisma.transportRate.findMany({
        where: { isActive: true },
        orderBy: [
          { originCountryCode: 'asc' },
          { destinationCountryCode: 'asc' },
          { transportMode: 'asc' },
        ],
      });
    } catch (error) {
      console.error('[getAllTransportRates] Erreur:', error);
      return [];
    }
  },
  ['transport-rates-all'],
  {
    revalidate: 3600, // 1 heure
    tags: ['transport-rates'],
  }
);

/**
 * Récupère tous les tarifs (actifs et inactifs)
 *
 * Liste TOUS les tarifs de transport configurés, incluant les inactifs.
 * Utile pour l'interface admin.
 *
 * @param filter - Filtres optionnels (origine, destination, mode, statut)
 * @returns Liste des tarifs
 *
 * **Utilisation** : Interface admin uniquement
 *
 * **Cache** : 1 heure (tag: 'transport-rates')
 */
export const getAllTransportRatesIncludingInactive = unstable_cache(
  async (filter?: {
    originCountryCode?: string;
    destinationCountryCode?: string;
    transportMode?: TransportMode;
    isActive?: boolean;
  }): Promise<TransportRateData[]> => {
    try {
      return await prisma.transportRate.findMany({
        where: filter
          ? {
              ...(filter.originCountryCode && { originCountryCode: filter.originCountryCode }),
              ...(filter.destinationCountryCode && {
                destinationCountryCode: filter.destinationCountryCode,
              }),
              ...(filter.transportMode && { transportMode: filter.transportMode }),
              ...(filter.isActive !== undefined && { isActive: filter.isActive }),
            }
          : undefined,
        orderBy: [
          { originCountryCode: 'asc' },
          { destinationCountryCode: 'asc' },
          { transportMode: 'asc' },
        ],
      });
    } catch (error) {
      console.error('[getAllTransportRatesIncludingInactive] Erreur:', error);
      return [];
    }
  },
  ['transport-rates-all-including-inactive'],
  {
    revalidate: 3600, // 1 heure
    tags: ['transport-rates'],
  }
);
