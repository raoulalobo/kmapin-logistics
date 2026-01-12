/**
 * Module Pickups - Export principal
 *
 * Centralise tous les exports du module pickups pour faciliter les imports
 */

// Schémas Zod de validation
export {
  createGuestPickupSchema,
  createPickupSchema,
  trackPickupByTokenSchema,
  updatePickupStatusSchema,
  cancelPickupSchema,
  assignDriverSchema,
  schedulePickupSchema,
  type CreateGuestPickupInput,
  type CreatePickupInput,
  type TrackPickupByTokenInput,
  type UpdatePickupStatusInput,
  type CancelPickupInput,
  type AssignDriverInput,
  type SchedulePickupInput,
} from './schemas/pickup.schema';

// Server Actions
export {
  createGuestPickup,
  createPickup,
  trackPickupByToken,
  attachPickupToAccount,
  listPickups,
  updatePickupStatus,
  cancelPickup,
  assignDriver,
  schedulePickup,
  getPickupDetails,
} from './actions/pickup.actions';

// Helpers pour les logs
export {
  createPickupLog,
  logPickupCreated,
  logStatusChanged,
  logAttachedToAccount,
  logDriverAssigned,
  logDriverChanged,
  logScheduled,
  logRescheduled,
  logDocumentUploaded,
  logTokenRefreshed,
  logSystemNote,
  getPickupHistory,
  getPickupLogsByEventType,
  getLastStatusChange,
} from './lib/pickup-log-helper';
