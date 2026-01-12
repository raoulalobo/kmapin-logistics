/**
 * Page Création d'Expédition
 *
 * Formulaire de création d'une nouvelle expédition.
 * - Client Component avec React Hook Form
 * - Validation Zod via le schéma du module shipments
 * - Redirection vers la liste après création réussie
 * - Toast de confirmation/erreur
 * - Chargement dynamique de la liste des clients
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, FloppyDisk, Package, Calculator } from '@phosphor-icons/react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ClientSelect } from '@/components/forms/client-select';

import { shipmentSchema, type ShipmentFormData, createShipmentAction } from '@/modules/shipments';
import { CargoType, TransportMode, Priority } from '@/lib/db/enums';
import { calculateQuoteEstimateV2Action } from '@/modules/quotes/actions/calculate-quote-estimate-v2';

export default function NewShipmentPage() {
  const router = useRouter();

  // État pour le calcul automatique du coût
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  const form = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      companyId: '',
      originAddress: '',
      originCity: '',
      originPostalCode: '',
      originCountry: 'FR',
      originContact: '',
      originPhone: '',
      destinationAddress: '',
      destinationCity: '',
      destinationPostalCode: '',
      destinationCountry: 'FR',
      destinationContact: '',
      destinationPhone: '',
      cargoType: 'GENERAL' as CargoType,
      weight: 0,
      volume: 0,
      length: 0,
      width: 0,
      height: 0,
      packageCount: 1,
      value: 0,
      currency: 'EUR',
      description: '',
      specialInstructions: '',
      isDangerous: false,
      isFragile: false,
      transportMode: ['ROAD' as TransportMode],
      priority: 'STANDARD' as Priority,
      requestedPickupDate: null,
      estimatedDeliveryDate: null,
      estimatedCost: 0,
    },
  });

  /**
   * Calculer automatiquement le coût estimé
   * Réutilise la même logique que le calculateur de devis
   */
  async function handleCalculateCost() {
    try {
      setIsCalculating(true);

      // Récupérer les valeurs actuelles du formulaire
      const formValues = form.getValues();

      // Vérifier que les champs requis pour le calcul sont remplis
      if (!formValues.originCountry || !formValues.destinationCountry) {
        toast.error('Veuillez renseigner les pays d\'origine et de destination');
        setIsCalculating(false);
        return;
      }

      if (!formValues.weight || formValues.weight <= 0) {
        toast.error('Veuillez renseigner le poids de la marchandise');
        setIsCalculating(false);
        return;
      }

      if (formValues.transportMode.length === 0) {
        toast.error('Veuillez sélectionner au moins un mode de transport');
        setIsCalculating(false);
        return;
      }

      // Préparer les données pour le calculateur (même format que quote)
      const calculationData = {
        originCountry: formValues.originCountry,
        destinationCountry: formValues.destinationCountry,
        cargoType: formValues.cargoType,
        weight: formValues.weight,
        length: formValues.length || 0,
        width: formValues.width || 0,
        height: formValues.height || 0,
        transportMode: formValues.transportMode,
        priority: formValues.priority,
      };

      // Appeler la même Server Action que le calculateur de devis
      const result = await calculateQuoteEstimateV2Action(calculationData);

      if (result.success && result.data) {
        // Mettre à jour le champ estimatedCost avec le résultat calculé
        const cost = result.data.estimatedCost;
        setCalculatedCost(cost);
        form.setValue('estimatedCost', cost);
        toast.success(`Coût calculé : ${cost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`);
      } else {
        toast.error(result.error || 'Erreur lors du calcul du coût');
      }
    } catch (error) {
      console.error('Erreur calcul coût:', error);
      toast.error('Une erreur est survenue lors du calcul');
    } finally {
      setIsCalculating(false);
    }
  }

  /**
   * Soumission du formulaire
   * Convertit les données du formulaire en FormData pour l'action serveur
   */
  async function onSubmit(data: ShipmentFormData) {
    try {
      // Créer un FormData à partir des données du formulaire
      const formData = new FormData();

      // Ajouter tous les champs requis
      formData.append('companyId', data.companyId);
      formData.append('originAddress', data.originAddress);
      formData.append('originCity', data.originCity);
      formData.append('originPostalCode', data.originPostalCode);
      formData.append('originCountry', data.originCountry);
      if (data.originContact) formData.append('originContact', data.originContact);
      if (data.originPhone) formData.append('originPhone', data.originPhone);

      formData.append('destinationAddress', data.destinationAddress);
      formData.append('destinationCity', data.destinationCity);
      formData.append('destinationPostalCode', data.destinationPostalCode);
      formData.append('destinationCountry', data.destinationCountry);
      if (data.destinationContact) formData.append('destinationContact', data.destinationContact);
      if (data.destinationPhone) formData.append('destinationPhone', data.destinationPhone);

      formData.append('cargoType', data.cargoType);
      formData.append('weight', data.weight.toString());
      if (data.volume) formData.append('volume', data.volume.toString());
      if (data.length) formData.append('length', data.length.toString());
      if (data.width) formData.append('width', data.width.toString());
      if (data.height) formData.append('height', data.height.toString());
      formData.append('packageCount', data.packageCount.toString());
      if (data.value) formData.append('value', data.value.toString());
      formData.append('currency', data.currency);
      formData.append('description', data.description);
      if (data.specialInstructions) formData.append('specialInstructions', data.specialInstructions);
      formData.append('isDangerous', data.isDangerous.toString());
      formData.append('isFragile', data.isFragile.toString());

      // Transport mode (array)
      data.transportMode.forEach(mode => formData.append('transportMode', mode));

      formData.append('priority', data.priority);
      if (data.requestedPickupDate) formData.append('requestedPickupDate', data.requestedPickupDate);
      if (data.estimatedDeliveryDate) formData.append('estimatedDeliveryDate', data.estimatedDeliveryDate);
      if (data.estimatedCost) formData.append('estimatedCost', data.estimatedCost.toString());

      const result = await createShipmentAction(formData);

      if (result.success) {
        toast.success(`Expédition créée avec succès (N° ${result.data.trackingNumber})`);
        router.push('/dashboard/shipments');
        router.refresh();
      } else {
        toast.error(result.error || 'Erreur lors de la création de l\'expédition');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
      console.error('Erreur création expédition:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button variant="outline" size="lg" asChild className="mb-4 gap-2">
          <Link href="/dashboard/shipments">
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">Nouvelle Expédition</h1>
        <p className="text-muted-foreground">
          Créez une nouvelle expédition pour votre client
        </p>
      </div>

      <Separator />

      {/* Formulaire */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Client */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Client</CardTitle>
              <CardDescription>
                Sélectionnez le client pour cette expédition
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

          {/* Origine */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Point d'origine</CardTitle>
              <CardDescription>
                Adresse de collecte de la marchandise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="originAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Rue de la Paix" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="originCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Paris" />
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
                      <FormLabel>Code postal *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="75001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="originCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays (ISO) *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="FR" maxLength={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="originContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="Jean Dupont" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="originPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} type="tel" placeholder="+33 1 23 45 67 89" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Destination */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Point de destination</CardTitle>
              <CardDescription>
                Adresse de livraison de la marchandise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="destinationAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="456 Avenue des Champs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="destinationCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Lyon" />
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
                      <FormLabel>Code postal *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="69001" />
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
                      <FormLabel>Pays (ISO) *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="FR" maxLength={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="destinationContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="Marie Martin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destinationPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} type="tel" placeholder="+33 4 56 78 90 12" />
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
              <CardDescription>
                Informations sur le contenu de l'expédition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                  name="packageCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de colis *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poids (kg) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" step="0.1" onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="volume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume (m³)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} type="number" min="0" step="0.01" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valeur (€)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} type="number" min="0" step="0.01" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dimensions pour calcul automatique du coût */}
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  <strong>⚠️ Attention :</strong> Les dimensions doivent être saisies en <strong>centimètres (cm)</strong> pour le calcul automatique du coût.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longueur (cm)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Longueur (cm)"
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
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
                        <FormLabel>Largeur (cm)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Largeur (cm)"
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
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
                        <FormLabel>Hauteur (cm)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Hauteur (cm)"
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Décrivez le contenu de l'expédition" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions spéciales</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} placeholder="Instructions de manipulation, livraison, etc." rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-6">
                <FormField
                  control={form.control}
                  name="isDangerous"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Marchandise dangereuse</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFragile"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Marchandise fragile</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Transport et coût */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Transport et coût</CardTitle>
              <CardDescription>
                Options de transport et estimation du coût
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une priorité" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="EXPRESS">Express</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bouton de calcul automatique du coût */}
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleCalculateCost}
                  disabled={isCalculating}
                  className="gap-2"
                >
                  <Calculator className="h-5 w-5" weight="fill" />
                  {isCalculating ? 'Calcul en cours...' : 'Calculer le coût automatiquement'}
                </Button>
                {calculatedCost !== null && (
                  <span className="text-sm text-green-600 font-medium">
                    ✓ Coût calculé avec succès
                  </span>
                )}
              </div>

              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coût estimé (€)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        type="number"
                        min="0"
                        step="0.01"
                        readOnly
                        className="bg-muted cursor-not-allowed"
                        placeholder="Utilisez le bouton 'Calculer le coût automatiquement'"
                      />
                    </FormControl>
                    <FormDescription>
                      Le coût est calculé automatiquement en fonction du poids, des dimensions, et du trajet
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
              {form.formState.isSubmitting ? 'Création en cours...' : 'Créer l\'expédition'}
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
