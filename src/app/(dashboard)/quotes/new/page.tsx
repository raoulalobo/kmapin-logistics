/**
 * Page : Créer un nouveau devis
 *
 * Formulaire de création de devis avec :
 * - Sélection du client
 * - Route (origine → destination)
 * - Détails de la marchandise
 * - Modes de transport
 * - Coût estimé et validité
 *
 * @route /dashboard/quotes/new
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, FileText, CircleNotch, MapPin, Package, Truck, CurrencyEur } from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from 'sonner';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ClientSelect } from '@/components/forms/client-select';

import { createQuoteAction, quoteSchema, type QuoteFormData } from '@/modules/quotes';
import { CargoType, TransportMode } from '@/generated/prisma';

/**
 * Options de type de marchandise avec traductions
 */
const cargoTypeOptions = [
  { value: CargoType.GENERAL, label: 'Marchandise générale' },
  { value: CargoType.FRAGILE, label: 'Fragile' },
  { value: CargoType.PERISHABLE, label: 'Périssable' },
  { value: CargoType.DANGEROUS, label: 'Dangereuse' },
  { value: CargoType.OVERSIZED, label: 'Hors gabarit' },
  { value: CargoType.HIGH_VALUE, label: 'Haute valeur' },
] as const;

/**
 * Options de mode de transport avec traductions
 */
const transportModeOptions = [
  { value: TransportMode.SEA, label: 'Maritime' },
  { value: TransportMode.AIR, label: 'Aérien' },
  { value: TransportMode.ROAD, label: 'Routier' },
  { value: TransportMode.RAIL, label: 'Ferroviaire' },
] as const;

/**
 * Page de création de devis
 */
export default function NewQuotePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Date minimale : aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = today.toISOString().slice(0, 16);

  // Date par défaut : dans 30 jours
  const defaultValidUntil = new Date();
  defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
  const defaultDate = defaultValidUntil.toISOString().slice(0, 16);

  // Initialiser le formulaire
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      currency: 'EUR',
      transportMode: [],
      validUntil: defaultDate,
    },
  });

  /**
   * Handler pour la soumission du formulaire
   */
  async function onSubmit(data: QuoteFormData) {
    startTransition(async () => {
      // Créer un FormData pour l'action serveur
      const formData = new FormData();

      // Ajouter tous les champs
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Pour les arrays (transportMode), ajouter chaque élément
          value.forEach(item => formData.append(key, item.toString()));
        } else if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      const result = await createQuoteAction(formData);

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la création du devis');
      } else {
        toast.success('Devis créé avec succès !');
        // Succès : rediriger vers la page de détails du devis
        router.push(`/dashboard/quotes/${result.data.id}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/quotes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau devis</h1>
          <p className="text-muted-foreground">
            Créez un nouveau devis pour votre client
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations client
              </CardTitle>
              <CardDescription>
                Sélectionnez le client pour ce devis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        placeholder="Sélectionnez un client..."
                      />
                    </FormControl>
                    <FormDescription>
                      Recherchez et sélectionnez le client pour ce devis
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Route (origine → destination) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Route
              </CardTitle>
              <CardDescription>
                Définissez l'itinéraire de transport
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="originCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays d'origine (ISO) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="FR"
                          maxLength={2}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Code pays ISO à 2 lettres (ex: FR, US, DE)
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
                      <FormLabel>Pays de destination (ISO) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DE"
                          maxLength={2}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Code pays ISO à 2 lettres (ex: FR, US, DE)
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
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Détails de la marchandise
              </CardTitle>
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
                          <SelectValue placeholder="Sélectionnez le type de marchandise" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cargoTypeOptions.map((option) => (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poids (kg) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100000"
                          placeholder="1000"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Poids total de la marchandise
                      </FormDescription>
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
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="10000"
                          placeholder="5.5"
                          {...field}
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormDescription>
                        Volume total (optionnel)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Transport */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Modes de transport
              </CardTitle>
              <CardDescription>
                Sélectionnez un ou plusieurs modes de transport
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="transportMode"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-4">
                      {transportModeOptions.map((option) => (
                        <FormField
                          key={option.value}
                          control={form.control}
                          name="transportMode"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={option.value}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, option.value])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== option.value
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormDescription>
                      Au moins un mode de transport est requis
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
              <CardTitle className="flex items-center gap-2">
                <CurrencyEur className="h-5 w-5" />
                Tarification et validité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coût estimé *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="10000000"
                          placeholder="2500.00"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Montant total estimé pour le transport
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
                      <FormControl>
                        <Input
                          placeholder="EUR"
                          maxLength={3}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Code devise ISO (EUR, USD, GBP...)
                      </FormDescription>
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
                        min={minDate}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Date limite d'acceptation du devis (par défaut : 30 jours)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Créer le devis
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
