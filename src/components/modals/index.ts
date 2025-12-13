/**
 * Module : Modals
 *
 * Exports publics du système de modales standardisées.
 * Fournit tous les composants et types nécessaires pour utiliser StandardModal.
 */

// ========================================
// Composant principal
// ========================================
export { StandardModal } from './standard-modal';

// ========================================
// Composants internes (exports optionnels pour composition avancée)
// ========================================
export { StandardModalItemComponent } from './standard-modal-item';
export { StandardModalFooter } from './standard-modal-footer';

// ========================================
// Types et interfaces TypeScript
// ========================================
export type {
  StandardModalItem,
  StandardModalFilters,
  StandardModalProps,
} from './standard-modal-types';
