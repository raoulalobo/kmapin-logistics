/**
 * Dialog de formulaire pour créer ou modifier un pays
 *
 * Composant Dialog réutilisable avec React Hook Form et Zod
 */
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  createCountrySchema,
  updateCountrySchema,
  type CreateCountryInput,
  type UpdateCountryInput,
} from '@/modules/countries';
import { createCountry, updateCountry } from '@/modules/countries';
import { useRouter } from 'next/navigation';

interface CountryFormDialogProps {
  /** État d'ouverture du dialog */
  open: boolean;
  /** Callback pour changer l'état d'ouverture */
  onOpenChange: (open: boolean) => void;
  /** Mode création ou édition */
  mode: 'create' | 'edit';
  /** Données du pays à éditer (requis en mode edit) */
  country?: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
}

/**
 * Dialog de formulaire pour créer ou modifier un pays
 *
 * @param open - État d'ouverture du dialog
 * @param onOpenChange - Callback pour changer l'état
 * @param mode - Mode 'create' ou 'edit'
 * @param country - Données du pays (requis en mode edit)
 *
 * @example
 * ```tsx
 * // Mode création
 * <CountryFormDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   mode="create"
 * />
 *
 * // Mode édition
 * <CountryFormDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   mode="edit"
 *   country={selectedCountry}
 * />
 * ```
 */
export function CountryFormDialog({
  open,
  onOpenChange,
  mode,
  country,
}: CountryFormDialogProps) {
  const router = useRouter();
  const schema = mode === 'create' ? createCountrySchema : updateCountrySchema;

  // Initialiser le formulaire avec React Hook Form
  const form = useForm<CreateCountryInput | UpdateCountryInput>({
    resolver: zodResolver(schema),
    defaultValues:
      mode === 'edit' && country
        ? {
            code: country.code,
            name: country.name,
            isActive: country.isActive,
          }
        : {
            code: '',
            name: '',
            isActive: true,
          },
  });

  // Réinitialiser le formulaire quand le dialog s'ouvre/ferme ou que le pays change
  useEffect(() => {
    if (open && mode === 'edit' && country) {
      form.reset({
        code: country.code,
        name: country.name,
        isActive: country.isActive,
      });
    } else if (open && mode === 'create') {
      form.reset({
        code: '',
        name: '',
        isActive: true,
      });
    }
  }, [open, mode, country, form]);

  /**
   * Soumission du formulaire
   */
  async function onSubmit(data: CreateCountryInput | UpdateCountryInput) {
    try {
      if (mode === 'create') {
        await createCountry(data as CreateCountryInput);
        toast.success('Pays créé avec succès');
      } else if (mode === 'edit' && country) {
        await updateCountry(country.id, data as UpdateCountryInput);
        toast.success('Pays mis à jour avec succès');
      }

      // Fermer le dialog
      onOpenChange(false);

      // Rafraîchir la page
      router.refresh();

      // Réinitialiser le formulaire
      form.reset();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Ajouter un pays' : 'Modifier le pays'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Ajoutez un nouveau pays pour les expéditions et devis'
              : 'Modifiez les informations du pays'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Code pays */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code pays (ISO 3166-1)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="FR"
                      {...field}
                      maxLength={2}
                      className="uppercase"
                      disabled={mode === 'edit'} // Ne pas permettre de changer le code en édition
                    />
                  </FormControl>
                  <FormDescription>
                    Code ISO à 2 lettres (ex: FR, DE, US)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nom du pays */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du pays</FormLabel>
                  <FormControl>
                    <Input placeholder="France" {...field} />
                  </FormControl>
                  <FormDescription>
                    Nom complet en français
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pays actif */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Pays actif
                    </FormLabel>
                    <FormDescription>
                      Les pays inactifs n'apparaissent pas dans les formulaires
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-[#003D82] hover:bg-[#002952]"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? 'Enregistrement...'
                  : mode === 'create'
                  ? 'Créer'
                  : 'Mettre à jour'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
