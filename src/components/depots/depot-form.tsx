/**
 * Composant : DepotForm
 *
 * Formulaire de création et d'édition d'un dépôt.
 * Utilise React Hook Form + Zod pour la validation.
 *
 * En mode création : tous les champs sont vides, soumission via createDepot()
 * En mode édition  : pré-rempli avec les données du dépôt, soumission via updateDepot()
 *
 * @param depot - Données du dépôt existant (mode édition) ou undefined (mode création)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleNotch } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import {
  createDepotSchema,
  type CreateDepotData,
} from '@/modules/depots/schemas/depot.schema';
import { createDepot, updateDepot } from '@/modules/depots/actions/depot.actions';

/**
 * Type du dépôt passé en props (mode édition)
 * Contient uniquement les champs nécessaires au formulaire
 */
interface DepotForForm {
  id: string;
  name: string;
  code: string;
  description: string | null;
  address: string;
  city: string;
  country: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  isDefault: boolean;
}

interface DepotFormProps {
  /** Dépôt existant pour le mode édition. Si absent → mode création */
  depot?: DepotForForm;
}

export function DepotForm({ depot }: DepotFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mode : édition si un dépôt est fourni, création sinon
  const isEditing = !!depot;

  // Initialisation du formulaire avec React Hook Form + Zod
  const form = useForm<CreateDepotData>({
    resolver: zodResolver(createDepotSchema),
    defaultValues: {
      name: depot?.name ?? '',
      code: depot?.code ?? '',
      description: depot?.description ?? '',
      address: depot?.address ?? '',
      city: depot?.city ?? '',
      country: depot?.country ?? 'Burkina Faso',
      postalCode: depot?.postalCode ?? '',
      phone: depot?.phone ?? '',
      email: depot?.email ?? '',
      isDefault: depot?.isDefault ?? false,
    },
  });

  /**
   * Soumission du formulaire
   * Crée ou met à jour le dépôt via Server Action, puis redirige
   */
  async function onSubmit(data: CreateDepotData) {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateDepot(depot.id, data);
        toast({
          title: 'Dépôt mis à jour',
          description: `Le dépôt "${data.name}" a été modifié avec succès.`,
        });
        router.refresh();
      } else {
        const created = await createDepot(data);
        toast({
          title: 'Dépôt créé',
          description: `Le dépôt "${data.name}" a été créé avec succès.`,
        });
        router.push(`/dashboard/depots/${created.id}`);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Nom et Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du dépôt *</FormLabel>
                <FormControl>
                  <Input placeholder="Dépôt Ouagadougou Centre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="OUA-01"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormDescription>Code court unique (ex: OUA-01, BBO-02)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Description du dépôt (optionnel)"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Adresse */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Adresse
          </h3>
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adresse *</FormLabel>
                <FormControl>
                  <Input placeholder="Rue, numéro, quartier" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ouagadougou" {...field} />
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
                  <FormLabel>Code postal</FormLabel>
                  <FormControl>
                    <Input placeholder="01 BP 1234" {...field} value={field.value ?? ''} />
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
                    <Input placeholder="Burkina Faso" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contact rapide */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Contact rapide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="+226 XX XX XX XX" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="depot@fasofret.com" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Dépôt par défaut */}
        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Dépôt par défaut</FormLabel>
                <FormDescription>
                  Ce dépôt sera utilisé automatiquement dans les PDFs quand aucun dépôt n&apos;est explicitement sélectionné.
                  Un seul dépôt peut être marqué par défaut.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Bouton de soumission */}
        <div className="flex justify-end gap-3">
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/depots')}
            >
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Enregistrer les modifications' : 'Créer le dépôt'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
