/**
 * AnimatedText Component
 *
 * Affiche du texte avec un effet de typing (machine à écrire) et un curseur clignotant.
 * Utilisé pour animer le titre principal du hero section.
 *
 * @param text - Le texte à afficher
 * @param className - Classes CSS Tailwind pour le styling
 * @param as - Élément HTML à utiliser (h1, h2, ou p)
 * @param delay - Délai avant le début de l'animation en ms
 */

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'p';
  delay?: number;
}

export function AnimatedText({
  text,
  className,
  as = 'p',
  delay = 0
}: AnimatedTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let currentIndex = 0;

    // Délai initial avant de commencer le typing
    const timer = setTimeout(() => {
      // Intervalle pour ajouter un caractère à la fois
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          // Animation terminée
          setIsComplete(true);
          clearInterval(interval);
        }
      }, 50); // 50ms par caractère pour un effet fluide

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay]);

  // Composant motion dynamique basé sur la prop 'as'
  const MotionComponent = motion[as];

  return (
    <MotionComponent
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
    >
      {displayedText}
      {/* Curseur clignotant, disparaît quand l'animation est terminée */}
      {!isComplete && (
        <motion.span
          className="inline-block w-0.5 h-8 md:h-12 bg-white ml-1 align-middle"
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </MotionComponent>
  );
}
