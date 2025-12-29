/**
 * ContactModal - Modal avec formulaire de contact
 *
 * Composant Client qui affiche un formulaire pour contacter l'entreprise
 * Les données sont enregistrées dans la table Prospect
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
import { Label } from '@/components/ui/label';
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
  /** État d'ouverture du modal */
  open: boolean;
  /** Fonction pour fermer le modal */
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal de contact avec formulaire d'enregistrement
 *
 * @param open - État d'ouverture du modal
 * @param onOpenChange - Callback pour changer l'état d'ouverture
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * <ContactModal open={isOpen} onOpenChange={setIsOpen} />
 * ```
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

  /**
   * Soumettre le formulaire de contact
   */
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
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Contactez-nous
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Notre équipe est à votre disposition pour répondre à toutes vos questions
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            {/* Colonne de gauche : Informations de contact */}
            <div className="space-y-6">
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
                      href="mailto:contact@fasofret.fr"
                      className="text-sm text-[#003D82] hover:underline font-medium"
                    >
                      contact@fasofret.fr
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

            {/* Colonne de droite : Formulaire de contact */}
            <div className="border-l pl-8">
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
                            placeholder="+33 6 12 34 56 78"
                            disabled={isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Objet */}
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objet de votre demande *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Demande de devis, informations sur un service..."
                            disabled={isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Boutons */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isPending}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className="bg-[#003D82] hover:bg-[#002952]"
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
          // Message de confirmation après envoi
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
