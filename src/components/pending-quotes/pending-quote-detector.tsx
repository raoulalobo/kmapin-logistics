/**
 * Composant : PendingQuoteDetector
 *
 * Composant invisible qui détecte les devis en attente dans localStorage
 * et affiche automatiquement le modal de rattachement si des devis sont trouvés
 *
 * Placé dans le layout du dashboard, il s'exécute après la connexion
 * et propose à l'utilisateur de rattacher ses devis précédemment calculés
 *
 * Comportement :
 * - Vérifie localStorage au montage
 * - Attend 1 seconde pour laisser le dashboard se charger
 * - Affiche le modal une seule fois par session
 * - Ne réaffiche pas le modal si l'utilisateur l'a fermé
 *
 * @module components/pending-quotes/pending-quote-detector
 */

'use client';

import { useEffect, useState } from 'react';
import { usePendingQuotes } from '@/hooks/use-pending-quotes';
import { PendingQuoteModal } from './pending-quote-modal';

/**
 * Composant détecteur de devis en attente
 *
 * Ce composant ne rend rien visuellement (sauf le modal quand actif)
 * Il sert de "pont" entre localStorage et l'UI du modal
 *
 * Workflow :
 * 1. Montage dans le layout dashboard
 * 2. Le hook usePendingQuotes charge les devis depuis localStorage
 * 3. Si devis trouvés + pas encore affiché → afficher le modal
 * 4. Après interaction (accepter/refuser) → nettoyer localStorage
 *
 * @example
 * // Dans src/app/(dashboard)/layout.tsx
 * export default function DashboardLayout({ children }) {
 *   return (
 *     <>
 *       <PendingQuoteDetector />
 *       <main>{children}</main>
 *     </>
 *   );
 * }
 */
export function PendingQuoteDetector() {
  /**
   * Récupérer l'état des devis en attente depuis le hook
   * - pendingQuotes: Liste des devis non expirés
   * - isLoaded: true quand la lecture localStorage est terminée
   * - hasPendingQuotes: Raccourci pour pendingQuotes.length > 0
   * - clearAllPendingQuotes: Fonction pour vider le localStorage
   */
  const { pendingQuotes, isLoaded, hasPendingQuotes, clearAllPendingQuotes } =
    usePendingQuotes();

  /**
   * État du modal
   * Contrôle l'affichage du Dialog de rattachement
   */
  const [showModal, setShowModal] = useState(false);

  /**
   * Flag pour éviter de réafficher le modal
   * Une fois fermé, le modal ne se réaffiche pas même si
   * l'utilisateur navigue dans le dashboard
   */
  const [hasShownModal, setHasShownModal] = useState(false);

  /**
   * Effet pour afficher le modal automatiquement
   *
   * Conditions d'affichage :
   * 1. Le chargement localStorage est terminé (isLoaded = true)
   * 2. Des devis sont présents (hasPendingQuotes = true)
   * 3. Le modal n'a pas encore été affiché (hasShownModal = false)
   *
   * Délai de 1 seconde pour laisser le dashboard se charger
   * et éviter un flash désagréable
   */
  useEffect(() => {
    // Attendre que le chargement soit terminé
    if (!isLoaded) return;

    // Vérifier qu'il y a des devis et que le modal n'a pas été affiché
    if (hasPendingQuotes && !hasShownModal) {
      // Délai pour une meilleure UX (dashboard chargé)
      const timer = setTimeout(() => {
        setShowModal(true);
        setHasShownModal(true);
      }, 1000);

      // Cleanup si le composant est démonté
      return () => clearTimeout(timer);
    }
  }, [isLoaded, hasPendingQuotes, hasShownModal]);

  /**
   * Ne rien rendre si pas de devis ou pas encore chargé
   * Cela évite de monter le composant Dialog inutilement
   */
  if (!isLoaded || !hasPendingQuotes) {
    return null;
  }

  /**
   * Rendu du modal — on ne propose que le devis le plus récent
   *
   * Tri par createdAt décroissant : le premier élément est le plus récent.
   * On passe un tableau d'un seul élément au modal, les anciens devis
   * sont ignorés et seront nettoyés par clearAllPendingQuotes().
   *
   * Exemple avec 3 devis calculés successivement :
   * - pendingQuotes = [devis1 (10h), devis2 (11h), devis3 (12h)]
   * - après tri + slice → [devis3 (12h)] → seul devis3 est proposé
   */
  const latestQuoteOnly = [...pendingQuotes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 1);

  return (
    <PendingQuoteModal
      open={showModal}
      onOpenChange={setShowModal}
      pendingQuotes={latestQuoteOnly}
      onSuccess={clearAllPendingQuotes}
      onDismiss={clearAllPendingQuotes}
    />
  );
}
