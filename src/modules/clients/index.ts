/**
 * Module : Clients
 *
 * Export centralisé de toutes les fonctionnalités du module Clients
 */

// Actions
export {
  createClientAction,
  getClientsAction,
  getClientAction,
  updateClientAction,
  deleteClientAction,
} from './actions/client.actions';

// Schémas et types
export {
  clientSchema,
  clientUpdateSchema,
  clientSearchSchema,
  type ClientFormData,
  type ClientUpdateData,
  type ClientSearchParams,
} from './schemas/client.schema';
