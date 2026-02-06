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
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import { useFormValidation } from '@/hooks/use-form-validation';

import { quoteSchema, type QuoteFormData, createQuoteAction } from '@/modules/quotes';
import { CargoType, TransportMode } from '@/lib/db/enums';
import { calculateQuoteEstimateV2Action } from '@/modules/quotes/actions/calculate-quote-estimate-v2';
import { useSafeSession } from '@/lib/auth/hooks';
import {
  getTransportModeOptionsAction,
  getPriorityOptionsAction,
  type TransportModeOption,
  type PriorityOption,
} from '@/modules/pricing-config';
import { PackageFieldArray } from '@/components/quotes';

export default function NewQuotePage() {
  const router = useRouter();
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Options dynamiques avec labels incluant les multiplicateurs/surcharges configurés
  const [transportModeOptions, setTransportModeOptions] = useState<TransportModeOption[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<PriorityOption[]>([]);

  // Récupérer la session utilisateur pour gérer l'affichage conditionnel du champ client
  const { data: session } = useSafeSession();

  // Calculer la date de validité par défaut (30 jours à partir d'aujourd'hui)
  const getDefaultValidUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // +30 jours
    return date.toISOString(); // Format ISO 8601 complet
  };

  // Vérifier si l'utilisateur est un CLIENT (ne peut créer des devis que pour son propre client)
  const isClient = session?.user?.role === 'CLIENT';
  const userClientId = session?.user?.clientId || '';

  // === DIAGNOSTIC LOGS - Chargement session CLIENT ===
  console.log('[NewQuotePage] === DIAGNOSTIC SESSION CLIENT ===');
  console.log('[NewQuotePage] Session chargée?', !!session);
  console.log('[NewQuotePage] session?.user?.role:', session?.user?.role);
  console.log('[NewQuotePage] isClient:', isClient);
  console.log('[NewQuotePage] session?.user?.clientId:', session?.user?.clientId);
  console.log('[NewQuotePage] userClientId (après || ""):', userClientId);
  console.log('[NewQuotePage] userClientId est vide?', !userClientId || userClientId === '');
  // === FIN DIAGNOSTIC ===

  // Charger les options de mode de transport et de priorité au montage
  // Les labels incluent les multiplicateurs et surcharges configurés dans PricingConfig
  useEffect(() => {
    async function loadOptions() {
      // Charger les deux types d'options en parallèle
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

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      // Si CLIENT : pré-remplir automatiquement avec son clientId, sinon laisser vide
      clientId: isClient ? userClientId : '',
      originCountry: 'FR',
      destinationCountry: '',
      // Champs plats conservés comme agrégats (calculés depuis packages[])
      cargoType: 'GENERAL' as CargoType,
      weight: 0,
      length: undefined as unknown as number,
      width: undefined as unknown as number,
      height: undefined as unknown as number,
      // Colis détaillés — source de vérité pour la marchandise
      // Une ligne par défaut avec des valeurs vides (l'utilisateur remplit)
      packages: [
        {
          description: '',
          quantity: 1,
          cargoType: 'GENERAL' as CargoType,
          weight: undefined as unknown as number,
          length: undefined as unknown as number,
          width: undefined as unknown as number,
          height: undefined as unknown as number,
        },
      ],
      // Adresses expéditeur (optionnelles)
      originAddress: '',
      originCity: '',
      originPostalCode: '',
      originContactName: '',
      originContactPhone: '',
      originContactEmail: '',
      // Adresses destinataire (optionnelles)
      destinationAddress: '',
      destinationCity: '',
      destinationPostalCode: '',
      destinationContactName: '',
      destinationContactPhone: '',
      destinationContactEmail: '',
      transportMode: ['ROAD' as TransportMode],
      // Priorité de livraison (défaut: STANDARD)
      priority: 'STANDARD' as 'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT',
      estimatedCost: 0,
      currency: 'EUR',
      validUntil: getDefaultValidUntil(),
      status: 'DRAFT',
    },
  });

  /**
   * Hook de validation améliorée (toast + scroll + focus)
   */
  const { onSubmitWithValidation, errorMessages } = useFormValidation(form, {
    toastTitle: 'Formulaire incomplet',
    fieldLabels: {
      clientId: 'Client',
      originCountry: 'Pays d\'origine',
      destinationCountry: 'Pays de destination',
      cargoType: 'Type de marchandise',
      weight: 'Poids',
      length: 'Longueur',
      width: 'Largeur',
      height: 'Hauteur',
      // Adresse expéditeur
      originAddress: 'Adresse expéditeur',
      originCity: 'Ville expéditeur',
      originPostalCode: 'Code postal expéditeur',
      originContactName: 'Nom contact expéditeur',
      originContactPhone: 'Téléphone contact expéditeur',
      originContactEmail: 'Email contact expéditeur',
      // Adresse destinataire
      destinationAddress: 'Adresse destinataire',
      destinationCity: 'Ville destinataire',
      destinationPostalCode: 'Code postal destinataire',
      destinationContactName: 'Nom contact destinataire',
      destinationContactPhone: 'Téléphone contact destinataire',
      destinationContactEmail: 'Email contact destinataire',
      transportMode: 'Mode de transport',
      estimatedCost: 'Coût estimé',
      currency: 'Devise',
      validUntil: 'Date de validité',
      status: 'Statut',
    },
  });

  /**
   * Mettre à jour le clientId quand la session se charge (pour les utilisateurs CLIENT)
   *
   * Problème résolu : useForm({ defaultValues }) est calculé au premier render,
   * AVANT que la session soit chargée. Ce useEffect met à jour le clientId
   * dès que la session est disponible.
   */
  useEffect(() => {
    if (session?.user?.role === 'CLIENT' && session?.user?.clientId) {
      const currentClientId = form.getValues('clientId');
      // Ne mettre à jour que si le clientId est vide (pas encore initialisé)
      if (!currentClientId || currentClientId === '') {
        console.log('[NewQuotePage] Mise à jour clientId depuis session:', session.user.clientId);
        form.setValue('clientId', session.user.clientId);
      }
    }
  }, [session?.user?.role, session?.user?.clientId, form]);

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
  // Surveille les packages (colis détaillés) + route + transport + priorité
  // NOTE : form.watch('packages') retourne une référence d'array qui ne change pas
  // quand les propriétés internes changent (ex: weight d'un colis).
  // On sérialise en JSON pour forcer une comparaison par VALEUR au lieu de par référence.
  const watchedOrigin = form.watch('originCountry');
  const watchedDestination = form.watch('destinationCountry');
  const watchedPackages = form.watch('packages');
  const watchedTransportMode = form.watch('transportMode');
  const watchedPriority = form.watch('priority');
  // Clé de dépendance sérialisée — change dès qu'un champ interne de packages change
  const packagesKey = JSON.stringify(watchedPackages);

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
   * Calculer automatiquement le prix estimé à partir des packages
   *
   * Itère sur chaque package, calcule le prix via calculateQuoteEstimateV2Action,
   * et somme les résultats. Calcule aussi les agrégats (poids total, cargoType dominant).
   */
  useEffect(() => {
    async function calculatePrice() {
      const values = form.getValues();
      const packages = values.packages || [];

      // Vérifier que les champs globaux sont remplis
      if (
        !values.originCountry ||
        !values.destinationCountry ||
        !values.transportMode ||
        values.transportMode.length === 0
      ) {
        setEstimatedPrice(null);
        return;
      }

      // Vérifier qu'au moins un package a un poids valide
      const validPackages = packages.filter(
        (pkg: { weight?: number }) => pkg.weight && pkg.weight > 0
      );
      if (validPackages.length === 0) {
        setEstimatedPrice(null);
        return;
      }

      setIsCalculating(true);

      try {
        // Calculer le prix pour chaque package individuellement
        // puis sommer (le calcul complet multi-packages sera fait côté serveur)
        let totalPrice = 0;

        for (const pkg of validPackages) {
          const estimateData = {
            originCountry: values.originCountry,
            destinationCountry: values.destinationCountry,
            cargoType: pkg.cargoType || 'GENERAL',
            weight: pkg.weight,
            length: pkg.length || 0,
            width: pkg.width || 0,
            height: pkg.height || 0,
            transportMode: values.transportMode,
            // Priorité STANDARD par package, la surcharge priorité sera ajoutée au total
            priority: 'STANDARD' as const,
          };

          const result = await calculateQuoteEstimateV2Action(estimateData);

          if (result.success && result.data) {
            // Multiplier le prix unitaire par la quantité de ce package
            const quantity = pkg.quantity || 1;
            totalPrice += result.data.estimatedCost * quantity;
          }
        }

        // Appliquer la surcharge priorité sur le total global
        // Pour récupérer le coefficient, on fait un calcul de référence
        const priority = (values.priority || 'STANDARD') as 'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT';
        if (priority !== 'STANDARD' && totalPrice > 0) {
          // Calcul de référence pour obtenir le ratio de surcharge priorité
          const refBase = await calculateQuoteEstimateV2Action({
            originCountry: values.originCountry,
            destinationCountry: values.destinationCountry,
            cargoType: 'GENERAL',
            weight: 1,
            length: 0,
            width: 0,
            height: 0,
            transportMode: values.transportMode,
            priority: 'STANDARD',
          });
          const refWithPriority = await calculateQuoteEstimateV2Action({
            originCountry: values.originCountry,
            destinationCountry: values.destinationCountry,
            cargoType: 'GENERAL',
            weight: 1,
            length: 0,
            width: 0,
            height: 0,
            transportMode: values.transportMode,
            priority,
          });

          if (refBase.success && refWithPriority.success && refBase.data && refWithPriority.data) {
            // Calculer le coefficient de priorité depuis les deux résultats
            const coeffPriorite = refBase.data.estimatedCost > 0
              ? refWithPriority.data.estimatedCost / refBase.data.estimatedCost
              : 1;
            totalPrice = totalPrice * coeffPriorite;
          }
        }

        // Calculer les agrégats depuis les packages
        // Poids total = somme de (weight × quantity) pour chaque package
        const totalWeight = validPackages.reduce(
          (sum: number, pkg: { weight: number; quantity?: number }) =>
            sum + pkg.weight * (pkg.quantity || 1),
          0
        );

        // Type dominant = le type le plus fréquent (pondéré par quantité)
        const typeCounts: Record<string, number> = {};
        for (const pkg of validPackages) {
          const type = pkg.cargoType || 'GENERAL';
          typeCounts[type] = (typeCounts[type] || 0) + (pkg.quantity || 1);
        }
        const dominantType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'GENERAL';

        // Mettre à jour les champs agrégats sur le formulaire (pour le serveur)
        form.setValue('weight', totalWeight);
        form.setValue('cargoType', dominantType as CargoType);

        const finalPrice = Math.round(totalPrice * 100) / 100;
        setEstimatedPrice(finalPrice);
        form.setValue('estimatedCost', finalPrice);
      } catch (error) {
        console.error('Erreur calcul prix multi-packages:', error);
        setEstimatedPrice(null);
      } finally {
        setIsCalculating(false);
      }
    }

    // Déclencher le calcul avec un debounce (700ms car multi-packages = plus d'appels)
    const timeoutId = setTimeout(calculatePrice, 700);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedOrigin, watchedDestination, packagesKey, watchedTransportMode, watchedPriority]);

  /**
   * Soumission du formulaire
   * Convertit les données du formulaire en FormData pour l'action serveur
   */
  async function onSubmit(data: QuoteFormData) {
    try {
      // === DIAGNOSTIC LOGS ===
      console.log('[NewQuotePage] === DIAGNOSTIC CLIENTID ===');
      console.log('[NewQuotePage] Session user:', {
        role: session?.user?.role,
        clientId: session?.user?.clientId,
      });
      console.log('[NewQuotePage] Form data.clientId:', data.clientId);
      console.log('[NewQuotePage] Type de clientId:', typeof data.clientId);
      console.log('[NewQuotePage] clientId vide?', !data.clientId || data.clientId === '');
      console.log('[NewQuotePage] clientId longueur:', data.clientId?.length);
      // === FIN DIAGNOSTIC ===

      // Créer un FormData à partir des données du formulaire
      const formData = new FormData();

      // Ajouter tous les champs requis
      formData.append('clientId', data.clientId);
      formData.append('originCountry', data.originCountry);
      formData.append('destinationCountry', data.destinationCountry);
      formData.append('cargoType', data.cargoType);
      formData.append('weight', data.weight.toString());

      // Dimensions agrégats (optionnelles — conservées pour rétrocompatibilité)
      if (data.length) formData.append('length', data.length.toString());
      if (data.width) formData.append('width', data.width.toString());
      if (data.height) formData.append('height', data.height.toString());

      // Sérialiser les packages (colis détaillés) en JSON
      // Le serveur les extraira et créera les QuotePackage associés
      if (data.packages && data.packages.length > 0) {
        formData.append('packages', JSON.stringify(data.packages));
      }

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

      // Priorité de livraison (utilisée par le moteur de pricing serveur pour le calcul des surcharges)
      formData.append('priority', data.priority || 'STANDARD');

      formData.append('estimatedCost', data.estimatedCost.toString());
      formData.append('currency', data.currency);
      formData.append('validUntil', data.validUntil);
      formData.append('status', data.status || 'DRAFT');

      // === DIAGNOSTIC LOGS ===
      console.log('[NewQuotePage] FormData clientId envoyé:', formData.get('clientId'));
      console.log('[NewQuotePage] Type FormData clientId:', typeof formData.get('clientId'));
      // === FIN DIAGNOSTIC ===

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
        <Button variant="ghost" size="sm" asChild className="mb-4 gap-2">
          <Link href="/dashboard/quotes">
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">Nouveau Devis</h1>
        <p className="text-muted-foreground">
          {isClient ? 'Créez un nouveau devis pour votre entreprise' : 'Créez un nouveau devis pour votre client'}
        </p>
      </div>

      <Separator />

      {/* Formulaire */}
      <Form {...form}>
        <form onSubmit={onSubmitWithValidation(onSubmit)} className="space-y-6">
          {/* Bannière de résumé des erreurs */}
          <FormErrorSummary
            errors={errorMessages}
            title="Veuillez corriger les erreurs suivantes"
            className="mb-6"
          />

          {/* Client - Masqué pour les CLIENTs (ils ne peuvent créer des devis que pour leur propre company) */}
          {!isClient && (
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle>Client</CardTitle>
                <CardDescription>
                  Sélectionnez le client pour ce devis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="clientId"
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
          <Card className="dashboard-card">
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

          {/* Adresse Expéditeur (Optionnelle) */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Adresse Expéditeur (Obligatoire)</CardTitle>
              <CardDescription>
                Adresse complète de l'expéditeur - Permet un traitement plus rapide du devis
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
                      <FormDescription>
                        Rue, numéro, bâtiment
                      </FormDescription>
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

          {/* Adresse Destinataire (Optionnelle) */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Adresse Destinataire (Obligatoire)</CardTitle>
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
                      <FormDescription>
                        Rue, numéro, bâtiment
                      </FormDescription>
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

          {/* Colis (Packages) — Section multi-colis dynamique */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Détails des colis</CardTitle>
              <CardDescription>
                Ajoutez un ou plusieurs types de colis. Chaque ligne représente un type de colis
                avec sa quantité, son type de marchandise, son poids et ses dimensions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Composant dynamique pour ajouter/supprimer des lignes de colis */}
              <PackageFieldArray control={form.control} />
            </CardContent>
          </Card>

          {/* Transport et Priorité */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Transport</CardTitle>
              <CardDescription>
                Mode de transport et priorité de livraison
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <FormDescription>
                      Le mode de transport affecte le prix et le délai de livraison
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priorité de livraison - Affecte le prix et le délai */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité de livraison</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'STANDARD'}>
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

          {/* Coût et validité */}
          <Card className="dashboard-card">
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
                    Basé sur les paramètres saisis (poids, dimensions, route, mode de transport).
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
                          readOnly
                          className="bg-muted cursor-not-allowed"
                        />
                      </FormControl>
                      <FormDescription>
                        {isCalculating ? 'Calcul en cours...' : 'Montant calculé automatiquement (non modifiable)'}
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
                        readOnly={isClient}
                        className={isClient ? 'bg-muted cursor-not-allowed' : ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {isClient
                        ? 'Validité par défaut : 30 jours (non modifiable)'
                        : 'Date et heure limite de validité du devis'}
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
                        <SelectItem value="SENT">
                          {isClient ? 'Soumettre pour validation' : 'Envoyer au client'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {isClient
                        ? 'Choisissez "Brouillon" pour sauvegarder sans envoyer, ou "Soumettre" pour notifier les responsables'
                        : 'Choisissez "Brouillon" pour sauvegarder sans envoyer, ou "Envoyer" pour transmettre au client'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              {form.formState.isSubmitting ? 'Création en cours...' : 'Créer le devis'}
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
