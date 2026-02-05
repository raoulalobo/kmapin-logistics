/**
 * Page Édition de Devis
 *
 * Permet au CLIENT de modifier son devis tant qu'il est en statut DRAFT.
 * Une fois envoyé (SENT), le devis est verrouillé et ne peut plus être modifié.
 *
 * Règles métier :
 * - Le CLIENT propriétaire peut modifier son devis en DRAFT
 * - Les agents (ADMIN, OPERATIONS_MANAGER) peuvent modifier les devis en SUBMITTED
 *   pour ajuster les prix, routes, cargo avant envoi au client
 *
 * Architecture :
 * - EditQuotePage : Composant principal qui charge les données
 * - QuoteEditForm : Composant formulaire qui reçoit les données en props
 *   (séparé pour garantir que useForm est initialisé avec les bonnes valeurs)
 *
 * @module app/(dashboard)/dashboard/quotes/[id]/edit
 */

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, FloppyDisk, Calculator } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CountrySelect } from '@/components/countries/country-select';
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import { useFormValidation } from '@/hooks/use-form-validation';
import { Skeleton } from '@/components/ui/skeleton';

import { quoteSchema, type QuoteFormData, getQuoteAction, updateQuoteAction } from '@/modules/quotes';
import { CargoType, TransportMode } from '@/lib/db/enums';
import { useSafeSession } from '@/lib/auth/hooks';
import { calculateQuoteEstimateV2Action } from '@/modules/quotes/actions/calculate-quote-estimate-v2';
import {
  getTransportModeOptionsAction,
  getPriorityOptionsAction,
  type TransportModeOption,
  type PriorityOption,
} from '@/modules/pricing-config';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Type pour les données du devis chargées depuis l'API
 */
/**
 * Type pour les données du devis chargées depuis l'API
 * Note: validUntil peut être un objet Date (Prisma) ou une string ISO (après sérialisation)
 */
/**
 * Type des priorités disponibles pour la livraison
 * - STANDARD : Délai normal, aucun supplément
 * - NORMAL : Légèrement accéléré, +10%
 * - EXPRESS : Livraison rapide, +50%
 * - URGENT : Prioritaire, +30%
 */
type PriorityType = 'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT';

