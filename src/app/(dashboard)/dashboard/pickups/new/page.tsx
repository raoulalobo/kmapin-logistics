/**
 * Page : Création d'une Demande d'Enlèvement
 *
 * Formulaire de création d'une nouvelle demande d'enlèvement.
 * - Sélection de l'expédition
 * - Adresse de collecte (pré-remplie depuis l'expédition)
 * - Planification (date, créneau horaire)
 * - Instructions spéciales
 *
 * @module app/(dashboard)/pickups/new
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, FloppyDisk, Package, Calendar, Clock } from '@phosphor-icons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import {
  pickupRequestSchema,
  createPickupRequestAction,
  type PickupRequestFormData,
} from '@/modules/pickups';
import { PickupTimeSlot } from '@/generated/prisma';

export default function NewPickupRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PickupRequestFormData>({
    resolver: zodResolver(pickupRequestSchema),
    defaultValues: {
      shipmentId: '',
      pickupAddress: '',
      pickupCity: '',
      pickupPostalCode: '',
      pickupCountry: 'FR',
      pickupContact: '',
      pickupPhone: '',
      requestedDate: '',
      timeSlot: 'FLEXIBLE',
      pickupTime: '',
      specialInstructions: '',
      accessInstructions: '',
      internalNotes: '',
      companyId: '',
    },
  });

  /**
   * Soumission du formulaire
   */
  async function onSubmit(data: PickupRequestFormData) {
    try {
      setIsSubmitting(true);

      const result = await createPickupRequestAction(data);

      if (result.success) {
        toast.success('Demande d\'enlèvement créée avec succès');
        router.push('/dashboard/pickups');
        router.refresh();
      } else {
        toast.error(result.error || 'Erreur lors de la création de la demande');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
      console.error('Erreur création demande enlèvement:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button variant="outline" size="lg" asChild className="mb-4 gap-2">
          <Link href="/dashboard/pickups">
            <ArrowLeft className="h-4 w-4" />
            Retour aux enlèvements
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Nouvelle Demande d'Enlèvement
        </h1>
        <p className="text-gray-600 mt-1">
          Planifiez l'enlèvement de colis pour une expédition
        </p>
      </div>

      {/* Formulaire */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section : Expédition */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Expédition</CardTitle>
                  <CardDescription>
                    Sélectionnez l'expédition pour laquelle vous souhaitez planifier un enlèvement
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="shipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° d'expédition *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="clxxxxxxxxxxxxxx"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      ID de l'expédition (ex: clxxxxxxxxxx). Vous pouvez le trouver dans la liste des expéditions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Company *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="clxxxxxxxxxxxxxx"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      ID de la company (doit correspondre à l'expédition)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section : Adresse d'enlèvement */}
          <Card>
            <CardHeader>
              <CardTitle>Adresse d'Enlèvement</CardTitle>
              <CardDescription>
                Où le transporteur doit-il se rendre pour collecter les colis ?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="pickupAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse complète *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Rue de la Paix"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="pickupCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville *</FormLabel>
                      <FormControl>
                        <Input placeholder="Paris" {...field} />
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
                        <Input placeholder="75001" {...field} />
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
                      <FormLabel>Pays (ISO) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="FR"
                          maxLength={2}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pickupContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du contact</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jean Dupont"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Personne à contacter sur place
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pickupPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+33 6 12 34 56 78"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Numéro pour joindre le contact
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section : Planification */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Planification</CardTitle>
                  <CardDescription>
                    Quand souhaitez-vous que l'enlèvement ait lieu ?
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="requestedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date souhaitée *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Date et heure souhaitées pour l'enlèvement
                    </FormDescription>
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FLEXIBLE">
                          Flexible (toute la journée)
                        </SelectItem>
                        <SelectItem value="MORNING">
                          Matin (8h-12h)
                        </SelectItem>
                        <SelectItem value="AFTERNOON">
                          Après-midi (12h-17h)
                        </SelectItem>
                        <SelectItem value="EVENING">
                          Soirée (17h-20h)
                        </SelectItem>
                        <SelectItem value="SPECIFIC_TIME">
                          Heure précise
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('timeSlot') === 'SPECIFIC_TIME' && (
                <FormField
                  control={form.control}
                  name="pickupTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure précise *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Heure souhaitée pour l'enlèvement (format HH:MM)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Section : Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
              <CardDescription>
                Informations complémentaires pour le transporteur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions spéciales</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Colis fragile, manipuler avec précaution..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Instructions particulières pour la manutention
                    </FormDescription>
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
                        placeholder="Code porte: 1234, Interphone: Dupont, Parking au sous-sol..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Code porte, interphone, parking, étage, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="internalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes internes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes visibles uniquement par l'équipe interne..."
                        className="min-h-[80px]"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Ces notes ne seront pas communiquées au transporteur
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Annuler
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <FloppyDisk className="h-5 w-5" weight="fill" />
              {isSubmitting ? 'Création en cours...' : 'Créer la demande'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
