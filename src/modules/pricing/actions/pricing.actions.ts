/**
 * Server Actions pour la gestion des tarifs standards
 *
 * Ces actions sont publiques (pas d'authentification requise)
 * Mise à jour : Utilise maintenant la table TransportRate de la BDD
 *
 * @module modules/pricing/actions
 */

'use server';

import { prisma } from '@/lib/db/client';
import { getPricingConfig } from '@/modules/pricing-config';
import { STANDARD_RATES, type StandardRate } from '../data/standard-rates';
import { pricingFiltersSchema, type PricingFiltersData } from '../schemas/pricing.schema';
import { TransportMode, CargoType } from '@/generated/prisma';

/**
 * Récupérer les tarifs standards avec filtres optionnels
 *
 * Maintenant récupère les données depuis la table TransportRate
 * Fallback vers les données hardcodées si la BDD est vide
 *
 * @param filters - Filtres de recherche (search, transportMode, destinationCode)
 * @returns Liste des tarifs filtrés
 *
 * @example
 * ```typescript
 * const rates = await getStandardRatesAction({
 *   search: 'Allemagne',
 *   transportMode: 'ROAD',
 * });
 * ```
 */
export async function getStandardRatesAction(filters?: PricingFiltersData) {
  try {
    // Valider les filtres
    const validatedFilters = filters ? pricingFiltersSchema.parse(filters) : {};

    // === ÉTAPE 1 : Récupérer les tarifs depuis la BDD ===
    const transportRates = await prisma.transportRate.findMany({
      where: {
        isActive: true,
        ...(validatedFilters.transportMode && {
          transportMode: validatedFilters.transportMode,
        }),
        ...(validatedFilters.destinationCode && {
          destinationCountryCode: validatedFilters.destinationCode.toUpperCase(),
        }),
      },
      include: {
        // Note: On ne peut pas joindre directement Country car ce n'est pas une relation
        // On devra faire un lookup séparé ou utiliser le code pays directement
      },
    });

    // === ÉTAPE 2 : Récupérer les noms de pays (lookup) ===
    const uniqueCountryCodes = [...new Set(transportRates.map((r) => r.destinationCountryCode))];
    const countries = await prisma.country.findMany({
      where: {
        code: { in: uniqueCountryCodes },
      },
    });
    const countryMap = new Map(countries.map((c) => [c.code, c.name]));

    // === ÉTAPE 3 : Récupérer la configuration pour les délais ===
    const config = await getPricingConfig();

    // === ÉTAPE 4 : Convertir en format StandardRate ===
    let ratesFromDB: StandardRate[] = transportRates.map((rate) => {
      const countryName = countryMap.get(rate.destinationCountryCode) || rate.destinationCountryCode;

      // Récupérer les délais depuis la config
      const deliverySpeed = config.deliverySpeedsPerMode[rate.transportMode];
      const estimatedDaysMin = deliverySpeed?.min || 1;
      const estimatedDaysMax = deliverySpeed?.max || 7;

      return {
        id: rate.id,
        destination: countryName,
        destinationCode: rate.destinationCountryCode,
        transportMode: rate.transportMode,
        cargoType: CargoType.GENERAL, // Valeur par défaut
        pricePerKg: rate.ratePerKg,
        minPrice: rate.ratePerKg * 10, // Estimation : 10 kg minimum
        maxPrice: rate.ratePerKg * 100, // Estimation : 100 kg maximum
        estimatedDaysMin,
        estimatedDaysMax,
        currency: 'EUR',
      };
    });

    // === ÉTAPE 5 : Fallback vers données hardcodées si BDD vide ===
    if (ratesFromDB.length === 0) {
      console.warn('Aucun tarif trouvé dans TransportRate, utilisation des données hardcodées');
      ratesFromDB = [...STANDARD_RATES];
    }

    // === ÉTAPE 6 : Appliquer les filtres de recherche textuelle ===
    let filteredRates = ratesFromDB;

    if (validatedFilters.search) {
      const searchLower = validatedFilters.search.toLowerCase();
      filteredRates = filteredRates.filter((rate) =>
        rate.destination.toLowerCase().includes(searchLower) ||
        rate.destinationCode.toLowerCase().includes(searchLower)
      );
    }

    return {
      success: true,
      data: filteredRates,
    };
  } catch (error: any) {
    console.error('Erreur getStandardRatesAction:', error);

    // En cas d'erreur BDD, fallback vers données hardcodées
    return {
      success: true,
      data: STANDARD_RATES.filter((rate) => {
        const validatedFilters = filters ? pricingFiltersSchema.parse(filters) : {};

        if (validatedFilters.search) {
          const searchLower = validatedFilters.search.toLowerCase();
          if (
            !rate.destination.toLowerCase().includes(searchLower) &&
            !rate.destinationCode.toLowerCase().includes(searchLower)
          ) {
            return false;
          }
        }

        if (validatedFilters.transportMode && rate.transportMode !== validatedFilters.transportMode) {
          return false;
        }

        if (validatedFilters.destinationCode && rate.destinationCode !== validatedFilters.destinationCode) {
          return false;
        }

        return true;
      }),
    };
  }
}

/**
 * Récupérer un tarif standard par ID
 *
 * @param id - ID du tarif
 * @returns Tarif trouvé ou null
 */
export async function getStandardRateByIdAction(id: string) {
  try {
    const rate = STANDARD_RATES.find((r) => r.id === id);

    if (!rate) {
      return {
        success: false,
        error: 'Tarif introuvable',
      };
    }

    return {
      success: true,
      data: rate,
    };
  } catch (error: any) {
    console.error('Erreur getStandardRateByIdAction:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération du tarif',
    };
  }
}
