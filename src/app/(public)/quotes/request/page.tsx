/**
 * Page : Demande de Devis Publique (Invité)
 *
 * Page accessible SANS authentification permettant à tout visiteur
 * de demander un devis pour une expédition. Après soumission :
 * - Devis créé avec userId = null (invité)
 * - Token unique généré pour suivi pendant 72h
 * - Email envoyé avec lien de suivi et coût estimé
 * - Si inscription ultérieure → rattachement automatique par email/téléphone
 *
 * Workflow :
 * 1. Remplit le formulaire → Quote créé (guest) avec estimation automatique
 * 2. Reçoit email avec token de suivi (72h) + coût estimé
 * 3. Optionnel : Crée un compte → Rattachement automatique par email/téléphone
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useFormValidation } from '@/hooks/use-form-validation';
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  CheckCircle,
  Mail,
  Clock,
  ArrowRight,
  Home,
  MapPin,
  Truck,
  Loader2,
} from 'lucide-react';
import {
  Truck as TruckIcon,
  Boat,
  Airplane,
  Train,
} from '@phosphor-icons/react';
import { CountrySelect } from '@/components/countries';
import { createGuestQuoteAction, type CreateGuestQuoteInput } from '@/modules/quotes';
import { createGuestQuoteSchema } from '@/modules/quotes/schemas/quote.schema';
import { CargoType, TransportMode } from '@/lib/db/enums';

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
const transportModeLabels: Record<TransportMode, { label: string; icon: React.ElementType }> = {
  ROAD: { label: 'Routier', icon: TruckIcon },
  SEA: { label: 'Maritime', icon: Boat },
  AIR: { label: 'Aérien', icon: Airplane },
  RAIL: { label: 'Ferroviaire', icon: Train },
};

/**
 * Traductions françaises pour les priorités
 */
const priorityLabels = {
  STANDARD: 'Standard',
  NORMAL: 'Normal (+10%)',
  EXPRESS: 'Express (+50%)',
  URGENT: 'Urgent (+30%)',
};

/**
 * Page de demande de devis pour visiteur (sans compte)
 */
