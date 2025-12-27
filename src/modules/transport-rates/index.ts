/**
 * Module : Transport Rates (Tarifs de Transport)
 *
 * Gestion des tarifs de transport par route (origine, destination, mode).
 * Permet une tarification granulaire avec tarifs €/kg et €/m³ distincts.
 *
 * @module modules/transport-rates
 */

// ===== Schémas de validation =====
export * from './schemas/transport-rate.schema';

// ===== Utilitaires de récupération (avec cache) =====
export {
  getTransportRate,
  getAllTransportRates,
  getAllTransportRatesIncludingInactive,
  type TransportRateData,
} from './lib/get-transport-rates';

// ===== Server Actions (CRUD) =====
export {
  createTransportRate,
  updateTransportRate,
  deleteTransportRate,
  getTransportRateById,
  getTransportRates,
  toggleTransportRateStatus,
  bulkImportTransportRates,
  type ActionResult,
} from './actions/transport-rate.actions';
