/**
 * ContactModal - Modal de contact responsive (Option B)
 *
 * Dialog unique adapté mobile et desktop :
 * - Mobile (<md) : scrollable, formulaire seul, boutons pleine largeur
 * - Desktop (>=md) : layout 2 colonnes (coordonnées + formulaire)
 *
 * Les données sont enregistrées dans la table Prospect via createContactProspectAction.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * <ContactModal open={isOpen} onOpenChange={setIsOpen} />
 * ```
 */
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Phone, Envelope, MapPin, PaperPlaneRight, CircleNotch } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface ContactModalProps {
  /** Etat d'ouverture du modal */
  open: boolean;
  /** Fonction pour fermer le modal */
  onOpenChange: (open: boolean) => void;
}

/**
 * ContactModal — Dialog responsive unique
 *
 * Adaptations mobile :
 * - max-h-[90dvh] + overflow-y-auto pour scroller si le contenu dépasse le viewport
 * - Colonne coordonnées masquée sur mobile (visible md+)
 * - Boutons empilés pleine largeur sur mobile, alignés à droite sur desktop
 * - Textarea pour le champ "Objet" au lieu d'un Input
 */
export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(true);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
    },
  });

  /** Soumettre le formulaire de contact */
  async function onSubmit(data: ContactFormData) {
    startTransition(async () => {
      const result = await createContactProspectAction(data);

      if (result.success) {
        toast.success('Demande envoyée !', {
          description: 'Notre équipe vous contactera rapidement.',
        });
        form.reset();
        setShowForm(false);
        // Fermer le modal après 2 secondes
        setTimeout(() => {
          onOpenChange(false);
          setShowForm(true);
        }, 2000);
      } else {
        toast.error('Erreur', {
          description: result.error || 'Une erreur est survenue',
        });
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
        if (!newOpen) {
          // Réinitialiser le formulaire lors de la fermeture
          form.reset();
          setShowForm(true);
        }
      }}
    >
      {/*
       * DialogContent responsive :
       * - max-w-5xl sur desktop pour le layout 2 colonnes
       * - max-h-[90dvh] + overflow-y-auto pour scroller sur mobile
       * - p-4 sur mobile, p-6 sur desktop
       * dvh (dynamic viewport height) s'adapte à la barre d'adresse mobile
       */}
      <DialogContent className="max-w-5xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            Contactez-nous
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Notre équipe est à votre disposition pour répondre à toutes vos questions
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 py-4">
            {/*
             * Colonne coordonnées — masquée sur mobile (hidden md:block)
             * Sur mobile, les coordonnées sont déjà visibles dans la section contact
             * de la page d'accueil. Pas besoin de les dupliquer dans le modal.
             */}
            <div className="hidden md:block space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Nos coordonnées
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Contactez-nous directement par téléphone, email ou visitez-nous à notre adresse.
                </p>
              </div>

              <div className="space-y-5">
                {/* Téléphone */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#003D82]/10">
                    <Phone className="h-6 w-6 text-[#003D82]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Téléphone</p>
                    <a
                      href="tel:+33123456789"
                      className="text-sm text-[#003D82] hover:underline font-medium"
                    >
                      +33 1 23 45 67 89
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#003D82]/10">
                    <Envelope className="h-6 w-6 text-[#003D82]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Email</p>
                    <a
                      href="mailto:fasofret@gmail.com"
                      className="text-sm text-[#003D82] hover:underline font-medium"
                    >
                      fasofret@gmail.com
                    </a>
                  </div>
                </div>

                {/* Adresse */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#003D82]/10">
                    <MapPin className="h-6 w-6 text-[#003D82]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Adresse</p>
                    <p className="text-sm text-gray-600">
                      46 ROUTE DE GOUSSAINVILLE<br />
                      95190 FONTENAY-EN-PARISIS
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/*
             * Colonne formulaire
             * - Sur desktop : bordure gauche + padding pour séparer des coordonnées
             * - Sur mobile : pas de bordure, prend toute la largeur
             */}
            <div className="md:border-l md:pl-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/*
                   * Boutons — pleine largeur empilés sur mobile, alignés à droite sur desktop
                   * flex-col-reverse : "Envoyer" apparaît en haut sur mobile (plus accessible)
                   */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isPending}
                      className="w-full sm:w-auto"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className="bg-[#003D82] hover:bg-[#002952] w-full sm:w-auto"
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
                          Envoyer
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        ) : (
          /* Message de confirmation après envoi */
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <PaperPlaneRight className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Message envoyé avec succès !
            </h3>
            <p className="text-gray-600">
              Nous vous contacterons dans les plus brefs délais.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
