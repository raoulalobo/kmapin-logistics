/**
 * HeroSection Component
 *
 * Section hero animée avec parallax, typing effect et animations d'entrée progressives.
 * Maintient le style corporate professionnel inspiré de Rhenus Group.
 */

'use client';

import Link from 'next/link';
import { Phone } from 'lucide-react';
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
            </div>
          </div>
        </div>

        {/* Navigation ancrée - Bande bleue style Rhenus avec fade-in */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-[#0033FF] py-4"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2 }}
        >
          <div className="container mx-auto px-6">
            <nav className="flex items-center justify-center space-x-1 text-sm overflow-x-auto">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Link
                  href="#solutions"
                  className="text-white/90 hover:text-white px-6 py-2 transition-colors whitespace-nowrap"
                >
                  Solutions logistiques
                </Link>
              </motion.div>
              <span className="text-white/40">|</span>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Link
                  href="#industries"
                  className="text-white/90 hover:text-white px-6 py-2 transition-colors whitespace-nowrap"
                >
                  Industries
                </Link>
              </motion.div>
              <span className="text-white/40">|</span>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Link
                  href="#why-kmapin"
                  className="text-white/90 hover:text-white px-6 py-2 transition-colors whitespace-nowrap"
                >
                  Pourquoi KmapIn
                </Link>
              </motion.div>
              <span className="text-white/40">|</span>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Link
                  href="#services"
                  className="text-white/90 hover:text-white px-6 py-2 transition-colors whitespace-nowrap"
                >
                  Services
                </Link>
              </motion.div>
              <span className="text-white/40">|</span>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Link
                  href="#contact"
                  className="text-white/90 hover:text-white px-6 py-2 transition-colors whitespace-nowrap"
                >
                  Contact
                </Link>
              </motion.div>
              <span className="text-white/40">|</span>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Link
                  href="#actualites"
                  className="text-white/90 hover:text-white px-6 py-2 transition-colors whitespace-nowrap"
                >
                  Actualités
                </Link>
              </motion.div>
            </nav>
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
            className="bg-[#0033FF] hover:bg-[#0029CC] rounded-l-lg rounded-r-none px-6 py-8 shadow-xl"
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
