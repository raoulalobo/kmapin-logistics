/**
 * Composant : QuoteCalculator
 *
 * Calculateur de devis public pour la page d'accueil
 * Permet aux visiteurs d'obtenir une estimation de prix sans authentification
 *
 * Layout en pleine largeur avec formulaire horizontal
 *
 * @module components/quote-calculator
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Calculator, Package, MapPin, Truck, Ship, Plane, Train, ArrowRight, TrendingUp, Download, Mail, Save, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateQuoteEstimateAction } from '@/modules/quotes/actions/quote.actions';
import { quoteEstimateSchema, type QuoteEstimateData, type QuoteEstimateResult } from '@/modules/quotes/schemas/quote.schema';
import { CargoType, TransportMode } from '@/generated/prisma';
import { QuoteRequestModal } from '@/components/quote-request/quote-request-modal';
import type { QuoteDataFormData } from '@/modules/prospects';

/**
 * Traductions françaises pour les types de marchandise
 */
const cargoTypeLabels: Record<CargoType, string> = {
  GENERAL: 'Marchandise générale',
  DANGEROUS: 'Matières dangereuses',
  PERISHABLE: 'Périssable',
  FRAGILE: 'Fragile',
  BULK: 'Vrac',
  CONTAINER: 'Conteneur',
  PALLETIZED: 'Palettisé',
  OTHER: 'Autre',
};

/**
 * Traductions françaises pour les modes de transport
 */
const transportModeLabels: Record<TransportMode, { label: string; icon: any }> = {
  ROAD: { label: 'Routier', icon: Truck },
  SEA: { label: 'Maritime', icon: Ship },
  AIR: { label: 'Aérien', icon: Plane },
  RAIL: { label: 'Ferroviaire', icon: Train },
};

/**
 * Traductions françaises pour les priorités
 */
const priorityLabels = {
  STANDARD: 'Standard',
  EXPRESS: 'Express',
  URGENT: 'Urgent',
};

