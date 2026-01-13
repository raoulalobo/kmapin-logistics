/**
 * Composant Formulaire pour les Demandes d'Achat Délégué
 *
 * Formulaire de création/modification de demandes d'achat
 * Supporte mode invité (US-1.1) et connecté (US-1.4)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { DeliveryMode } from '@/lib/db/enums';
import {
  createGuestPurchaseSchema,
  createPurchaseSchema,
  type CreateGuestPurchaseInput,
  type CreatePurchaseInput,
} from '@/modules/purchases';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  User,
  MapPin,
  Calendar,
  ShoppingCart,
  FileText,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================
// TYPES
// ============================================

interface PurchaseFormProps {
  mode: 'guest' | 'authenticated';
  onSubmit: (
    data: CreateGuestPurchaseInput | CreatePurchaseInput
  ) => Promise<{ success: boolean; error?: string; data?: { trackingToken?: string } }>;
  defaultValues?: Partial<CreateGuestPurchaseInput>;
  isSubmitting?: boolean;
  className?: string;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Options de mode de livraison
 */
const DELIVERY_MODE_OPTIONS: { value: DeliveryMode; label: string; description: string }[] = [
  {
    value: DeliveryMode.STANDARD,
    label: 'Standard (5-7 jours)',
    description: 'Livraison standard sans frais supplémentaires',
  },
  {
    value: DeliveryMode.EXPRESS,
    label: 'Express (2-3 jours, +20%)',
    description: 'Livraison accélérée avec supplément de 20%',
  },
  {
    value: DeliveryMode.URGENT,
    label: 'Urgent (24-48h, +50%)',
    description: 'Livraison urgente avec supplément de 50%',
  },
];

/**
 * Pays supportés
 */
const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgique' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'CH', name: 'Suisse' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' },
  { code: 'GB', name: 'Royaume-Uni' },
];

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
 * Formulaire de création de demande d'achat délégué
 */
export function PurchaseForm({
  mode,
  onSubmit,
  defaultValues,
  isSubmitting: externalIsSubmitting = false,
  className,
}: PurchaseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sélectionner le schéma selon le mode
  const schema = mode === 'guest' ? createGuestPurchaseSchema : createPurchaseSchema;

  const form = useForm<CreateGuestPurchaseInput | CreatePurchaseInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      // Contact
      contactEmail: defaultValues?.contactEmail || '',
      contactPhone: defaultValues?.contactPhone || '',
      contactName: defaultValues?.contactName || '',

      // Produit
      productName: defaultValues?.productName || '',
      productUrl: defaultValues?.productUrl || '',
      quantity: defaultValues?.quantity || 1,
      estimatedPrice: defaultValues?.estimatedPrice || undefined,
      maxBudget: defaultValues?.maxBudget || undefined,
      productDescription: defaultValues?.productDescription || '',

      // Adresse de livraison
      deliveryAddress: defaultValues?.deliveryAddress || '',
      deliveryCity: defaultValues?.deliveryCity || '',
      deliveryPostalCode: defaultValues?.deliveryPostalCode || '',
      deliveryCountry: defaultValues?.deliveryCountry || 'FR',

      // Planification
      requestedDate: defaultValues?.requestedDate || getMinDate(),
      deliveryMode: defaultValues?.deliveryMode || DeliveryMode.STANDARD,

      // Instructions
      specialInstructions: defaultValues?.specialInstructions || '',

      // Conditions
      acceptedTerms: false,
      acceptedUrgentFee: false,
      acceptedPricing: false,
    },
  });

  /**
   * Handler de soumission
   */
  const handleSubmit = async (data: CreateGuestPurchaseInput | CreatePurchaseInput) => {
    setIsSubmitting(true);

    try {
      const result = await onSubmit(data);

      if (result.success) {
        toast({
          title: 'Demande créée avec succès',
          description: result.data?.trackingToken
            ? 'Vous allez être redirigé vers la page de suivi'
            : 'Votre demande a été enregistrée',
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Une erreur est survenue',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur inattendue est survenue',
        variant: 'destructive',
      });

      return {
        success: false,
        error: 'Erreur inattendue',
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormSubmitting = isSubmitting || externalIsSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn('space-y-8', className)}>
        {/* Section 1 : Contact */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Informations de contact</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="votre.email@exemple.fr"
                      {...field}
                      disabled={isFormSubmitting}
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
                  <FormLabel>
                    Téléphone <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      {...field}
                      disabled={isFormSubmitting}
                    />
                  </FormControl>
                  <FormDescription>Format: +33XXXXXXXXX ou 0XXXXXXXXX</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom complet (optionnel)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jean Dupont"
                    {...field}
                    disabled={isFormSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Section 2 : Produit */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Informations du produit</h3>
          </div>

          <FormField
            control={form.control}
            name="productName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nom du produit <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: iPhone 15 Pro 256GB"
                    {...field}
                    disabled={isFormSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL du produit (optionnel)</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://exemple.com/produit"
                    {...field}
                    disabled={isFormSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Lien vers la page du produit pour faciliter l&apos;achat
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantité <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      disabled={isFormSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix estimé (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      value={field.value || ''}
                      disabled={isFormSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget maximum (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      value={field.value || ''}
                      disabled={isFormSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="productDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description détaillée (optionnel)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Caractéristiques, couleur, taille, etc."
                    className="min-h-[100px]"
                    {...field}
                    disabled={isFormSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Section 3 : Adresse de livraison */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Adresse de livraison</h3>
          </div>

          <FormField
            control={form.control}
            name="deliveryAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Adresse complète <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="123 Rue de la République"
                    {...field}
                    disabled={isFormSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="deliveryPostalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Code postal <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="75001"
                      {...field}
                      disabled={isFormSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Ville <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Paris"
                      {...field}
                      disabled={isFormSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Pays <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isFormSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un pays" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Section 4 : Planification */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Planification</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="requestedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Date de livraison souhaitée <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={getMinDate()}
                      {...field}
                      value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                      disabled={isFormSubmitting}
                    />
                  </FormControl>
                  <FormDescription>Minimum demain</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Mode de livraison <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isFormSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DELIVERY_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Section 5 : Instructions */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Instructions spéciales (optionnel)</h3>
          </div>

          <FormField
            control={form.control}
            name="specialInstructions"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Instructions de livraison, préférences particulières..."
                    className="min-h-[100px]"
                    {...field}
                    disabled={isFormSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Section 6 : Conditions */}
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Structure de prix :</strong> Coût du produit + Frais de livraison + Frais de service (15% minimum 10€)
            </AlertDescription>
          </Alert>

          <FormField
            control={form.control}
            name="acceptedTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isFormSubmitting}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    J&apos;accepte les conditions générales de vente{' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="acceptedPricing"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isFormSubmitting}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    J&apos;accepte la structure de prix (produit + livraison + frais de service 15%){' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {form.watch('deliveryMode') === DeliveryMode.EXPRESS ||
           form.watch('deliveryMode') === DeliveryMode.URGENT ? (
            <FormField
              control={form.control}
              name="acceptedUrgentFee"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isFormSubmitting}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      J&apos;accepte les frais supplémentaires pour livraison{' '}
                      {form.watch('deliveryMode') === DeliveryMode.EXPRESS ? 'express (+20%)' : 'urgente (+50%)'}
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          ) : null}
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isFormSubmitting}>
            {isFormSubmitting ? (
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
