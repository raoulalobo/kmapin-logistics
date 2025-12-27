/**
 * Module Pickups - Gestion des demandes d'enlèvement
 *
 * Ce module gère le workflow complet d'enlèvement de colis :
 * - Création de demandes par les clients
 * - Planification et assignation par les opérateurs
 * - Suivi du statut en temps réel
 * - Notifications automatiques
 *
 * @module modules/pickups
 */

// Exports des schémas de validation
export {
  pickupRequestSchema,
  pickupRequestUpdateSchema,
  pickupStatusUpdateSchema,
  pickupSearchSchema,
  assignTransporterSchema,
  type PickupRequestFormData,
  type PickupRequestUpdateData,
  type PickupStatusUpdate,
  type PickupSearchParams,
  type AssignTransporterData,
} from './schemas/pickup.schema';

// Exports des Server Actions
export {
  createPickupRequestAction,
  updatePickupRequestAction,
  updatePickupStatusAction,
  listPickupRequestsAction,
  getPickupRequestByIdAction,
  assignTransporterAction,
  cancelPickupRequestAction,
} from './actions/pickup.actions';
