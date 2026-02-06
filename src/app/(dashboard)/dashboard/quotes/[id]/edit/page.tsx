/**
 * Page Édition de Devis (avec support multi-colis)
 *
 * Permet de modifier un devis existant avec le support des colis détaillés (packages).
 * Utilise le composant PackageFieldArray pour la gestion dynamique des lignes de colis.
 *
 * Règles métier :
 * - Le CLIENT propriétaire peut modifier son devis en DRAFT
 * - Les agents (ADMIN, OPERATIONS_MANAGER) peuvent modifier les devis en SUBMITTED
 *   pour ajuster les prix, routes, cargo avant envoi au client
 *
 * Architecture :
 * - EditQuotePage : Composant principal qui charge les données via getQuoteAction
 * - QuoteEditForm : Composant formulaire qui reçoit les données en props
 *   (séparé pour garantir que useForm est initialisé avec les bonnes defaultValues)
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
import { PackageFieldArray } from '@/components/quotes';

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
 * Type des priorités disponibles pour la livraison
 * - STANDARD : Délai normal, aucun supplément
 * - NORMAL : Légèrement accéléré, +10%
 * - EXPRESS : Livraison rapide, +50%
 * - URGENT : Prioritaire, +30%
 */
type PriorityType = 'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT';

/**
 * Type pour un colis chargé depuis la base de données (QuotePackage)
 * Correspond au modèle Prisma QuotePackage avec les champs nécessaires au formulaire
 */
interface PackageData {
  id: string;
  description: string | null;
  quantity: number;
  cargoType: string;
  weight: number;
  length: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Type pour les données du devis chargées depuis getQuoteAction
 * Inclut maintenant les packages (colis détaillés) en plus des champs plats agrégés
 */
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
  priority: PriorityType | null;
  estimatedCost: number;
  currency: string;
  validUntil: Date | string;
  status: string;
  // Colis détaillés (QuotePackage[]) — source de vérité pour la marchandise
  packages?: PackageData[];
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT FORMULAIRE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Composant formulaire d'édition de devis avec support multi-colis
 *
 * Séparé du composant principal pour garantir que useForm()
 * est initialisé avec les bonnes valeurs dès le départ.
 * Les packages existants sont pré-remplis dans le useFieldArray.
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

  /**
   * Construire les defaultValues des packages depuis les données existantes
   *
   * Si le devis a des packages en DB → pré-remplir avec ces packages
   * Si le devis n'a pas de packages (ancien devis) → créer un package unique
   *   depuis les champs plats (cargoType, weight, length, width, height)
   * Cela garantit la rétrocompatibilité avec les devis créés avant le multi-colis
   */
  const defaultPackages = quoteData.packages && quoteData.packages.length > 0
    ? quoteData.packages.map((pkg) => ({
        description: pkg.description || '',
        quantity: pkg.quantity,
        cargoType: pkg.cargoType as CargoType,
        weight: pkg.weight,
        length: pkg.length || undefined,
        width: pkg.width || undefined,
        height: pkg.height || undefined,
      }))
    : [{
        // Fallback pour les anciens devis sans packages : reconstruire depuis les champs plats
        description: '',
        quantity: 1,
        cargoType: quoteData.cargoType as CargoType,
        weight: Number(quoteData.weight),
        length: quoteData.length ? Number(quoteData.length) : undefined,
        width: quoteData.width ? Number(quoteData.width) : undefined,
        height: quoteData.height ? Number(quoteData.height) : undefined,
      }];

