/**
 * ContactSection - Section CTA de contact avec modal
 *
 * Composant Client qui affiche la section de contact de la page d'accueil
 * avec un bouton qui ouvre un modal contenant les coordonnées
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ContactModal } from './contact-modal';

/**
 * Section de contact avec Call-to-Action
 *
 * Affiche une image, un titre et un bouton qui ouvre un modal
 * avec les informations de contact (téléphone, email, adresse)
 *
 * @example
 * ```tsx
 * <ContactSection />
 * ```
 */
export function ContactSection() {
  // État pour contrôler l'ouverture/fermeture du modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Image */}
          <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=2940')",
              }}
            />
          </div>

          {/* Contenu */}
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-6">
              Contactez-nous dès maintenant et rendez votre logistique efficace et pérenne !
            </h3>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              En tant qu'entreprise logistique globale, nous développons des concepts sur mesure
              qui s'alignent parfaitement avec vos objectifs.
            </p>
            <Button
              className="bg-[#003D82] hover:bg-[#002952] h-12 px-8 text-lg text-white"
              onClick={() => setIsModalOpen(true)}
            >
              Contactez-nous
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de contact */}
      <ContactModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </section>
  );
}