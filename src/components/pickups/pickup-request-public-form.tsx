'use client';

/**
 * Formulaire public de demande d'enlèvement
 *
 * Ce composant fonctionne en mode connecté ET non connecté:
 * - Mode non connecté: Crée un GuestPickupRequest → Email d'invitation
 * - Mode connecté: Les champs sont pré-remplis avec les données utilisateur
 *
 * Utilise React Hook Form + Zod pour validation côté client,
 * puis appelle createGuestPickupRequestAction (Server Action) pour validation serveur.
 *
 * @module components/pickups/pickup-request-public-form
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guestPickupRequestSchema, type GuestPickupRequestFormData } from '@/modules/pickups/schemas/guest-pickup.schema';
import { createGuestPickupRequestAction } from '@/modules/pickups/actions/guest-pickup.actions';
import { useSafeSession } from '@/lib/auth/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import { useFormValidation } from '@/hooks/use-form-validation';
import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PickupTimeSlot } from '@/lib/db/enums';

export function PickupRequestPublicForm() {
  const { data: session } = useSafeSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GuestPickupRequestFormData>({
    resolver: zodResolver(guestPickupRequestSchema),
    defaultValues: {
      prospectEmail: session?.user?.email || '',
      prospectName: session?.user?.name || '',
      pickupCountry: 'FR',
      timeSlot: PickupTimeSlot.FLEXIBLE,
    },
  });

  /**
   * Hook de validation améliorée (toast + scroll + focus)
   */
  const { onSubmitWithValidation, errorMessages } = useFormValidation(form, {
    toastTitle: 'Formulaire incomplet',
    fieldLabels: {
      prospectEmail: 'Email',
      prospectPhone: 'Téléphone',
      prospectName: 'Nom',
      pickupAddress: 'Adresse d\'enlèvement',
      pickupCity: 'Ville',
      pickupPostalCode: 'Code postal',
      pickupCountry: 'Pays',
      requestedDate: 'Date souhaitée',
      timeSlot: 'Créneau horaire',
      description: 'Description',
    },
  });

  async function onSubmit(data: GuestPickupRequestFormData) {
    setIsSubmitting(true);

    try {
      const result = await createGuestPickupRequestAction(data);

      if (result.success) {
        // Afficher message selon mode
        if (session?.user) {
          toast.success(result.message || 'Demande enregistrée !');
          toast.info('Votre demande est visible dans votre tableau de bord');
          router.push('/dashboard/pickups');
        } else {
          // Mode non connecté : Notification modale avec invitation à créer un compte
          toast.success('Votre demande d\'enlèvement a été enregistrée avec succès !', {
            description: `Numéro de demande : ${result.data?.requestNumber || 'N/A'}`,
            duration: 8000, // 8 secondes pour laisser le temps de lire
          });

          // Invitation à se connecter
          toast.info('Créez un compte pour suivre l\'état de votre demande en temps réel', {
            description: 'Vous pourrez consulter l\'historique et recevoir des notifications',
            duration: 10000, // 10 secondes
            action: {
              label: 'Créer un compte',
              onClick: () => router.push('/register'),
            },
          });
        }

        form.reset();
      } else {
        toast.error(result.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-4xl mx-auto dashboard-card">
      <CardHeader>
        <CardTitle className="text-2xl">Informations de la Demande</CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmitWithValidation(onSubmit)} className="space-y-8">
            {/* Bannière de résumé des erreurs */}
            <FormErrorSummary
              errors={errorMessages}
              title="Veuillez corriger les erreurs suivantes"
              className="mb-6"
            />

            {/* Section 1: Vos Coordonnées */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vos Coordonnées</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="prospectEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="votre@email.com"
                          disabled={!!session?.user}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prospectPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+33 6 12 34 56 78" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prospectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Jean Dupont" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 2: Adresse d'Enlèvement */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Adresse d'Enlèvement</h3>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="pickupAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse complète *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Rue de la Paix" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="pickupCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Paris" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pickupPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code postal *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="75001" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pickupCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="FR" maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pickupContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact sur place</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Nom du contact" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pickupPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone du contact</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="+33 6 XX XX XX XX" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Planification */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Planification</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requestedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date souhaitée *</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeSlot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Créneau horaire *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un créneau" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={PickupTimeSlot.MORNING}>Matin (8h-12h)</SelectItem>
                          <SelectItem value={PickupTimeSlot.AFTERNOON}>Après-midi (12h-17h)</SelectItem>
                          <SelectItem value={PickupTimeSlot.EVENING}>Soirée (17h-20h)</SelectItem>
                          <SelectItem value={PickupTimeSlot.SPECIFIC_TIME}>Heure précise</SelectItem>
                          <SelectItem value={PickupTimeSlot.FLEXIBLE}>Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 4: Détails Marchandise */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Détails de la Marchandise</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cargoType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de marchandise *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Électronique, Textile" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poids estimé (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedVolume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume estimé (m³)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Décrivez votre marchandise..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 5: Instructions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Instructions Spéciales (Optionnel)</h3>
              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions spéciales</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Précautions particulières, équipements nécessaires..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions d'accès</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Code portail, étage, consignes d'accès..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600">
                * Champs obligatoires
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="bg-[#003D82] hover:bg-[#002952]"
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer la Demande'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
