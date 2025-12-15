/**
 * CountUp Component
 *
 * Composant réutilisable pour animer des nombres avec effet de comptage progressif.
 * Utilise useSpring de Framer Motion pour des animations fluides (requestAnimationFrame).
 *
 * @param end - Valeur finale du compteur (ex: 100, 5000)
 * @param suffix - Suffixe à ajouter après le nombre (ex: "+", "K+")
 * @param prefix - Préfixe à ajouter avant le nombre (ex: "$", "€")
 * @param duration - Durée de l'animation en secondes (défaut: 2s)
 * @param delay - Délai avant le démarrage en secondes (défaut: 0s)
 * @param decimals - Nombre de décimales à afficher (défaut: 0)
 * @param separator - Séparateur de milliers (défaut: espace insécable)
 * @param className - Classes CSS additionnelles
 * @param start - Contrôle pour déclencher l'animation (passe à true pour démarrer)
 */

'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

interface CountUpProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  delay?: number;
  decimals?: number;
  separator?: string;
  className?: string;
  start?: boolean;
}

export function CountUp({
  end,
  suffix = '',
  prefix = '',
  duration = 2,
  delay = 0,
  decimals = 0,
  separator = ' ',
  className = '',
  start = false,
}: CountUpProps) {
  // Spring value pour animation fluide (utilise RAF pour 60 FPS)
  const springValue = useSpring(0, {
    duration: duration * 1000,
    bounce: 0, // Mouvement linéaire sans rebond pour effet professionnel
  });

  // Transformer la valeur spring en texte formaté avec séparateurs
  const display = useTransform(springValue, (latest) => {
    const value = latest.toFixed(decimals);
    const parts = value.split('.');

    // Formater les milliers avec le séparateur choisi
    // Ex: 5000 → "5 000" avec separator = ' '
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);

    const formatted = parts.join('.');
    return `${prefix}${formatted}${suffix}`;
  });

  // Déclencher l'animation quand start devient true
  useEffect(() => {
    if (start) {
      const timeout = setTimeout(() => {
        springValue.set(end);
      }, delay * 1000);

      return () => clearTimeout(timeout);
    }
  }, [start, end, delay, springValue]);

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  );
}
