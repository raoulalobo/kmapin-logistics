/**
 * Page Création de Client
 *
 * Formulaire de création d'un nouveau client (Company).
 * - Client Component avec React Hook Form
 * - Validation Zod via le schéma du module clients
 * - Redirection vers la liste après création réussie
 * - Toast de confirmation/erreur
 */

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
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
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import { useFormValidation } from '@/hooks/use-form-validation';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { clientSchema, type ClientFormData, createClientAction } from '@/modules/clients';

export default function NewClientPage() {
  const router = useRouter();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      legalName: null,
      taxId: null,
      email: '',
      phone: null,
      address: '',
      city: '',
      postalCode: '',
      country: 'FR',
      website: null,
    },
  });

  /**
   * Hook de validation améliorée (toast + scroll + focus)
   */
  const { onSubmitWithValidation, errorMessages } = useFormValidation(form, {
    toastTitle: 'Formulaire incomplet',
    fieldLabels: {
      name: 'Nom',
      legalName: 'Raison sociale',
      taxId: 'Numéro de TVA',
      email: 'Email',
      phone: 'Téléphone',
      address: 'Adresse',
      city: 'Ville',
      postalCode: 'Code postal',
      country: 'Pays',
      website: 'Site web',
    },
  });

  async function onSubmit(data: ClientFormData) {
    try {
      const result = await createClientAction(data);

      if (result.success) {
        toast.success('Client créé avec succès');
        router.push('/dashboard/clients');
        router.refresh();
      } else {
        toast.error(result.error || 'Erreur lors de la création du client');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
      console.error('Erreur création client:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button variant="outline" size="lg" asChild className="mb-4 gap-2">
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">Nouveau Client</h1>
        <p className="text-muted-foreground">
          Créez un nouveau client (entreprise)
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

          {/* Informations générales */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>
                Les informations essentielles du client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom et Prénom *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Jean Dupont" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raison sociale</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="ACME Transport SARL" />
                      </FormControl>
                      <FormDescription>
                        (si entreprise)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de TVA</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="FR12345678901" />
                    </FormControl>
                    <FormDescription>
                      Numéro d'identification fiscale (optionnel)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Coordonnées */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
              <CardDescription>
                Informations de contact du client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contact@acme.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} type="tel" placeholder="+33 1 23 45 67 89" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site web</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} type="url" placeholder="https://acme.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
              <CardDescription>
                Localisation du siège social
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
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
                  name="city"
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
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code postal/Boîte postale</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="75001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="France" />
                      </FormControl>
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
              {form.formState.isSubmitting ? 'Création en cours...' : 'Créer le client'}
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
