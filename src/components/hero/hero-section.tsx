/**
 * HeroSection Component
 *
 * Section hero animée avec parallax, typing effect et animations d'entrée progressives.
 * Maintient le style corporate professionnel inspiré de Rhenus Group.
 */

'use client';

import Link from 'next/link';
import { Phone, Calculator, CalendarBlank, MagnifyingGlass } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ParallaxBackground } from './parallax-background';
import { AnimatedText } from './animated-text';

export function HeroSection() {
  return (
    <section className="relative">
      <ParallaxBackground
        imageUrl="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2940"
        overlayGradient="from-gray-900/90 to-gray-900/70"
        parallaxSpeed={0.5}
      >
        {/* Contenu Hero */}
        <div className="relative h-full flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl">
              {/* Titre avec typing effect */}
              <AnimatedText
                text="Votre partenaire logistique global"
                as="h1"
                className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight"
                delay={300}
              />

              {/* Sous-titre avec fade-in et slide-up */}
              <motion.p
                className="text-2xl text-gray-200 mb-10 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.5 }}
              >
                Solutions logistiques sur mesure pour vos expéditions multi-modales
              </motion.p>

              {/* Boutons CTA avec stagger animation */}
              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 2 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#003D82] hover:bg-[#002952] text-white h-14 px-8 text-lg font-semibold shadow-xl text-white"
                  >
                    <Link href="#calculateur" className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Faire un devis
                    </Link>
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm h-14 px-8 text-lg font-semibold"
                  >
                    <Link href="/pickups/request" className="flex items-center gap-2">
                      <CalendarBlank className="h-5 w-5" />
                      Demander un enlèvement
                    </Link>
                  </Button>
                </motion.div>

                {/* Bouton Suivi de colis */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm h-14 px-8 text-lg font-semibold"
                  >
                    <Link href="/tracking" className="flex items-center gap-2">
                      <MagnifyingGlass className="h-5 w-5" weight="bold" />
                      Suivi de colis
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Barre bleue vide */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-[#003D82] py-4 text-white"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2 }}
        >
          <div className="container mx-auto px-6">
            {/* Barre vide - contenu supprimé */}
          </div>
        </motion.div>
      </ParallaxBackground>

      {/* Bouton Contact & Services flottant avec slide-in depuis la droite */}
      <motion.div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.8,
          delay: 2.5,
          type: "spring",
          stiffness: 100
        }}
      >
        <motion.div
          whileHover={{ scale: 1.05, x: -5 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Button
            asChild
            className="bg-[#003D82] hover:bg-[#002952] rounded-l-lg rounded-r-none px-6 py-8 shadow-xl text-white"
          >
            <Link href="#contact" className="flex flex-col items-center gap-2">
              <Phone className="h-6 w-6" />
              <span className="text-xs font-semibold whitespace-nowrap">
                Contact<br/>& Services
              </span>
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
