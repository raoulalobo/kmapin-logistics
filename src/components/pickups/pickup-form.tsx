/**
 * Composant Formulaire pour les Demandes d'Enlèvement
 *
 * Formulaire de création/modification de demandes d'enlèvement
 * Supporte mode invité (US-1.1) et connecté (US-1.4)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { PickupTimeSlot } from '@/lib/db/enums';
import {
  createGuestPickupSchema,
  createPickupSchema,
  type CreateGuestPickupInput,
  type CreatePickupInput,
} from '@/modules/pickups';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCountries } from '@/modules/countries';
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import { useFormValidation } from '@/hooks/use-form-validation';
import {
  User,
  MapPin,
  Calendar,
  Package,
  FileText,
  Send,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface PickupFormProps {
  mode: 'guest' | 'authenticated';
  onSubmit: (
    data: CreateGuestPickupInput | CreatePickupInput
  ) => Promise<{ success: boolean; error?: string; data?: { trackingToken?: string } }>;
  defaultValues?: Partial<CreateGuestPickupInput>;
  isSubmitting?: boolean;
  className?: string;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Labels des créneaux horaires
 */
const TIME_SLOT_OPTIONS: { value: PickupTimeSlot; label: string }[] = [
  { value: PickupTimeSlot.FLEXIBLE, label: 'Flexible (toute la journée)' },
  { value: PickupTimeSlot.MORNING, label: 'Matin (8h-12h)' },
  { value: PickupTimeSlot.AFTERNOON, label: 'Après-midi (14h-18h)' },
  { value: PickupTimeSlot.SPECIFIC_TIME, label: 'Heure précise' },
];

/**
 * Pays supportés - REMPLACÉ par useCountries() hook
 * La liste est maintenant chargée dynamiquement depuis la base de données
 * avec cache React Query pour optimiser les performances.
 */
// const COUNTRIES = [...]; // DEPRECATED - Utilisez useCountries() à la place

// ============================================
// HELPERS
// ============================================

/**
 * Génère une date minimale (demain)
 */
function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Formulaire de création de demande d'enlèvement
 *
 * @param mode - Mode invité ou authentifié
 * @param onSubmit - Callback de soumission
 * @param defaultValues - Valeurs par défaut
 * @param isSubmitting - État de soumission externe
 * @param className - Classes CSS additionnelles
 *
 * @example
 * ```tsx
 * // Mode invité
 * <PickupForm
 *   mode="guest"
 *   onSubmit={async (data) => {
 *     const result = await createGuestPickup(data);
 *     if (result.success) {
 *       router.push(`/pickup/track/${result.data.trackingToken}`);
 *     }
 *     return result;
 *   }}
 * />
 *
 * // Mode authentifié
 * <PickupForm
 *   mode="authenticated"
 *   onSubmit={async (data) => {
 *     const result = await createPickup(data);
 *     if (result.success) {
 *       router.push('/dashboard/pickups');
 *     }
 *     return result;
 *   }}
 * />
 * ```
 */
