/**
 * Module Purchases - Export principal
 *
 * Centralise tous les exports du module purchases pour faciliter les imports
 */

// ============================================
// SCHÉMAS ZOD
// ============================================

export {
  createGuestPurchaseSchema,
  createPurchaseSchema,
  trackPurchaseByTokenSchema,
  updatePurchaseStatusSchema,
  cancelPurchaseSchema,
  updatePurchaseCostsSchema,
  type CreateGuestPurchaseInput,
  type CreatePurchaseInput,
  type TrackPurchaseByTokenInput,
  type UpdatePurchaseStatusInput,
  type CancelPurchaseInput,
  type UpdatePurchaseCostsInput,
} from './schemas/purchase.schema';

// ============================================
// SERVER ACTIONS
// ============================================

export {
  createGuestPurchase,
  createPurchase,
  trackPurchaseByToken,
  attachPurchaseToAccount,
  listPurchases,
  updatePurchaseStatus,
  cancelPurchase,
  updatePurchaseCosts,
  getPurchaseDetails,
} from './actions/purchase.actions';
