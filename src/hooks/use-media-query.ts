/**
 * Hook useMediaQuery — Détection de breakpoint CSS via matchMedia
 *
 * Écoute un media query CSS et retourne `true` si la condition est satisfaite.
 * Utilisé principalement pour switcher entre composants mobile/desktop
 * (ex: Drawer sur mobile vs Dialog sur desktop).
 *
 * @param query - Media query CSS (ex: "(min-width: 768px)")
 * @returns boolean — `true` si le media query correspond au viewport actuel
 *
 * @example
 * ```tsx
 * // Détecter si on est sur desktop (>= 768px)
 * const isDesktop = useMediaQuery("(min-width: 768px)");
 *
 * // Retourner un Dialog sur desktop, un Drawer sur mobile
 * return isDesktop ? <Dialog /> : <Drawer />;
 * ```
 */
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  // Par défaut false (SSR-safe : côté serveur, pas de window)
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Créer le MediaQueryList à partir de la query CSS
    const mediaQuery = window.matchMedia(query);

    // Mettre à jour l'état initial dès le montage côté client
    setMatches(mediaQuery.matches);

    /**
     * Handler appelé quand le viewport change et croise le breakpoint.
     * Exemple : redimensionner la fenêtre de 600px à 800px
     * avec query "(min-width: 768px)" déclenche ce handler.
     */
    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    // Écouter les changements de viewport
    mediaQuery.addEventListener('change', handleChange);

    // Nettoyage : retirer le listener au démontage
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
