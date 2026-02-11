/**
 * ParallaxBackground Component
 *
 * Crée un effet de parallax sur une image de fond avec overlay gradient animé.
 * L'image se déplace plus lentement que le scroll pour créer un effet de profondeur.
 *
 * @param imageUrl - URL de l'image de fond
 * @param children - Contenu à afficher par-dessus l'image
 * @param overlayGradient - Classes Tailwind pour le gradient d'overlay
 * @param parallaxSpeed - Vitesse du parallax (0-1, 0.5 = moitié de la vitesse du scroll)
 */

'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface ParallaxBackgroundProps {
  imageUrl: string;
  children: React.ReactNode;
  overlayGradient?: string;
  parallaxSpeed?: number;
}

export function ParallaxBackground({
  imageUrl,
  children,
  overlayGradient = 'from-gray-900/90 to-gray-900/70',
  parallaxSpeed = 0.5
}: ParallaxBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Suivre la progression du scroll pour cet élément
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"] // Du début à la fin de l'élément
  });

  // Transformer la progression du scroll en déplacement vertical
  // L'image se déplace de 0% à parallaxSpeed * 100% pendant le scroll
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    ['0%', `${parallaxSpeed * 100}%`]
  );

  return (
    <div
      ref={ref}
      className="relative h-auto sm:h-[85vh] overflow-hidden"
    >
      {/* Image avec effet parallax */}
      <motion.div
        className="absolute inset-0"
        style={{ y }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${imageUrl}')`,
            height: '120%', // Image plus grande pour compenser le déplacement
            top: '-10%' // Centrer l'image dans sa position initiale
          }}
        />
      </motion.div>

      {/* Overlay gradient animé avec pulse subtil */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r ${overlayGradient}`}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: [0.7, 0.85, 0.7] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Contenu par-dessus avec z-index élevé */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}
