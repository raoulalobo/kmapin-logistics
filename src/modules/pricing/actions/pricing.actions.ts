/**
 * Server Actions pour la gestion des tarifs standards
 *
 * Ces actions sont publiques (pas d'authentification requise)
 *
 * @module modules/pricing/actions
 */

'use server';

import { STANDARD_RATES, type StandardRate } from '../data/standard-rates';
import { pricingFiltersSchema, type PricingFiltersData } from '../schemas/pricing.schema';

/**
 * Récupérer les tarifs standards avec filtres optionnels
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

    // Filtrer les tarifs
    let filteredRates = [...STANDARD_RATES];

    // Filtre par recherche textuelle (destination)
    if (validatedFilters.search) {
      const searchLower = validatedFilters.search.toLowerCase();
      filteredRates = filteredRates.filter((rate) =>
        rate.destination.toLowerCase().includes(searchLower) ||
        rate.destinationCode.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par mode de transport
    if (validatedFilters.transportMode) {
      filteredRates = filteredRates.filter(
        (rate) => rate.transportMode === validatedFilters.transportMode
      );
    }

    // Filtre par code pays
    if (validatedFilters.destinationCode) {
      filteredRates = filteredRates.filter(
        (rate) => rate.destinationCode === validatedFilters.destinationCode
      );
    }

    return {
      success: true,
      data: filteredRates,
    };
  } catch (error: any) {
    console.error('Erreur getStandardRatesAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération des tarifs',
      data: [],
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
