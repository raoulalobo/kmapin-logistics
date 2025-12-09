/**
 * Page Création de Devis
 *
 * Formulaire de création d'un nouveau devis.
 * - Client Component avec React Hook Form
 * - Validation Zod via le schéma du module quotes
 * - Redirection vers la liste après création réussie
 * - Toast de confirmation/erreur
 * - Chargement dynamique de la liste des clients
 */

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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

import { quoteSchema, type QuoteFormData, createQuoteAction } from '@/modules/quotes';
import { getClientsAction } from '@/modules/clients';
import { CargoType, TransportMode } from '@/generated/prisma';

export default function NewQuotePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      companyId: '',
      originCountry: 'FR',
      destinationCountry: '',
      cargoType: 'GENERAL' as CargoType,
      weight: 0,
      volume: 0,
      transportMode: ['ROAD' as TransportMode],
      estimatedCost: 0,
      currency: 'EUR',
      validUntil: '',
      status: 'DRAFT',
    },
  });

  /**
   * Charger la liste des clients au montage du composant
   */
  useEffect(() => {
    async function loadClients() {
      try {
        const result = await getClientsAction({ page: 1, limit: 100 });
        if (result.success && result.data) {
          setClients(result.data.companies.map(c => ({ id: c.id, name: c.name })));
        }
      } catch (error) {
        console.error('Erreur chargement clients:', error);
        toast.error('Erreur lors du chargement des clients');
      } finally {
        setIsLoadingClients(false);
      }
    }
    loadClients();
  }, []);

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
      if (data.volume) formData.append('volume', data.volume.toString());

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
          Créez un nouveau devis pour votre client
        </p>
      </div>

      <Separator />

      {/* Formulaire */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Client */}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingClients}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingClients ? "Chargement..." : "Sélectionner un client"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

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
                      <FormLabel>Pays d'origine (ISO) *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="FR" maxLength={2} />
                      </FormControl>
                      <FormDescription>
                        Code pays ISO (2 lettres en majuscules)
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
                        <Input {...field} placeholder="DE" maxLength={2} />
                      </FormControl>
                      <FormDescription>
                        Code pays ISO (2 lettres en majuscules)
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

              <div className="grid gap-4 md:grid-cols-2">
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
                      <FormDescription>
                        Optionnel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coût estimé *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" step="0.01" onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                      <FormDescription>
                        Montant du devis en euros
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
                      <Input {...field} type="datetime-local" />
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
              <Save className="mr-2 h-4 w-4" />
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
