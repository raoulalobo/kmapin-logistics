/**
 * Module de gestion de la configuration des prix
 *
 * Exports publics pour l'utilisation dans l'application
 */

// Schémas de validation
export * from './schemas/pricing-config.schema';

// Fonctions de récupération (cachées)
export {
  getPricingConfig,
  getCountryDistance,
  getCountryDistancesData,
  DEFAULT_PRICING_CONFIG,
  DEFAULT_COUNTRY_DISTANCES,
  type PricingConfigData,
} from './lib/get-pricing-config';

// Server Actions
export {
  getCurrentPricingConfig,
  updatePricingConfig,
  getAllCountryDistances,
  upsertCountryDistance,
  deleteCountryDistance,
  bulkImportCountryDistances,
} from './actions/pricing-config.actions';

// Server Actions : Options de mode de transport et priorité avec labels dynamiques
export {
  getTransportModeOptionsAction,
  getPriorityOptionsAction,
  type TransportModeOption,
  type PriorityOption,
} from './actions/transport-mode-options';
