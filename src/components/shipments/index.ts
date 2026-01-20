/**
 * Exports des composants Shipment (Expéditions)
 *
 * Point d'entrée centralisé pour tous les composants liés aux expéditions.
 *
 * @module components/shipments
 *
 * @example
 * ```tsx
 * import {
 *   ShipmentStatusBadge,
 *   ShipmentHistoryTimeline,
 *   ShipmentAgentActions,
 * } from '@/components/shipments';
 * ```
 */

// Badge de statut pour les expéditions
export {
  ShipmentStatusBadge,
  ShipmentStatusBadgeCompact,
  SHIPMENT_STATUS_CONFIG,
} from './shipment-status-badge';

// Timeline d'historique des événements
export {
  ShipmentHistoryTimeline,
  ShipmentHistoryTimelineCompact,
  type ShipmentLogWithRelations,
} from './shipment-history-timeline';

// Actions agent (composants existants)
export * from './shipment-agent-actions';
export * from './shipment-payment-actions';