export function QuoteCalculator() {
  /**
   * État local pour stocker le résultat du calcul
   */
  const [result, setResult] = useState<QuoteEstimateResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * État du modal de demande de devis par email
   */
  const [showEmailModal, setShowEmailModal] = useState(false);

  /**
   * Données du formulaire pour le modal (conservées après calcul)
   */
  const [lastFormData, setLastFormData] = useState<QuoteEstimateData | null>(null);

  /**
   * TODO: Implémenter vérification session Better Auth
   * Pour l'instant, on considère l'utilisateur comme non-connecté
   */
  const session = null;

  /**
   * Configuration de React Hook Form avec validation Zod
   */
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuoteEstimateData>({
    resolver: zodResolver(quoteEstimateSchema),
    defaultValues: {
      originCountry: '',
      destinationCountry: '',
      cargoType: 'GENERAL',
      weight: 0,
      volume: undefined,
      transportMode: [],
      priority: 'STANDARD',
    },
  });

  /**
   * Observer les modes de transport sélectionnés
   */
  const selectedTransportModes = watch('transportMode') || [];

  /**
   * Gérer la sélection/désélection des modes de transport
   */
  const toggleTransportMode = (mode: TransportMode) => {
    const current = selectedTransportModes;
    const updated = current.includes(mode)
      ? current.filter((m) => m !== mode)
      : [...current, mode];
    setValue('transportMode', updated, { shouldValidate: true });
  };

  /**
   * Soumettre le formulaire et calculer l'estimation
   */
  const onSubmit = async (data: QuoteEstimateData) => {
    try {
      setIsCalculating(true);
      setError(null);
      setResult(null);

      // Sauvegarder les données du formulaire pour le modal email
      setLastFormData(data);

      // Appeler la Server Action
      const response = await calculateQuoteEstimateAction(data);

      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error || 'Une erreur est survenue');
      }
    } catch (err) {
      console.error('Error calculating estimate:', err);
      setError('Une erreur est survenue lors du calcul');
    } finally {
      setIsCalculating(false);
    }
  };

  /**
   * Télécharger le devis en PDF
   */
  const handleDownloadPDF = () => {
    // TODO: Implémenter la génération et téléchargement du PDF
    // Pour l'instant, juste un toast
    toast.info('Téléchargement PDF - Fonctionnalité à venir');
  };

  /**
   * Sauvegarder le devis dans l'espace client (utilisateur connecté)
   */
  const handleSaveQuote = () => {
    // TODO: Implémenter la sauvegarde du devis
    toast.info('Sauvegarde du devis - Fonctionnalité à venir');
  };

  /**
   * Préparer les données pour le QuoteRequestModal
   * Convertit QuoteEstimateData en QuoteDataFormData
   */
  const prepareQuoteDataForModal = (): QuoteDataFormData | null => {
    if (!lastFormData || !result) return null;

    return {
      originCountry: lastFormData.originCountry,
      destinationCountry: lastFormData.destinationCountry,
      cargoType: lastFormData.cargoType,
      weight: lastFormData.weight,
      volume: lastFormData.volume || null,
      transportMode: lastFormData.transportMode,
      estimatedCost: result.estimatedCost,
      currency: 'EUR',
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Formulaire en pleine largeur */}
      <Card className="border-0 shadow-xl w-full">
        <CardHeader className="bg-gradient-to-r from-[#0033FF] to-[#0029CC] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Calculator className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl text-white">Calculateur de devis gratuit</CardTitle>
                <CardDescription className="text-blue-100 text-base mt-1">
                  Obtenez une estimation instantanée pour votre expédition
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Grille principale - 4 colonnes sur grand écran */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Pays d'origine */}
              <div className="space-y-2">
                <Label htmlFor="originCountry" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#0033FF]" />
                  Pays d'origine
                </Label>
                <Input
                  id="originCountry"
                  placeholder="Ex: France"
                  {...register('originCountry')}
                  className={`h-11 ${errors.originCountry ? 'border-red-500' : ''}`}
                />
                {errors.originCountry && (
                  <p className="text-sm text-red-500">{errors.originCountry.message}</p>
                )}
              </div>

              {/* Pays de destination */}
              <div className="space-y-2">
                <Label htmlFor="destinationCountry" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#0033FF]" />
                  Pays de destination
                </Label>
                <Input
                  id="destinationCountry"
                  placeholder="Ex: Allemagne"
                  {...register('destinationCountry')}
                  className={`h-11 ${errors.destinationCountry ? 'border-red-500' : ''}`}
                />
                {errors.destinationCountry && (
                  <p className="text-sm text-red-500">{errors.destinationCountry.message}</p>
                )}
              </div>

              {/* Poids */}
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-base font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#0033FF]" />
                  Poids (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="1000"
                  {...register('weight', { valueAsNumber: true })}
                  className={`h-11 ${errors.weight ? 'border-red-500' : ''}`}
                />
                {errors.weight && (
                  <p className="text-sm text-red-500">{errors.weight.message}</p>
                )}
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <Label htmlFor="volume" className="text-base font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#0033FF]" />
                  Volume (m³)
                </Label>
                <Input
                  id="volume"
                  type="number"
                  step="0.01"
                  placeholder="10.5 (optionnel)"
                  {...register('volume', { valueAsNumber: true })}
                  className={`h-11 ${errors.volume ? 'border-red-500' : ''}`}
                />
                {errors.volume && (
                  <p className="text-sm text-red-500">{errors.volume.message}</p>
                )}
              </div>
            </div>

            {/* Deuxième ligne - Type de marchandise et Priorité */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Type de marchandise */}
              <div className="space-y-2">
                <Label htmlFor="cargoType" className="text-base font-semibold">Type de marchandise</Label>
                <Select
                  defaultValue="GENERAL"
                  onValueChange={(value) => setValue('cargoType', value as CargoType)}
                >
                  <SelectTrigger id="cargoType" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(cargoTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.cargoType && (
                  <p className="text-sm text-red-500">{errors.cargoType.message}</p>
                )}
              </div>

              {/* Priorité */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-base font-semibold">Priorité</Label>
                <Select
                  defaultValue="STANDARD"
                  onValueChange={(value) => setValue('priority', value as 'STANDARD' | 'EXPRESS' | 'URGENT')}
                >
                  <SelectTrigger id="priority" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Modes de transport */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#0033FF]" />
                Mode(s) de transport
              </Label>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(transportModeLabels).map(([value, { label, icon: Icon }]) => {
                  const isSelected = selectedTransportModes.includes(value as TransportMode);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleTransportMode(value as TransportMode)}
                      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all hover:scale-105 ${
                        isSelected
                          ? 'border-[#0033FF] bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Icon className={`h-8 w-8 ${isSelected ? 'text-[#0033FF]' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-[#0033FF]' : 'text-gray-700'}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.transportMode && (
                <p className="text-sm text-red-500">{errors.transportMode.message}</p>
              )}
            </div>

            {/* Bouton de soumission */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={isCalculating}
                className="bg-[#0033FF] hover:bg-[#0029CC] h-14 px-12 text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Calcul en cours...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-3 h-6 w-6" />
                    Calculer mon devis gratuitement
                  </>
                )}
              </Button>
            </div>

            {/* Erreur */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 text-center">{error}</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Résultat - En dessous du formulaire */}
      {result && (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-50 via-white to-blue-50 w-full">
          <CardHeader className="border-b bg-white/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0033FF]">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-[#0033FF]">Votre estimation personnalisée</CardTitle>
                  <CardDescription className="text-base">
                    Cette estimation est indicative et peut varier selon les conditions réelles
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Prix total - Grande carte à gauche */}
              <div className="rounded-2xl bg-gradient-to-br from-[#0033FF] to-[#0029CC] p-8 text-white shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="text-lg font-medium text-blue-100">Prix estimé</div>
                  </div>
                  <div className="text-6xl font-bold">
                    {result.estimatedCost.toLocaleString('fr-FR')} €
                  </div>
                  <div className="flex items-center gap-2 text-blue-100">
                    <div className="h-px flex-1 bg-white/20"></div>
                    <span className="text-sm">Délai estimé</span>
                    <div className="h-px flex-1 bg-white/20"></div>
                  </div>
                  <div className="text-center text-3xl font-semibold">
                    {result.estimatedDeliveryDays} jour{result.estimatedDeliveryDays > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Détail des coûts - Droite */}
              <div className="space-y-6">
                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="h-8 w-1 bg-[#0033FF] rounded-full"></div>
                  Détail du calcul
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Coût de base</span>
                    <span className="font-bold text-gray-900">{result.breakdown.baseCost} €</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Facteur distance</span>
                    <span className="font-bold text-gray-900">{result.breakdown.distanceFactor} €</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Coût mode de transport</span>
                    <span className="font-bold text-gray-900">{result.breakdown.transportModeCost} €</span>
                  </div>
                  {result.breakdown.cargoTypeSurcharge > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-orange-50">
                      <span className="text-orange-700 font-medium">Supplément type marchandise</span>
                      <span className="font-bold text-orange-900">+{result.breakdown.cargoTypeSurcharge} €</span>
                    </div>
                  )}
                  {result.breakdown.prioritySurcharge > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50">
                      <span className="text-purple-700 font-medium">Supplément priorité</span>
                      <span className="font-bold text-purple-900">+{result.breakdown.prioritySurcharge} €</span>
                    </div>
                  )}
                  <div className="border-t-2 border-[#0033FF] pt-3 mt-4 flex justify-between items-center p-4 rounded-lg bg-blue-50">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-[#0033FF]">{result.estimatedCost} €</span>
                  </div>
                </div>

                {/* Actions conditionnelles selon l'état de connexion */}
                <div className="space-y-4">
                  {session?.user ? (
                    // Utilisateur connecté : Télécharger + Sauvegarder
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          onClick={handleDownloadPDF}
                          variant="outline"
                          className="h-12 text-base border-[#0033FF] text-[#0033FF] hover:bg-blue-50"
                        >
                          <Download className="mr-2 h-5 w-5" />
                          Télécharger PDF
                        </Button>
                        <Button
                          onClick={handleSaveQuote}
                          className="h-12 text-base bg-[#0033FF] hover:bg-[#0029CC]"
                        >
                          <Save className="mr-2 h-5 w-5" />
                          Sauvegarder dans mon espace
                        </Button>
                      </div>
                    </>
                  ) : (
                    // Utilisateur non-connecté : Télécharger + Email + Créer compte
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          onClick={handleDownloadPDF}
                          variant="outline"
                          className="h-12 text-base border-[#0033FF] text-[#0033FF] hover:bg-blue-50"
                        >
                          <Download className="mr-2 h-5 w-5" />
                          Télécharger PDF
                        </Button>
                        <Button
                          onClick={() => setShowEmailModal(true)}
                          className="h-12 text-base bg-[#0033FF] hover:bg-[#0029CC]"
                        >
                          <Mail className="mr-2 h-5 w-5" />
                          Recevoir par email
                        </Button>
                      </div>
                      <Button
                        className="w-full h-12 text-base bg-gradient-to-r from-[#0033FF] to-[#0029CC] hover:opacity-90 shadow-lg"
                        asChild
                      >
                        <Link href="/register">
                          <UserPlus className="mr-2 h-5 w-5" />
                          Créer un compte pour suivre mes expéditions
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de demande de devis par email (utilisateurs non-connectés) */}
      {prepareQuoteDataForModal() && (
        <QuoteRequestModal
          open={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          quoteData={prepareQuoteDataForModal()!}
        />
      )}
    </div>
  );
}
