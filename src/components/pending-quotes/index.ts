/**
 * Composants : Devis en attente (Pending Quotes)
 *
 * Composants pour la détection et le rattachement des devis
 * calculés par des visiteurs non connectés
 *
 * Flux utilisateur :
 * 1. Visiteur → /#calculateur → calcule un devis → localStorage
 * 2. Visiteur → crée un compte → se connecte
 * 3. Dashboard → PendingQuoteDetector détecte les devis
 * 4. PendingQuoteModal propose le rattachement
 * 5. Utilisateur accepte → Quote créé en base → localStorage vidé
 *
 * @module components/pending-quotes
 */

export { PendingQuoteDetector } from './pending-quote-detector';
export { PendingQuoteModal } from './pending-quote-modal';
