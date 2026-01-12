/**
 * Composant : Dashboard Overflow Fix
 *
 * Force le style overflow sur html pour éviter la double scrollbar
 * dans le dashboard. Ce composant applique les styles via useEffect
 * car le sélecteur CSS :has() ne fonctionne pas de manière fiable.
 *
 * Rôle : Désactiver le scroll sur <html> et <body> pour que seul
 * le <main> du dashboard puisse scroller.
 */

'use client';

import { useEffect } from 'react';

/**
 * Composant qui applique les styles overflow au montage
 * pour éviter la double scrollbar dans le dashboard
 */
export function DashboardOverflowFix() {
  useEffect(() => {
    // Sauvegarder les styles originaux
    const htmlOriginalOverflow = document.documentElement.style.overflow;
    const htmlOriginalHeight = document.documentElement.style.height;
    const bodyOriginalOverflow = document.body.style.overflow;
    const bodyOriginalHeight = document.body.style.height;

    // Appliquer les styles pour le dashboard
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';

    // Nettoyer au démontage (quand on quitte le dashboard)
    return () => {
      document.documentElement.style.overflow = htmlOriginalOverflow;
      document.documentElement.style.height = htmlOriginalHeight;
      document.body.style.overflow = bodyOriginalOverflow;
      document.body.style.height = bodyOriginalHeight;
    };
  }, []);

  return null; // Ce composant ne rend rien visuellement
}