export function PickupForm({
  mode,
  onSubmit,
  defaultValues,
  isSubmitting: externalIsSubmitting = false,
  className,
}: PickupFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showSpecificTime, setShowSpecificTime] = useState(false);

  // Charger la liste des pays actifs depuis la base de données
  const { data: countries, isLoading: isLoadingCountries } = useCountries();

  // Sélectionner le schéma selon le mode
  const schema = mode === 'guest' ? createGuestPickupSchema : createPickupSchema;

  const form = useForm<CreateGuestPickupInput | CreatePickupInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactEmail: defaultValues?.contactEmail || '',
      contactPhone: defaultValues?.contactPhone || '',
      contactName: defaultValues?.contactName || '',

      pickupAddress: defaultValues?.pickupAddress || '',
      pickupCity: defaultValues?.pickupCity || '',
      pickupPostalCode: defaultValues?.pickupPostalCode || '',
      pickupCountry: defaultValues?.pickupCountry || 'FR',

      requestedDate: defaultValues?.requestedDate || getMinDate(),
      timeSlot: defaultValues?.timeSlot || PickupTimeSlot.FLEXIBLE,
      pickupTime: defaultValues?.pickupTime || '',

      cargoType: defaultValues?.cargoType || '',
      estimatedWeight: defaultValues?.estimatedWeight || undefined,
      estimatedVolume: defaultValues?.estimatedVolume || undefined,
      packageCount: defaultValues?.packageCount || undefined,
      description: defaultValues?.description || '',

      specialInstructions: defaultValues?.specialInstructions || '',
      accessInstructions: defaultValues?.accessInstructions || '',
    },
  });

  /**
   * Hook de validation améliorée (toast + scroll + focus)
   */
  const { onSubmitWithValidation, errorMessages } = useFormValidation(form, {
    toastTitle: 'Formulaire incomplet',
    fieldLabels: {
      contactEmail: 'Email',
      contactPhone: 'Téléphone',
      contactName: 'Nom du contact',
      pickupAddress: 'Adresse',
      pickupCity: 'Ville',
      pickupPostalCode: 'Code postal',
      pickupCountry: 'Pays',
      requestedDate: 'Date souhaitée',
      timeSlot: 'Créneau horaire',
      pickupTime: 'Heure précise',
      cargoType: 'Type de marchandise',
      estimatedWeight: 'Poids estimé',
      estimatedVolume: 'Volume estimé',
      packageCount: 'Nombre de colis',
      description: 'Description',
      specialInstructions: 'Instructions spéciales',
      accessInstructions: 'Instructions d\'accès',
    },
  });

  // Surveiller le créneau horaire pour afficher/masquer le champ d'heure
  const timeSlot = form.watch('timeSlot');

  useEffect(() => {
    if (timeSlot === PickupTimeSlot.SPECIFIC_TIME) {
      setShowSpecificTime(true);
    } else {
      setShowSpecificTime(false);
      form.setValue('pickupTime', '');
    }
  }, [timeSlot, form]);

  // Handler de soumission
  const handleSubmit = async (data: CreateGuestPickupInput | CreatePickupInput) => {
    console.log('🚀 [PickupForm] handleSubmit appelé avec:', data);

    try {
      console.log('📤 [PickupForm] Envoi des données...');
      const result = await onSubmit(data);
      console.log('✅ [PickupForm] Résultat reçu:', result);

      if (result.success) {
        toast({
          title: 'Demande créée avec succès',
          description: mode === 'guest'
            ? 'Vous allez recevoir un email avec votre lien de suivi.'
            : 'Votre demande d\'enlèvement a été enregistrée.',
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Une erreur est survenue',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ [PickupForm] Erreur dans handleSubmit:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur inattendue est survenue',
        variant: 'destructive',
      });
    }
  };

  const isSubmitting = form.formState.isSubmitting || externalIsSubmitting;

  // Log des erreurs de validation pour debugging
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log('⚠️ [PickupForm] Erreurs de validation:', form.formState.errors);
    }
  }, [form.formState.errors]);

  return (
    <Form {...form}>
      <form
        onSubmit={onSubmitWithValidation(handleSubmit)}
        className={cn('space-y-6', className)}
      >
        {/* Bannière de résumé des erreurs */}
        <FormErrorSummary
          errors={errorMessages}
          title="Veuillez corriger les erreurs suivantes"
          className="mb-6"
        />

        {/* Section Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informations de contact</span>
            </CardTitle>
            <CardDescription>
              Ces informations seront utilisées pour vous contacter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du contact</FormLabel>
                  <FormControl>
                    <Input placeholder="Jean Dupont" {...field} />
                  </FormControl>
                  <FormDescription>Optionnel</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jean.dupont@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone *</FormLabel>
                    <FormControl>
                      <Input placeholder="+33 6 12 34 56 78" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section Adresse d'enlèvement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Adresse d&apos;enlèvement</span>
            </CardTitle>
            <CardDescription>
              Où devons-nous venir récupérer votre marchandise ?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="pickupAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Rue de la République" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                name="pickupCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCountries ? (
                          <SelectItem value="loading" disabled>
                            Chargement des pays...
                          </SelectItem>
                        ) : countries && countries.length > 0 ? (
                          countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-countries" disabled>
                            Aucun pays disponible
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="accessInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions d&apos;accès</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Code d'accès, interphone, étage, parking..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Informations pour faciliter l&apos;accès au lieu d&apos;enlèvement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section Planification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Planification</span>
            </CardTitle>
            <CardDescription>
              Quand souhaitez-vous que nous venions ?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requestedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date souhaitée *</FormLabel>
                    <FormControl>
                      <Input type="date" min={getMinDate()} {...field} />
                    </FormControl>
                    <FormDescription>Minimum 24h à l&apos;avance</FormDescription>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_SLOT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showSpecificTime && (
              <FormField
                control={form.control}
                name="pickupTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure précise *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormDescription>
                      Format 24h (ex: 14:30)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Section Marchandise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Détails de la marchandise</span>
            </CardTitle>
            <CardDescription>
              Ces informations nous aident à préparer l&apos;enlèvement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="cargoType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de marchandise</FormLabel>
                  <FormControl>
                    <Input placeholder="Palettes, cartons, mobilier..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="packageCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de colis</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="5"
                        {...field}
                        onWheel={(e) => e.currentTarget.blur()} // empêche le scroll de modifier la valeur
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                        }
                      />
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
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="100"
                        {...field}
                        onWheel={(e) => e.currentTarget.blur()} // empêche le scroll de modifier la valeur
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
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
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="2.5"
                        {...field}
                        onWheel={(e) => e.currentTarget.blur()} // empêche le scroll de modifier la valeur
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
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
                  <FormLabel>Description détaillée</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez votre marchandise : contenu, dimensions, particularités..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section Instructions spéciales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Instructions spéciales</span>
            </CardTitle>
            <CardDescription>
              Informations importantes pour l&apos;enlèvement (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Précautions particulières, équipement nécessaire, contraintes horaires..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Boutons de soumission */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Annuler
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer la demande
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