  // Formulaire initialisé avec les données du devis existant
  // Les valeurs sont disponibles dès le premier rendu grâce à la séparation composant
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      clientId: quoteData.clientId || '',
      originCountry: quoteData.originCountry,
      destinationCountry: quoteData.destinationCountry,
      // Champs agrégats (calculés depuis packages[], conservés pour rétrocompatibilité)
      cargoType: quoteData.cargoType as CargoType,
      weight: Number(quoteData.weight),
      length: quoteData.length ? Number(quoteData.length) : undefined,
      width: quoteData.width ? Number(quoteData.width) : undefined,
      height: quoteData.height ? Number(quoteData.height) : undefined,
      // Colis détaillés — source de vérité pour la marchandise
      packages: defaultPackages,
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
      validUntil: quoteData.validUntil instanceof Date
        ? quoteData.validUntil.toISOString()
        : typeof quoteData.validUntil === 'string'
          ? quoteData.validUntil
          : new Date(quoteData.validUntil).toISOString(),
      // Préserver le statut actuel (DRAFT pour client, SUBMITTED pour agent)
      status: quoteData.status as QuoteFormData['status'],
    },
  });

  // Hook de validation améliorée (toast + scroll + focus)
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

  // Devise sélectionnée pour la conversion d'affichage
  const selectedCurrency = form.watch('currency');

  // Taux de conversion approximatifs depuis EUR
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

  // ── Watchers pour recalculer le prix automatiquement ──
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

  // Mise à jour du prix quand la devise change
  useEffect(() => {
    if (estimatedPrice !== null) {
      const convertedPrice = getConvertedPrice(estimatedPrice, selectedCurrency);
      form.setValue('estimatedCost', convertedPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, estimatedPrice]);

  /**
   * Calculer automatiquement le prix estimé à partir des packages
   *
   * Même logique que le formulaire de création (new/page.tsx) :
   * 1. Itère sur chaque package, calcule le prix via calculateQuoteEstimateV2Action
   * 2. Multiplie par la quantité de chaque package
   * 3. Somme les résultats
   * 4. Applique la surcharge priorité sur le total global
   * 5. Met à jour les agrégats (poids total, cargoType dominant)
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
        return;
      }

      // Vérifier qu'au moins un package a un poids valide
      const validPackages = packages.filter(
        (pkg: { weight?: number }) => pkg.weight && pkg.weight > 0
      );
      if (validPackages.length === 0) {
        return;
      }

      setIsCalculating(true);

      try {
        // Calculer le prix pour chaque package individuellement puis sommer
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
        const priority = (values.priority || 'STANDARD') as PriorityType;
        if (priority !== 'STANDARD' && totalPrice > 0) {
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
   * Soumission du formulaire - Mise à jour du devis
   * Convertit les données du formulaire en FormData pour l'action serveur
   * Inclut la sérialisation des packages en JSON
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

      // Dimensions agrégats (optionnelles — conservées pour rétrocompatibilité)
      if (data.length) formData.append('length', data.length.toString());
      if (data.width) formData.append('width', data.width.toString());
      if (data.height) formData.append('height', data.height.toString());

      // Sérialiser les packages (colis détaillés) en JSON
      // Le serveur les extraira, supprimera les anciens QuotePackage, et créera les nouveaux
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

      // Transport mode (array — chaque mode ajouté séparément pour FormData.getAll())
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

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* COLIS DÉTAILLÉS (Packages) — Section multi-colis dynamique */}
        {/* Remplace l'ancienne section "Détails de la marchandise" */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Détails des colis</CardTitle>
            <CardDescription>
              Ajoutez un ou plusieurs types de colis. Chaque ligne représente un type de colis
              avec sa quantité, son type de marchandise, son poids et ses dimensions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Composant dynamique useFieldArray pour ajouter/supprimer des lignes de colis */}
            <PackageFieldArray control={form.control} />
          </CardContent>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TRANSPORT ET PRIORITÉ */}
        {/* Séparé des colis car ce sont des paramètres globaux du devis */}
        {/* ════════════════════════════════════════════════════════════════ */}
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
                  <FormDescription>
                    Le mode de transport affecte le prix et le délai de livraison
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priorité de livraison — Affecte le prix (+10% à +50%) et le délai */}
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

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TARIFICATION */}
        {/* Prix calculé automatiquement depuis les packages */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Tarification</CardTitle>
            <CardDescription>Montant calculé automatiquement depuis les colis</CardDescription>
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
 * Charge le devis existant via getQuoteAction puis affiche le formulaire d'édition
 * une fois les données disponibles. Cette séparation (EditQuotePage → QuoteEditForm)
 * garantit que useForm() reçoit les bonnes defaultValues dès le premier rendu.
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

  // Devis non trouvé
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

      {/* Formulaire — Rendu seulement quand les données sont disponibles */}
      <QuoteEditForm quoteData={quoteData} quoteId={id} />
    </div>
  );
}
