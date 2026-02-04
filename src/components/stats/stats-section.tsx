/**
 * StatsSection Component
 *
 * Section de statistiques avec animations de count-up déclenchées au scroll.
 * Affiche 4 métriques clés de l'entreprise avec effet staggered (décalé).
 *
 * Fonctionnalités :
 * - Détection de visibilité avec useInView (30% threshold)
 * - Animation count-up déclenchée une seule fois au scroll
 * - Stagger de 0.15s entre chaque statistique
 * - Combine fade-in, slide-up et count-up simultanément
 * - Responsive : 2 colonnes sur mobile, 4 sur desktop
 *
 * Layout : Grid 2 cols (mobile) → 4 cols (lg+)
 * Style : Fond bleu corporate (#003D82), texte blanc
 */

'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { CountUp } from './count-up';

// Données des statistiques affichées
const statsData = [
  { value: 10, suffix: '+', label: "Années d'expérience" },
  { value: 20, suffix: '+', label: 'Employés dans le monde' },
  { value: 5, suffix: '+', label: "Pays d'opération" },
  { value: 10, suffix: '+', label: 'Sites dans le monde' },
];

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // Détecter quand la section entre dans le viewport
  const isInView = useInView(sectionRef, {
    once: true,      // Animation une seule fois (ne se répète pas)
    amount: 0.3,     // 30% visible avant déclenchement
  });

  return (
    <section ref={sectionRef} className="py-20 bg-[#003D82] text-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="text-center text-white"
              // État initial : invisible et légèrement vers le bas
              initial={{ opacity: 0, y: 30 }}
              // État animé : visible et à sa position normale
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{
                duration: 0.6,                     // Durée fade-in + slide-up
                delay: index * 0.15,               // Stagger: 0s, 0.15s, 0.3s, 0.45s
                ease: [0.25, 0.1, 0.25, 1],       // Ease-out quadratic (professionnel)
              }}
            >
              <div className="text-5xl font-bold mb-3">
                <CountUp
                  end={stat.value}
                  suffix={stat.suffix}
                  duration={2.5}                   // Count-up sur 2.5s
                  delay={index * 0.15}             // Synchronisé avec le fade-in
                  start={isInView}                 // Démarre quand visible
                  separator=" "                    // Espace insécable pour milliers
                />
              </div>
              <div className="text-xl opacity-90">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
