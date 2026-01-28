/**
 * Module Tracking - Exports centralisés
 *
 * @module modules/tracking
 */

// ============================================================================
// Actions Authentifiées (Dashboard)
// ============================================================================
export {
  getActiveShipmentsWithTracking,
  getShipmentTracking,
  addTrackingEvent,
  getTrackingStats,
  type ShipmentWithTracking,
  type TrackingEventData,
} from './actions/tracking.actions';

// ============================================================================
// Actions Publiques (Tracking sans authentification)
// ============================================================================
export {
  getPublicTracking,
  checkTrackingNumberExists,
  type PublicShipmentTracking,
  type PublicTrackingEvent,
} from './actions/public-tracking.actions';

// ============================================================================
// Schémas de validation (Zod)
// ============================================================================
export {
  addTrackingEventSchema,
  gpsCoordinatesSchema,
  updateGpsPositionSchema,
  type AddTrackingEventInput,
  type UpdateGpsPositionInput,
} from './schemas/tracking-event.schema';
