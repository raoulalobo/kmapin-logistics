/**
 * Module Composants Pickups - Export principal
 *
 * Centralise tous les exports des composants pickups pour faciliter les imports
 */

// Composants de statut
export {
  PickupStatusBadge,
  PickupStatusBadgeSmall,
  PickupStatusBadgeWithIcon,
} from './pickup-status-badge';

// Menu d'actions
export { PickupActionsMenu } from './pickup-actions-menu';

// Timeline d'historique
export {
  PickupHistoryTimeline,
  PickupHistoryTimelineCompact,
} from './pickup-history-timeline';

// Card de détails
export {
  PickupDetailsCard,
  PickupDetailsCardCompact,
} from './pickup-details-card';

// Filtres
export { PickupFilters, type PickupFilters as PickupFiltersType } from './pickup-filters';

// Tableau de liste
export { PickupListTable } from './pickup-list-table';

// Formulaires
export { PickupForm } from './pickup-form';
export { PickupScheduleForm } from './pickup-schedule-form';

// Liste client avec filtres
export { PickupsListClient } from './pickups-list-client';