interface QuoteData {
  id: string;
  quoteNumber: string;
  clientId: string | null;
  originCountry: string;
  destinationCountry: string;
  cargoType: string;
  weight: number;
  length: number | null;
  width: number | null;
  height: number | null;
  originAddress: string | null;
  originCity: string | null;
  originPostalCode: string | null;
  originContactName: string | null;
  originContactPhone: string | null;
  originContactEmail: string | null;
  destinationAddress: string | null;
  destinationCity: string | null;
  destinationPostalCode: string | null;
  destinationContactName: string | null;
  destinationContactPhone: string | null;
  destinationContactEmail: string | null;
  transportMode: string[];
  // Priorité de livraison : affecte le prix (+10% à +50%) et le délai
  priority: PriorityType | null;
  estimatedCost: number;
  currency: string;
  // Prisma retourne Date, mais après sérialisation JSON c'est une string
  validUntil: Date | string;
  status: string;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT FORMULAIRE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Composant formulaire d'édition de devis
 *
 * Séparé du composant principal pour garantir que useForm()
 * est initialisé avec les bonnes valeurs dès le départ.
 * Cela évite les problèmes de synchronisation avec les composants
 * Select de Radix UI qui ne réagissent pas bien au form.reset().
 */
function QuoteEditForm({
  quoteData,
  quoteId,
}: {
  quoteData: QuoteData;
  quoteId: string;
}) {
  const router = useRouter();
  const [estimatedPrice, setEstimatedPrice] = useState<number>(Number(quoteData.estimatedCost));
  const [isCalculating, setIsCalculating] = useState(false);

  // Options dynamiques avec labels incluant les multiplicateurs/surcharges configurés
  const [transportModeOptions, setTransportModeOptions] = useState<TransportModeOption[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<PriorityOption[]>([]);

  // Charger les options de mode de transport et de priorité au montage
  useEffect(() => {
    async function loadOptions() {
      const [transportResult, priorityResult] = await Promise.all([
        getTransportModeOptionsAction(),
        getPriorityOptionsAction(),
      ]);

      if (transportResult.success) {
        setTransportModeOptions(transportResult.data);
      }
      if (priorityResult.success) {
        setPriorityOptions(priorityResult.data);
      }
    }
    loadOptions();
  }, []);

  // Formulaire initialisé avec les données du devis
  // Les valeurs sont disponibles dès le premier rendu
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      clientId: quoteData.clientId || '',
      originCountry: quoteData.originCountry,
      destinationCountry: quoteData.destinationCountry,
      cargoType: quoteData.cargoType as CargoType,
      weight: Number(quoteData.weight),
      // Dimensions : undefined si null/0 pour avoir des champs vides
      length: quoteData.length ? Number(quoteData.length) : undefined,
      width: quoteData.width ? Number(quoteData.width) : undefined,
      height: quoteData.height ? Number(quoteData.height) : undefined,
      // Adresses expéditeur
      originAddress: quoteData.originAddress || '',
      originCity: quoteData.originCity || '',
      originPostalCode: quoteData.originPostalCode || '',
      originContactName: quoteData.originContactName || '',
      originContactPhone: quoteData.originContactPhone || '',
      originContactEmail: quoteData.originContactEmail || '',
      // Adresses destinataire
      destinationAddress: quoteData.destinationAddress || '',
      destinationCity: quoteData.destinationCity || '',
      destinationPostalCode: quoteData.destinationPostalCode || '',
      destinationContactName: quoteData.destinationContactName || '',
      destinationContactPhone: quoteData.destinationContactPhone || '',
      destinationContactEmail: quoteData.destinationContactEmail || '',
      transportMode: quoteData.transportMode as TransportMode[],
      // Priorité de livraison : par défaut STANDARD si non définie
      priority: (quoteData.priority || 'STANDARD') as PriorityType,
      estimatedCost: Number(quoteData.estimatedCost),
      currency: quoteData.currency,
      // Prisma retourne un objet Date, mais Zod attend une chaîne ISO 8601
      // On convertit donc la Date en string avec toISOString()
      validUntil: quoteData.validUntil instanceof Date
        ? quoteData.validUntil.toISOString()
        : typeof quoteData.validUntil === 'string'
          ? quoteData.validUntil
          : new Date(quoteData.validUntil).toISOString(),
      // Préserver le statut actuel (DRAFT pour client, SUBMITTED pour agent)
      status: quoteData.status as QuoteFormData['status'],
    },
  });

  // Hook de validation
  const { onSubmitWithValidation, errorMessages } = useFormValidation(form, {
    toastTitle: 'Formulaire incomplet',
    fieldLabels: {
      clientId: 'Client',
      originCountry: "Pays d'origine",
      destinationCountry: 'Pays de destination',
      cargoType: 'Type de marchandise',
      weight: 'Poids',
      transportMode: 'Mode de transport',
      estimatedCost: 'Coût estimé',
      currency: 'Devise',
      validUntil: 'Date de validité',
    },
  });

  // Devise sélectionnée
  const selectedCurrency = form.watch('currency');

  // Taux de conversion
  const conversionRates: Record<string, number> = {
    EUR: 1,
    USD: 1.09,
    GBP: 0.86,
    CHF: 0.96,
  };

  const currencySymbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
  };

  const getConvertedPrice = (priceInEUR: number, targetCurrency: string): number => {
    const rate = conversionRates[targetCurrency] || 1;
    return priceInEUR * rate;
  };

  const getCurrencySymbol = (currency: string): string => {
    return currencySymbols[currency] || currency;
  };

  // Watcher pour recalculer le prix
  // Surveille tous les champs qui affectent le calcul du tarif
  const watchedFields = form.watch([
    'originCountry',
    'destinationCountry',
    'cargoType',
    'weight',
    'length',
    'width',
    'height',
    'transportMode',
    'priority', // Ajouté : la priorité affecte le prix (+10% à +50%)
  ]);

  // Mise à jour du prix quand la devise change
  useEffect(() => {
    if (estimatedPrice !== null) {
      const convertedPrice = getConvertedPrice(estimatedPrice, selectedCurrency);
      form.setValue('estimatedCost', convertedPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, estimatedPrice]);

  // Calcul automatique du prix quand les champs changent
  useEffect(() => {
    async function calculatePrice() {
      const values = form.getValues();

      // Vérifier que les champs obligatoires sont remplis
      if (
        !values.originCountry ||
        !values.destinationCountry ||
        !values.weight ||
        values.weight <= 0 ||
        !values.transportMode ||
        values.transportMode.length === 0
      ) {
        return;
      }

      setIsCalculating(true);

      try {
        // Préparer les données pour le calculateur
        // La priorité est récupérée du formulaire pour un calcul précis
        const estimateData = {
          originCountry: values.originCountry,
          destinationCountry: values.destinationCountry,
          cargoType: values.cargoType,
          weight: values.weight,
          length: values.length || 0,
          width: values.width || 0,
          height: values.height || 0,
          transportMode: values.transportMode,
          // Utilise la priorité sélectionnée par l'utilisateur
          priority: (values.priority || 'STANDARD') as 'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT',
        };

        // Calculer le prix avec la Server Action
        const result = await calculateQuoteEstimateV2Action(estimateData);

        if (result.success && result.data) {
          const calculatedPrice = result.data.estimatedCost;
          setEstimatedPrice(calculatedPrice);
          // Mettre à jour le champ estimatedCost automatiquement
          form.setValue('estimatedCost', calculatedPrice);
        }
      } catch (error) {
        console.error('Erreur calcul prix:', error);
      } finally {
        setIsCalculating(false);
      }
    }

    // Déclencher le calcul avec un debounce de 500ms
    const timeoutId = setTimeout(calculatePrice, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...watchedFields]);

  /**
   * Soumission du formulaire - Mise à jour du devis
   * Convertit les données du formulaire en FormData pour l'action serveur
   */
  async function onSubmit(data: QuoteFormData) {
    try {
      const formData = new FormData();

      // Champs obligatoires
      formData.append('clientId', data.clientId);
      formData.append('originCountry', data.originCountry);
      formData.append('destinationCountry', data.destinationCountry);
      formData.append('cargoType', data.cargoType);
      formData.append('weight', data.weight.toString());

      // Dimensions (optionnelles)
      if (data.length) formData.append('length', data.length.toString());
      if (data.width) formData.append('width', data.width.toString());
      if (data.height) formData.append('height', data.height.toString());

      // Adresses expéditeur (optionnelles)
      if (data.originAddress) formData.append('originAddress', data.originAddress);
      if (data.originCity) formData.append('originCity', data.originCity);
      if (data.originPostalCode) formData.append('originPostalCode', data.originPostalCode);
      if (data.originContactName) formData.append('originContactName', data.originContactName);
      if (data.originContactPhone) formData.append('originContactPhone', data.originContactPhone);
      if (data.originContactEmail) formData.append('originContactEmail', data.originContactEmail);

      // Adresses destinataire (optionnelles)
      if (data.destinationAddress) formData.append('destinationAddress', data.destinationAddress);
      if (data.destinationCity) formData.append('destinationCity', data.destinationCity);
      if (data.destinationPostalCode) formData.append('destinationPostalCode', data.destinationPostalCode);
      if (data.destinationContactName) formData.append('destinationContactName', data.destinationContactName);
      if (data.destinationContactPhone) formData.append('destinationContactPhone', data.destinationContactPhone);
      if (data.destinationContactEmail) formData.append('destinationContactEmail', data.destinationContactEmail);

      // Transport mode (array)
      data.transportMode.forEach(mode => formData.append('transportMode', mode));

      // Priorité de livraison
      formData.append('priority', data.priority || 'STANDARD');

      // Tarification
      formData.append('estimatedCost', data.estimatedCost.toString());
      formData.append('currency', data.currency);
      formData.append('validUntil', data.validUntil);
      // Préserver le statut actuel du devis (DRAFT pour client, SUBMITTED pour agent)
      formData.append('status', quoteData.status);

      const result = await updateQuoteAction(quoteId, formData);

      if (result.success) {
        toast.success('Devis mis à jour avec succès');
        router.push(`/dashboard/quotes/${quoteId}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
      console.error('Erreur mise à jour devis:', error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmitWithValidation(onSubmit)} className="space-y-6">
        <FormErrorSummary
          errors={errorMessages}
          title="Veuillez corriger les erreurs suivantes"
          className="mb-6"
        />

        {/* Route */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Itinéraire</CardTitle>
            <CardDescription>Pays d&apos;origine et de destination</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="originCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays d&apos;origine *</FormLabel>
                    <FormControl>
                      <CountrySelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Sélectionnez un pays"
                        id="originCountry"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays de destination *</FormLabel>
                    <FormControl>
                      <CountrySelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Sélectionnez un pays"
                        id="destinationCountry"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ADRESSE EXPÉDITEUR */}
        {/* Adresse complète de l'expéditeur pour un traitement plus rapide */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Adresse Expéditeur</CardTitle>
            <CardDescription>
              Adresse complète de l&apos;expéditeur - Permet un traitement plus rapide du devis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="originAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse complète</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 123 Rue de la Paix"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>Rue, numéro, bâtiment</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Ouagadougou"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originPostalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 01 BP 1234"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du contact</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Jean Dupont"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone du contact</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Ex: +226 70 12 34 56"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originContactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email du contact</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Ex: jean@example.com"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ADRESSE DESTINATAIRE */}
        {/* Adresse complète du destinataire pour un traitement plus rapide */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Adresse Destinataire</CardTitle>
            <CardDescription>
              Adresse complète du destinataire - Permet un traitement plus rapide du devis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="destinationAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse complète</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 456 Avenue de l'Indépendance"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>Rue, numéro, bâtiment</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Bobo-Dioulasso"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationPostalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 01 BP 5678"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du contact</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Marie Martin"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone du contact</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Ex: +226 70 98 76 54"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationContactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email du contact</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Ex: marie@example.com"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Marchandise */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Détails de la marchandise</CardTitle>
            <CardDescription>Informations sur le contenu à transporter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="cargoType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de marchandise *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GENERAL">Marchandise générale</SelectItem>
                      <SelectItem value="FOOD">Alimentaire</SelectItem>
                      <SelectItem value="ELECTRONICS">Électronique</SelectItem>
                      <SelectItem value="PHARMACEUTICALS">Pharmaceutique</SelectItem>
                      <SelectItem value="CHEMICALS">Produits chimiques</SelectItem>
                      <SelectItem value="CONSTRUCTION">Construction</SelectItem>
                      <SelectItem value="TEXTILES">Textiles</SelectItem>
                      <SelectItem value="AUTOMOTIVE">Automobile</SelectItem>
                      <SelectItem value="MACHINERY">Machines</SelectItem>
                      <SelectItem value="PERISHABLE">Périssable</SelectItem>
                      <SelectItem value="HAZARDOUS">Dangereux</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poids (kg) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Ex: 150"
                      value={field.value ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? undefined : parseFloat(val));
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>Poids total en kilogrammes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dimensions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dimensions (optionnelles)</label>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Longueur (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ex: 100"
                          value={field.value ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Largeur (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ex: 80"
                          value={field.value ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">Hauteur (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ex: 60"
                          value={field.value ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : parseFloat(val));
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="transportMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de transport *</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange([value as TransportMode])}
                    value={field.value[0]}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Options dynamiques avec labels incluant multiplicateurs et délais */}
                      {transportModeOptions.length > 0 ? (
                        transportModeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.labelWithDetails}
                          </SelectItem>
                        ))
                      ) : (
                        // Fallback si les options ne sont pas encore chargées
                        <>
                          <SelectItem value="ROAD">Routier</SelectItem>
                          <SelectItem value="SEA">Maritime</SelectItem>
                          <SelectItem value="AIR">Aérien</SelectItem>
                          <SelectItem value="RAIL">Ferroviaire</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ────────────────────────────────────────────────────────────── */}
            {/* PRIORITÉ DE LIVRAISON */}
            {/* Affecte le prix final et le délai de livraison estimé */}
            {/* STANDARD (×1.0), NORMAL (+10%), EXPRESS (+50%), URGENT (+30%) */}
            {/* ────────────────────────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité de livraison</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || 'STANDARD'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une priorité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Options dynamiques avec surcharges configurées */}
                      {priorityOptions.length > 0 ? (
                        priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.labelWithDetails}
                          </SelectItem>
                        ))
                      ) : (
                        // Fallback si les options ne sont pas encore chargées
                        <>
                          <SelectItem value="STANDARD">Standard (délai normal)</SelectItem>
                          <SelectItem value="NORMAL">Normal (+10% - légèrement accéléré)</SelectItem>
                          <SelectItem value="EXPRESS">Express (+50% - rapide)</SelectItem>
                          <SelectItem value="URGENT">Urgent (+30% - prioritaire)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    La priorité affecte le prix et le délai de livraison estimé
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Tarification */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Tarification</CardTitle>
            <CardDescription>Montant calculé automatiquement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {estimatedPrice !== null && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Prix calculé</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {getConvertedPrice(estimatedPrice, selectedCurrency).toFixed(2)} {getCurrencySymbol(selectedCurrency)}
                </p>
                {isCalculating && (
                  <p className="text-xs text-blue-700 mt-1">Recalcul en cours...</p>
                )}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coût estimé *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                    </FormControl>
                    <FormDescription>Montant calculé automatiquement</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Devise *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="USD">USD (Dollar)</SelectItem>
                        <SelectItem value="GBP">GBP (Livre)</SelectItem>
                        <SelectItem value="CHF">CHF (Franc suisse)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <FloppyDisk className="h-5 w-5" weight="fill" />
            {form.formState.isSubmitting ? 'Mise à jour...' : 'Enregistrer les modifications'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Page d'édition d'un devis
 *
 * Charge le devis existant et affiche le formulaire d'édition
 * une fois les données disponibles. Cette séparation garantit
 * que le formulaire est initialisé avec les bonnes valeurs.
 */
export default function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Session utilisateur pour vérifier le rôle (CLIENT vs Agent)
  const { data: session, isLoading: isSessionLoading } = useSafeSession();
  const userRole = session?.user?.role as string | undefined;

  // États de chargement et données
  const [isLoading, setIsLoading] = useState(true);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger le devis au montage
  useEffect(() => {
    async function loadQuote() {
      try {
        const result = await getQuoteAction(id);

        if (!result.success || !result.data) {
          setError('Devis introuvable');
          return;
        }

        const quote = result.data;

        // Vérifier les droits d'édition selon le rôle et le statut :
        // - CLIENT ne peut modifier que les devis DRAFT (avant soumission)
        // - Agent (ADMIN/OPERATIONS_MANAGER) peut modifier les devis SUBMITTED (pour ajuster avant envoi)
        const isAgent = userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER';
        const canEdit = quote.status === 'DRAFT' || (isAgent && quote.status === 'SUBMITTED');

        if (!canEdit) {
          setError('Ce devis ne peut plus être modifié (statut: ' + quote.status + ')');
          return;
        }

        setQuoteData(quote as QuoteData);
      } catch (err) {
        setError('Erreur lors du chargement du devis');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    // Attendre que la session soit chargée avant de vérifier les droits
    if (!isSessionLoading) {
      loadQuote();
    }
  }, [id, userRole, isSessionLoading]);

  // État de chargement
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Separator />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
            <Link href="/dashboard/quotes">
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste
            </Link>
          </Button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800 font-medium">{error}</p>
            <p className="text-red-600 text-sm mt-2">
              Vous ne pouvez pas modifier ce devis.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Devis non trouvé (ne devrait pas arriver car on gère l'erreur)
  if (!quoteData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
          <Link href={`/dashboard/quotes/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Retour au devis
          </Link>
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">Modifier le devis</h1>
        <p className="text-muted-foreground">
          {quoteData.quoteNumber} - Modifiez les informations de votre devis
        </p>
      </div>

      <Separator />

      {/* Formulaire - Rendu seulement quand les données sont disponibles */}
      <QuoteEditForm quoteData={quoteData} quoteId={id} />
    </div>
  );
}
