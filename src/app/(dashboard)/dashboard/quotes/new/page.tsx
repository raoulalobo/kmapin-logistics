/**
 * Page Création de Devis
 *
 * Formulaire de création d'un nouveau devis.
 * - Client Component avec React Hook Form
 * - Validation Zod via le schéma du module quotes
 * - Calcul automatique du prix estimé (même logique que la homepage)
 * - Redirection vers la liste après création réussie
 * - Toast de confirmation/erreur
 * - Chargement dynamique de la liste des clients
 */

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, FloppyDisk, Calculator } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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
import { ClientSelect } from '@/components/forms/client-select';
import { CountrySelect } from '@/components/countries/country-select';

import { quoteSchema, type QuoteFormData, createQuoteAction } from '@/modules/quotes';
import { CargoType, TransportMode } from '@/generated/prisma';
import { calculateQuoteEstimateV2Action } from '@/modules/quotes/actions/calculate-quote-estimate-v2';
import { useSafeSession } from '@/lib/auth/hooks';

export default function NewQuotePage() {
  const router = useRouter();
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Récupérer la session utilisateur pour gérer l'affichage conditionnel du champ client
  const { data: session } = useSafeSession();

  // Calculer la date de validité par défaut (30 jours à partir d'aujourd'hui)
  const getDefaultValidUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // +30 jours
    return date.toISOString(); // Format ISO 8601 complet
  };

  // Vérifier si l'utilisateur est un CLIENT (ne peut créer des devis que pour sa propre company)
  const isClient = session?.user?.role === 'CLIENT';
  const userCompanyId = session?.user?.companyId || '';

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      // Si CLIENT : pré-remplir automatiquement avec son companyId, sinon laisser vide
      companyId: isClient ? userCompanyId : '',
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
      validUntil: getDefaultValidUntil(),
      status: 'DRAFT',
    },
  });

  // Surveiller la devise sélectionnée
  const selectedCurrency = form.watch('currency');

  // Taux de conversion depuis EUR (approximatifs)
  const conversionRates: Record<string, number> = {
    EUR: 1,
    USD: 1.09,
    GBP: 0.86,
    CHF: 0.96,
  };

  // Symboles de devises
  const currencySymbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
  };

  // Convertir le prix selon la devise sélectionnée
  const getConvertedPrice = (priceInEUR: number, targetCurrency: string): number => {
    const rate = conversionRates[targetCurrency] || 1;
    return priceInEUR * rate;
  };

  // Obtenir le symbole de la devise
  const getCurrencySymbol = (currency: string): string => {
    return currencySymbols[currency] || currency;
  };

  // Watcher pour recalculer le prix automatiquement
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

  /**
   * Mettre à jour le champ estimatedCost quand la devise change
   */
  useEffect(() => {
    if (estimatedPrice !== null) {
      const convertedPrice = getConvertedPrice(estimatedPrice, selectedCurrency);
      form.setValue('estimatedCost', convertedPrice);
    }
  }, [selectedCurrency, estimatedPrice]);

  /**
   * Calculer automatiquement le prix estimé
   * Utilise la même logique que le calculateur de la homepage
   */
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
        setEstimatedPrice(null);
        return;
      }

      setIsCalculating(true);

      try {
        // Préparer les données pour le calculateur
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

        // Calculer le prix avec la Server Action
        const result = await calculateQuoteEstimateV2Action(estimateData);

        if (result.success && result.data) {
          const calculatedPrice = result.data.estimatedCost;
          setEstimatedPrice(calculatedPrice);

          // Mettre à jour le champ estimatedCost dans le formulaire
          form.setValue('estimatedCost', calculatedPrice);
        } else {
          setEstimatedPrice(null);
          toast.error('Impossible de calculer le prix', {
            description: result.error || 'Vérifiez les paramètres saisis',
          });
        }
      } catch (error) {
        console.error('Erreur calcul prix:', error);
        setEstimatedPrice(null);
      } finally {
        setIsCalculating(false);
      }
    }

    // Déclencher le calcul avec un debounce
    const timeoutId = setTimeout(calculatePrice, 500);
    return () => clearTimeout(timeoutId);
  }, watchedFields);

  /**
   * Soumission du formulaire
   * Convertit les données du formulaire en FormData pour l'action serveur
   */
  async function onSubmit(data: QuoteFormData) {
    try {
      // Créer un FormData à partir des données du formulaire
      const formData = new FormData();

      // Ajouter tous les champs requis
      formData.append('companyId', data.companyId);
      formData.append('originCountry', data.originCountry);
      formData.append('destinationCountry', data.destinationCountry);
      formData.append('cargoType', data.cargoType);
      formData.append('weight', data.weight.toString());

      // Dimensions (optionnelles)
      if (data.length) formData.append('length', data.length.toString());
      if (data.width) formData.append('width', data.width.toString());
      if (data.height) formData.append('height', data.height.toString());

      // Transport mode (array)
      data.transportMode.forEach(mode => formData.append('transportMode', mode));

      formData.append('estimatedCost', data.estimatedCost.toString());
      formData.append('currency', data.currency);
      formData.append('validUntil', data.validUntil);
      formData.append('status', data.status || 'DRAFT');

      const result = await createQuoteAction(formData);

      if (result.success) {
        toast.success(`Devis créé avec succès (N° ${result.data.quoteNumber})`);
        router.push('/dashboard/quotes');
        router.refresh();
      } else {
        toast.error(result.error || 'Erreur lors de la création du devis');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
      console.error('Erreur création devis:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/quotes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nouveau Devis</h1>
        <p className="text-muted-foreground">
          {isClient ? 'Créez un nouveau devis pour votre entreprise' : 'Créez un nouveau devis pour votre client'}
        </p>
      </div>

      <Separator />

      {/* Formulaire */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Client - Masqué pour les CLIENTs (ils ne peuvent créer des devis que pour leur propre company) */}
          {!isClient && (
            <Card>
              <CardHeader>
                <CardTitle>Client</CardTitle>
                <CardDescription>
                  Sélectionnez le client pour ce devis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <FormControl>
                        <ClientSelect
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Rechercher un client..."
                        />
                      </FormControl>
                      <FormDescription>
                        Recherchez par nom, raison sociale ou email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Route */}
          <Card>
            <CardHeader>
              <CardTitle>Itinéraire</CardTitle>
              <CardDescription>
                Pays d'origine et de destination
              </CardDescription>
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
                      <FormDescription>
                        Pays de départ de la marchandise
                      </FormDescription>
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
                      <FormDescription>
                        Pays d'arrivée de la marchandise
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Marchandise */}
          <Card>
            <CardHeader>
              <CardTitle>Détails de la marchandise</CardTitle>
              <CardDescription>
                Informations sur le contenu à transporter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="cargoType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de marchandise *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        placeholder="0"
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Poids total de la marchandise en kilogrammes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dimensions (optionnelles) */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Dimensions (optionnelles)
                </label>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-muted-foreground">Longueur (m)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
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
                        <FormLabel className="text-sm text-muted-foreground">Largeur (m)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
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
                        <FormLabel className="text-sm text-muted-foreground">Hauteur (m)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Les dimensions permettent un calcul plus précis du prix (volume = L × l × h)
                </p>
              </div>

              <FormField
                control={form.control}
                name="transportMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode de transport *</FormLabel>
                    <Select onValueChange={(value) => field.onChange([value as TransportMode])} defaultValue={field.value[0]}>
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
                    <FormDescription>
                      Sélectionnez le mode de transport principal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Coût et validité */}
          <Card>
            <CardHeader>
              <CardTitle>Tarification et validité</CardTitle>
              <CardDescription>
                Montant du devis et date de validité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prix estimé calculé automatiquement */}
              {estimatedPrice !== null && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Prix calculé automatiquement</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {getConvertedPrice(estimatedPrice, selectedCurrency).toFixed(2)} {getCurrencySymbol(selectedCurrency)}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Basé sur les paramètres saisis. Vous pouvez ajuster le prix manuellement ci-dessous.
                  </p>
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
                          min="0"
                          step="0.01"
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {isCalculating ? 'Calcul en cours...' : 'Montant du devis en euros (modifiable)'}
                      </FormDescription>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valide jusqu'au *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Convertir datetime-local vers ISO 8601
                            const isoDate = new Date(e.target.value).toISOString();
                            field.onChange(isoDate);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Date et heure limite de validité du devis
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Brouillon</SelectItem>
                        <SelectItem value="SENT">Envoyer au client</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choisissez "Brouillon" pour sauvegarder sans envoyer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <FloppyDisk className="mr-2 h-4 w-4" />
              {form.formState.isSubmitting ? 'Création...' : 'Créer le devis'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Annuler
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
