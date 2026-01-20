/**
 * Module : Composants Quotes (Devis)
 *
 * Exporte tous les composants liés à la gestion et l'affichage des devis.
 *
 * Composants disponibles :
 * - QuoteStatusBadge : Badge de statut avec icône
 * - QuoteHistoryTimeline : Timeline d'historique des événements
 * - QuoteAgentActions : Actions agent (workflow traitement)
 * - QuotePaymentActions : Actions paiement et facturation
 *
 * @module components/quotes
 */

// Badge de statut
export {
  QuoteStatusBadge,
  QuoteStatusBadgeCompact,
  QUOTE_STATUS_CONFIG,
} from './quote-status-badge';

// Timeline d'historique
export {
  QuoteHistoryTimeline,
  QuoteHistoryTimelineCompact,
} from './quote-history-timeline';

// Actions agent (existants)
export { QuoteAgentActions } from './quote-agent-actions';
export { QuotePaymentActions } from './quote-payment-actions';

// Actions client (accepter/rejeter)
export { QuoteActions } from './quote-actions';
