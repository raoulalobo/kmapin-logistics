/**
 * Composant : Modal de Demande de Devis pour Prospects
 *
 * Dialog permettant aux utilisateurs non-connectés de recevoir un devis par email.
 * Collecte les informations du prospect (email, téléphone, nom, entreprise) et
 * déclenche l'envoi du devis PDF avec lien d'invitation.
 *
 * Workflow:
 * 1. Utilisateur remplit le formulaire (email*, phone*, name, company)
 * 2. Validation avec React Hook Form + Zod
 * 3. Appel à createProspectAndSendQuoteAction
 * 4. Email envoyé avec PDF + lien d'invitation (validité 7 jours)
 *
 * @module components/quote-request
 */

'use client';

import { useState, useTransition } from 'react';
import { Envelope, CircleNotch, PaperPlaneRight, CheckCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { prospectSchema, type QuoteDataFormData } from '@/modules/prospects';
import { createProspectAndSendQuoteAction } from '@/modules/prospects';

/**
 * Schéma Zod pour le formulaire (sans quoteData qui sera injectée)
 */
import { z } from 'zod';
const prospectFormSchema = z.object({
  email: z.string().email('Email invalide').max(100, 'Email trop long'),
  phone: z.string().min(10, 'Numéro de téléphone invalide (min 10 caractères)').max(20, 'Numéro trop long'),
  name: z.string().max(100, 'Nom trop long').optional(),
  company: z.string().max(200, 'Nom trop long').optional(),
});

type ProspectFormInput = z.infer<typeof prospectFormSchema>;

/**
 * Props du composant QuoteRequestModal
 */
interface QuoteRequestModalProps {
  /** Contrôle l'ouverture du dialog */
  open: boolean;
  /** Callback de fermeture du dialog */
  onClose: () => void;
  /** Données du devis calculé à envoyer */
  quoteData: QuoteDataFormData;
}

/**
 * Modal de demande de devis pour prospects
 *
 * Affiche un formulaire pour collecter les informations du prospect
 * et envoyer le devis calculé par email.
 */
export function QuoteRequestModal({
  open,
  onClose,
  quoteData,
}: QuoteRequestModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);

  // Formulaire React Hook Form avec validation Zod
  const form = useForm<ProspectFormInput>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues: {
      email: '',
      phone: '',
      name: '',
      company: '',
    },
  });

  /**
   * Soumettre le formulaire de demande de devis
   */
  function onSubmit(data: ProspectFormInput) {
    startTransition(async () => {
      try {
        // Combiner les données du formulaire avec les données du devis
        const prospectData = {
          email: data.email,
          phone: data.phone,
          name: data.name || null,
          company: data.company || null,
          quoteData,
        };

        const result = await createProspectAndSendQuoteAction(prospectData);

        if (!result.success) {
          // Afficher l'erreur
          toast.error(result.error || 'Erreur lors de l\'envoi du devis');
        } else {
          // Succès : afficher message et réinitialiser
          setIsSuccess(true);
          toast.success('Devis envoyé ! Consultez votre email 📧');

          // Fermer le dialog après 2 secondes
          setTimeout(() => {
            setIsSuccess(false);
            form.reset();
            onClose();
          }, 2000);
        }
      } catch (error) {
        console.error('Error submitting quote request:', error);
        toast.error('Une erreur inattendue s\'est produite');
      }
    });
  }

  /**
   * Gérer la fermeture du dialog
   */
  function handleClose() {
    if (!isPending) {
      form.reset();
      setIsSuccess(false);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {!isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Envelope className="h-5 w-5 text-primary" />
                Recevoir mon devis par email
              </DialogTitle>
              <DialogDescription>
                Entrez vos coordonnées pour recevoir votre devis détaillé par
                email. Vous recevrez également un lien d'inscription pour créer
                votre compte et suivre vos expéditions.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="votre.email@exemple.com"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Vous recevrez le devis PDF à cette adresse
                      </FormDescription>
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
                      <FormLabel>
                        Téléphone <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+33 6 12 34 56 78"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Pour un meilleur suivi de votre demande
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Nom (optionnel) */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet (optionnel)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jean Dupont"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Entreprise (optionnel) */}
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entreprise (optionnel)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nom de votre entreprise"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Note explicative */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
                  <p className="font-medium mb-1">
                    Pourquoi ces informations ?
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Recevoir votre devis détaillé en PDF</li>
                    <li>
                      Créer un compte pour suivre vos expéditions (optionnel)
                    </li>
                    <li>Bénéficier de notre support client dédié</li>
                  </ul>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <>
                        <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <PaperPlaneRight className="mr-2 h-4 w-4" />
                        Envoyer le devis
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          // Écran de succès
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-green-900">
                Devis envoyé avec succès !
              </h3>
              <p className="text-sm text-muted-foreground">
                Vous recevrez votre devis par email dans quelques instants.
              </p>
              <p className="text-xs text-muted-foreground">
                Pensez à vérifier vos spams si vous ne le recevez pas.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
