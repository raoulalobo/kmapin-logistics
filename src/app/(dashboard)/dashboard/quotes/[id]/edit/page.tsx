/**
 * Page Édition de Devis
 *
 * Permet au CLIENT de modifier son devis tant qu'il est en statut DRAFT.
 * Une fois envoyé (SENT), le devis est verrouillé et ne peut plus être modifié.
 *
 * Règles métier :
 * - Seul le CLIENT propriétaire peut modifier son devis
 * - Seuls les devis en statut DRAFT sont modifiables
 * - Les agents ne peuvent pas modifier les devis (ils peuvent annuler/traiter)
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
import { calculateQuoteEstimateV2Action } from '@/modules/quotes/actions/calculate-quote-estimate-v2';
import { useSafeSession } from '@/lib/auth/hooks';

/**
 * Page d'édition d'un devis
 *
 * Charge le devis existant et permet sa modification
 * Accessible uniquement aux clients avec un devis DRAFT
 */
export default function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // États de chargement et données
  const [isLoading, setIsLoading] = useState(true);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Session utilisateur
  const { data: session } = useSafeSession();
  const isClient = session?.user?.role === 'CLIENT';

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

        // Vérifier que le devis est en DRAFT
        if (quote.status !== 'DRAFT') {
          setError('Ce devis ne peut plus être modifié (statut: ' + quote.status + ')');
          return;
        }

        setQuoteData(quote);
        setEstimatedPrice(Number(quote.estimatedCost));
      } catch (err) {
        setError('Erreur lors du chargement du devis');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadQuote();
  }, [id]);

  // Formulaire avec valeurs par défaut (sera réinitialisé une fois les données chargées)
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      clientId: '',
      originCountry: 'FR',
      destinationCountry: '',
      cargoType: 'GENERAL' as CargoType,
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      transportMode: ['ROAD' as TransportMode],
      estimatedCost: 0,
      currency: 'EUR',
      validUntil: new Date().toISOString(),
      status: 'DRAFT',
    },
  });

  // Réinitialiser le formulaire quand les données sont chargées
  useEffect(() => {
    if (quoteData) {
      form.reset({
        clientId: quoteData.clientId || '',
        originCountry: quoteData.originCountry,
        destinationCountry: quoteData.destinationCountry,
        cargoType: quoteData.cargoType as CargoType,
        weight: Number(quoteData.weight),
        length: Number(quoteData.length) || 0,
        width: Number(quoteData.width) || 0,
        height: Number(quoteData.height) || 0,
        transportMode: quoteData.transportMode as TransportMode[],
        estimatedCost: Number(quoteData.estimatedCost),
        currency: quoteData.currency,
        validUntil: quoteData.validUntil,
        status: 'DRAFT', // Toujours DRAFT en édition
      });
    }
  }, [quoteData, form]);

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
  const watchedFields = form.watch([
    'originCountry',
    'destinationCountry',
    'cargoType',
    'weight',
    'length',
    'width',
    'height',
    'transportMode',
  ]);

  // Mise à jour du prix quand la devise change
  useEffect(() => {
    if (estimatedPrice !== null) {
      const convertedPrice = getConvertedPrice(estimatedPrice, selectedCurrency);
      form.setValue('estimatedCost', convertedPrice);
    }
  }, [selectedCurrency, estimatedPrice]);

  // Calcul automatique du prix
  useEffect(() => {
    // Ne pas calculer tant que les données ne sont pas chargées
    if (!quoteData) return;

    async function calculatePrice() {
      const values = form.getValues();

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
        const estimateData = {
          originCountry: values.originCountry,
          destinationCountry: values.destinationCountry,
          cargoType: values.cargoType,
          weight: values.weight,
          length: values.length || 0,
          width: values.width || 0,
          height: values.height || 0,
          transportMode: values.transportMode,
          priority: 'STANDARD' as const,
        };

        const result = await calculateQuoteEstimateV2Action(estimateData);

        if (result.success && result.data) {
          const calculatedPrice = result.data.estimatedCost;
          setEstimatedPrice(calculatedPrice);
          form.setValue('estimatedCost', calculatedPrice);
        }
      } catch (error) {
        console.error('Erreur calcul prix:', error);
      } finally {
        setIsCalculating(false);
      }
    }

    const timeoutId = setTimeout(calculatePrice, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedFields, quoteData]);

  /**
   * Soumission du formulaire - Mise à jour du devis
   */
  async function onSubmit(data: QuoteFormData) {
    try {
      const formData = new FormData();

      formData.append('clientId', data.clientId);
      formData.append('originCountry', data.originCountry);
      formData.append('destinationCountry', data.destinationCountry);
      formData.append('cargoType', data.cargoType);
      formData.append('weight', data.weight.toString());

      if (data.length) formData.append('length', data.length.toString());
      if (data.width) formData.append('width', data.width.toString());
      if (data.height) formData.append('height', data.height.toString());

      data.transportMode.forEach(mode => formData.append('transportMode', mode));

      formData.append('estimatedCost', data.estimatedCost.toString());
      formData.append('currency', data.currency);
      formData.append('validUntil', data.validUntil);
      formData.append('status', 'DRAFT'); // Toujours DRAFT en édition

      const result = await updateQuoteAction(id, formData);

      if (result.success) {
        toast.success('Devis mis à jour avec succès');
        router.push(`/dashboard/quotes/${id}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
      console.error('Erreur mise à jour devis:', error);
    }
  }

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
          {quoteData?.quoteNumber} - Modifiez les informations de votre devis
        </p>
      </div>

      <Separator />

      {/* Formulaire */}
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
              <CardDescription>Pays d'origine et de destination</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="originCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays d'origine *</FormLabel>
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
                        {...field}
                        type="number"
                        min="0"
                        step="0.1"
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
                            {...field}
                            type="number"
                            min="0"
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
                            {...field}
                            type="number"
                            min="0"
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
                            {...field}
                            type="number"
                            min="0"
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
                        <SelectItem value="ROAD">Routier</SelectItem>
                        <SelectItem value="SEA">Maritime</SelectItem>
                        <SelectItem value="AIR">Aérien</SelectItem>
                        <SelectItem value="RAIL">Ferroviaire</SelectItem>
                      </SelectContent>
                    </Select>
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
    </div>
  );
}
