/**
 * ContactSection - Section de contact avec formulaire inline et fond immersif
 *
 * Composant Client qui affiche la section de contact de la page d'accueil.
 * Le formulaire remplace l'ancienne image et est directement visible
 * sans nécessiter d'ouvrir un modal.
 *
 * Design : image d'entrepôt logistique en fond avec overlay bleu foncé
 * - L'image (Unsplash, licence gratuite) est optimisée via next/image (fill + cover)
 * - Un overlay semi-transparent `bg-[#003D82]/80` assure la lisibilité du texte CTA (blanc)
 * - Le formulaire garde un fond blanc/translucide pour le contraste des champs
 *
 * Layout : grille 2 colonnes (formulaire | texte CTA)
 * - Desktop (lg+) : formulaire à gauche, texte à droite
 * - Mobile : colonnes empilées (texte puis formulaire)
 *
 * Les données sont enregistrées dans la table Prospect via createContactProspectAction.
 *
 * @module components/contact
 */
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { PaperPlaneRight, CircleNotch, CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { contactFormSchema, type ContactFormData } from '@/modules/prospects/schemas/prospect.schema';
import { createContactProspectAction } from '@/modules/prospects/actions/prospect.actions';

/**
 * URL de l'image de fond — entrepôt logistique professionnel (Unsplash, licence gratuite)
 * Photo : warehouse avec chariot élévateur Hyster et rayonnages industriels
 * Paramètre w=2940 pour haute résolution, q=80 pour compression raisonnable
 */
const BACKGROUND_IMAGE_URL =
  'https://images.unsplash.com/photo-1721937718756-3bfec49f42a2?q=80&w=2940';

/**
 * Section de contact avec formulaire inline
 *
 * Le formulaire est affiché directement à la place de l'ancienne image,
 * offrant une meilleure UX (pas de clic supplémentaire pour accéder au formulaire).
 * Après soumission réussie, un message de confirmation s'affiche à la place du formulaire.
 *
 * @example
 * ```tsx
 * <ContactSection />
 * ```
 */
export function ContactSection() {
  /** Indique si la soumission est en cours (désactive les inputs pendant l'envoi) */
  const [isPending, startTransition] = useTransition();
  /** Bascule entre le formulaire et le message de confirmation après envoi réussi */
  const [isSubmitted, setIsSubmitted] = useState(false);

  /**
   * React Hook Form avec validation Zod
   * Les champs correspondent au schéma contactFormSchema (name, email, phone, subject)
   */
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
    },
  });

  /**
   * Soumettre le formulaire de contact
   * Appelle la Server Action createContactProspectAction pour persister le prospect
   * puis affiche un message de succès ou d'erreur via toast
   */
  async function onSubmit(data: ContactFormData) {
    startTransition(async () => {
      const result = await createContactProspectAction(data);

      if (result.success) {
        toast.success('Demande envoyée !', {
          description: 'Notre équipe vous contactera rapidement.',
        });
        form.reset();
        setIsSubmitted(true);
      } else {
        toast.error('Erreur', {
          description: result.error || 'Une erreur est survenue',
        });
      }
    });
  }

  return (
    <section id="contact" className="relative py-20 overflow-hidden">
      {/*
       * Image de fond — entrepôt logistique (next/image optimisé)
       * fill : remplit tout le conteneur parent (position absolute)
       * object-cover : recadre l'image pour couvrir sans déformation
       * priority=false : lazy loading car la section est en bas de page
       * z-0 : couche de base dans le stacking context de la section
       */}
      <Image
        src={BACKGROUND_IMAGE_URL}
        alt="Entrepôt logistique professionnel avec rayonnages industriels"
        fill
        className="object-cover z-0"
        sizes="100vw"
        quality={80}
      />

      {/*
       * Overlay semi-transparent bleu foncé (#003D82 à 80% d'opacité)
       * Assure la lisibilité du texte blanc par-dessus l'image
       * z-[1] : au-dessus de l'image (z-0), en dessous du contenu (z-10)
       */}
      <div className="absolute inset-0 bg-[#003D82]/80 z-[1]" />

      {/* Contenu — z-10 pour être au-dessus de l'image et de l'overlay */}
      <div className="relative z-10 container mx-auto px-6">
        {/*
         * Grille 2 colonnes :
         * - Sur mobile : colonnes empilées, texte CTA en premier (order-first)
         * - Sur desktop (lg+) : formulaire à gauche, texte CTA à droite
         * items-center aligne verticalement les deux colonnes
         */}
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">

          {/* Formulaire de contact — fond blanc/translucide pour contraste sur overlay sombre */}
          <div className="rounded-2xl border border-white/20 bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-xl order-last lg:order-first">
            {isSubmitted ? (
              /**
               * Message de confirmation après envoi réussi
               * Affiché à la place du formulaire, avec un bouton pour renvoyer un message
               */
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" weight="fill" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Message envoyé avec succès !
                </h3>
                <p className="text-gray-600 mb-6">
                  Nous vous contacterons dans les plus brefs délais.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsSubmitted(false)}
                >
                  Envoyer un autre message
                </Button>
              </div>
            ) : (
              /**
               * Formulaire de contact avec 4 champs :
               * - Nom complet (obligatoire)
               * - Email (obligatoire, format email validé par Zod)
               * - Téléphone (obligatoire)
               * - Objet (obligatoire, textarea pour texte libre)
               */
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-5">
                  Envoyez-nous un message
                </h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Nom */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom complet *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Jean Dupont"
                              disabled={isPending}
                              className="border-[#003D82]/40 focus-visible:ring-[#003D82]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="jean.dupont@entreprise.com"
                              disabled={isPending}
                              className="border-[#003D82]/40 focus-visible:ring-[#003D82]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Téléphone */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone *</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+33 6 16 02 10 10"
                              disabled={isPending}
                              className="border-[#003D82]/40 focus-visible:ring-[#003D82]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Objet — Textarea multiligne pour texte libre */}
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objet de votre demande *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Demande de devis, informations sur un service..."
                              disabled={isPending}
                              rows={3}
                              className="resize-none border-[#003D82]/40 focus-visible:ring-[#003D82]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Bouton d'envoi — pleine largeur pour maximiser la cible tactile */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="bg-[#003D82] hover:bg-[#002952] w-full"
                        disabled={isPending}
                      >
                        {isPending ? (
                          <>
                            <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <PaperPlaneRight className="mr-2 h-4 w-4" />
                            Envoyer le message
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </>
            )}
          </div>

          {/*
           * Texte CTA — affiché en premier sur mobile (order-first), à droite sur desktop
           * Texte en blanc pour contraster avec l'overlay bleu foncé
           */}
          <div className="order-first lg:order-last">
            <h3 className="text-3xl font-bold text-white mb-6">
              Contactez-nous dès maintenant et rendez votre logistique efficace et pérenne !
            </h3>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              En tant qu&apos;entreprise logistique globale, nous développons des concepts sur mesure
              qui s&apos;alignent parfaitement avec vos objectifs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