export default function QuoteRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Configuration du formulaire avec React Hook Form + Zod
   */
  const form = useForm<CreateGuestQuoteInput>({
    resolver: zodResolver(createGuestQuoteSchema),
    defaultValues: {
      originCountry: '',
      destinationCountry: '',
      cargoType: 'GENERAL',
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      transportMode: [],
      priority: 'STANDARD',
      contactEmail: '',
      contactPhone: '',
      contactName: '',
    },
  });

  const {
    register,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  /**
   * Hook de validation améliorée (toast + scroll + focus)
   */
  const { onSubmitWithValidation, errorMessages } = useFormValidation(form, {
    toastTitle: 'Formulaire incomplet',
    fieldLabels: {
      originCountry: 'Pays d\'origine',
      destinationCountry: 'Pays de destination',
      transportMode: 'Mode de transport',
      cargoType: 'Type de marchandise',
      weight: 'Poids',
      contactEmail: 'Email',
      contactPhone: 'Téléphone',
      contactName: 'Nom',
    },
  });

  // Observer les modes de transport sélectionnés
  const selectedTransportModes = watch('transportMode') || [];

  /**
   * Gérer la sélection d'un mode de transport (un seul à la fois)
   */
  const toggleTransportMode = (mode: TransportMode) => {
    const current = getValues('transportMode') || [];
    const updated = current.includes(mode) ? [] : [mode];
    setValue('transportMode', updated, { shouldValidate: true });
  };

  /**
   * Soumettre le formulaire
   */
  const onSubmit = async (data: CreateGuestQuoteInput) => {
    try {
      setIsSubmitting(true);

      console.log('📤 [QuoteRequest] Envoi vers Server Action:', data);
      const result = await createGuestQuoteAction(data);
      console.log('📥 [QuoteRequest] Résultat reçu:', result);

      if (result.success && result.data?.trackingToken) {
        // Afficher un toast de succès avec le coût estimé
        toast.success(
          `Devis ${result.data.quoteNumber} créé ! Estimation : ${result.data.estimatedCost.toLocaleString('fr-FR')} €`,
          { duration: 5000 }
        );

        // Rediriger vers la page de suivi avec le token
        console.log('✅ [QuoteRequest] Redirection vers:', `/quotes/track/${result.data.trackingToken}`);
        router.push(`/quotes/track/${result.data.trackingToken}`);
      } else {
        console.error('⚠️ [QuoteRequest] Erreur:', result.error);
        toast.error(result.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('❌ [QuoteRequest] Erreur inattendue:', error);
      toast.error('Une erreur inattendue est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-[#003D82] text-white py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-3 mb-4">
              <Package className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Demande de Devis</h1>
            </div>
            <p className="text-xl text-blue-100">
              Obtenez une estimation gratuite et instantanée pour votre expédition.
              Recevez votre devis par email avec un lien de suivi valide 72h.
            </p>
          </div>
        </div>
      </div>

      {/* Étapes du processus */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Étape 1 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                  1
                </div>
                <CardTitle>Remplissez le formulaire</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Indiquez les détails de votre expédition : origine, destination, poids et type de marchandise
              </p>
            </CardContent>
          </Card>

          {/* Étape 2 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                  2
                </div>
                <CardTitle>Recevez votre devis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Vous recevez immédiatement une estimation et un email avec votre numéro de devis
              </p>
            </CardContent>
          </Card>

          {/* Étape 3 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                  3
                </div>
                <CardTitle>On vous contacte</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Notre équipe vous recontacte sous 24h pour finaliser votre demande
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informations importantes */}
        <Card className="bg-blue-50 border-blue-200 mb-12">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900">
              <Clock className="h-5 w-5" />
              <span>Bon à savoir</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Estimation instantanée :</strong> Le prix est calculé automatiquement
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Lien de suivi :</strong> Valide pendant 72 heures après réception de l&apos;email
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Compte optionnel :</strong> Créez un compte gratuit pour un accès permanent à vos devis
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <Mail className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Pas d&apos;email reçu ?</strong> Vérifiez vos spams ou contactez-nous
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Formulaire */}
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Informations de votre demande</CardTitle>
              <CardDescription>
                Tous les champs marqués d&apos;un astérisque (*) sont obligatoires
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmitWithValidation(onSubmit)} className="space-y-8">
                {/* Bannière de résumé des erreurs */}
                <FormErrorSummary
                  errors={errorMessages}
                  title="Veuillez corriger les erreurs suivantes"
                  className="mb-6"
                />
                {/* Section Contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Mail className="h-5 w-5 text-[#003D82]" />
                    Vos coordonnées
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Email *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="votre@email.com"
                        {...register('contactEmail')}
                        className={errors.contactEmail ? 'border-red-500' : ''}
                      />
                      {errors.contactEmail && (
                        <p className="text-sm text-red-500">{errors.contactEmail.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Téléphone (optionnel)</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        {...register('contactPhone')}
                        className={errors.contactPhone ? 'border-red-500' : ''}
                      />
                      {errors.contactPhone && (
                        <p className="text-sm text-red-500">{errors.contactPhone.message}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="contactName">Nom / Société (optionnel)</Label>
                      <Input
                        id="contactName"
                        type="text"
                        placeholder="Votre nom ou raison sociale"
                        {...register('contactName')}
                        className={errors.contactName ? 'border-red-500' : ''}
                      />
                      {errors.contactName && (
                        <p className="text-sm text-red-500">{errors.contactName.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Route */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#003D82]" />
                    Origine et destination
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="originCountry">Pays d&apos;origine *</Label>
                      <CountrySelect
                        id="originCountry"
                        value={watch('originCountry')}
                        onValueChange={(value) => setValue('originCountry', value, { shouldValidate: true })}
                        placeholder="Sélectionnez un pays"
                        className={errors.originCountry ? 'border-red-500' : ''}
                      />
                      {errors.originCountry && (
                        <p className="text-sm text-red-500">{errors.originCountry.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destinationCountry">Pays de destination *</Label>
                      <CountrySelect
                        id="destinationCountry"
                        value={watch('destinationCountry')}
                        onValueChange={(value) => setValue('destinationCountry', value, { shouldValidate: true })}
                        placeholder="Sélectionnez un pays"
                        className={errors.destinationCountry ? 'border-red-500' : ''}
                      />
                      {errors.destinationCountry && (
                        <p className="text-sm text-red-500">{errors.destinationCountry.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Marchandise */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#003D82]" />
                    Informations sur la marchandise
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cargoType">Type de marchandise *</Label>
                      <Select
                        value={watch('cargoType')}
                        onValueChange={(value) => setValue('cargoType', value as CargoType, { shouldValidate: true })}
                      >
                        <SelectTrigger id="cargoType" className={errors.cargoType ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Sélectionnez un type" />
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
                    <div className="space-y-2">
                      <Label htmlFor="weight">Poids (kg) *</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="500"
                        {...register('weight', { valueAsNumber: true })}
                        className={errors.weight ? 'border-red-500' : ''}
                      />
                      {errors.weight && (
                        <p className="text-sm text-red-500">{errors.weight.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Dimensions optionnelles */}
                  <div className="space-y-2">
                    <Label>Dimensions (optionnel - en centimètres)</Label>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Longueur (cm)"
                        {...register('length', { valueAsNumber: true })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Largeur (cm)"
                        {...register('width', { valueAsNumber: true })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Hauteur (cm)"
                        {...register('height', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Transport */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Truck className="h-5 w-5 text-[#003D82]" />
                    Mode de transport *
                  </h3>
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
                              ? 'border-[#003D82] bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <Icon className={`h-8 w-8 ${isSelected ? 'text-[#003D82]' : 'text-gray-500'}`} />
                          <span className={`text-sm font-medium ${isSelected ? 'text-[#003D82]' : 'text-gray-700'}`}>
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

                {/* Section Priorité */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Priorité</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Select
                        value={watch('priority') || 'STANDARD'}
                        onValueChange={(value) => setValue('priority', value as 'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT')}
                      >
                        <SelectTrigger>
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
                </div>

                {/* Section Description */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Informations complémentaires (optionnel)</h3>
                  <Textarea
                    placeholder="Décrivez votre marchandise, ajoutez des instructions spéciales..."
                    {...register('description')}
                    rows={4}
                  />
                </div>

                {/* Bouton de soumission */}
                <div className="flex justify-center pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#003D82] hover:bg-[#002952] h-14 px-12 text-lg shadow-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-3 h-6 w-6" />
                        Demander mon devis gratuit
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* CTA création de compte */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle>Vous avez déjà un compte ?</CardTitle>
              <CardDescription>
                Connectez-vous pour accéder à votre tableau de bord et retrouver tous vos devis
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center space-x-4">
              <Button asChild variant="outline">
                <Link href="/login">
                  Se connecter
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>

              <div className="text-sm text-muted-foreground">ou</div>

              <Button asChild>
                <Link href="/register">Créer un compte gratuit</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-12">
          <div className="flex items-center justify-center space-x-4">
            <Link href="/" className="hover:underline flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Accueil
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:underline">
              Se connecter
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:underline">
              Nous contacter
            </Link>
          </div>
          <p className="mt-4">
            © {new Date().getFullYear()} Faso Fret Logistics. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}
