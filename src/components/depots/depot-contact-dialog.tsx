/**
 * Composant : DepotContactDialog
 *
 * Dialog modal pour ajouter ou modifier un contact de dépôt.
 * Utilise React Hook Form + Zod pour la validation.
 *
 * @param open - État d'ouverture du dialog
 * @param onOpenChange - Callback pour changer l'état d'ouverture
 * @param depotId - ID du dépôt parent
 * @param contact - Contact existant (mode édition) ou null (mode ajout)
 * @param onSuccess - Callback après succès de l'opération
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleNotch } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  depotContactSchema,
  type DepotContactData,
} from '@/modules/depots/schemas/depot.schema';
import {
  addDepotContact,
  updateDepotContact,
} from '@/modules/depots/actions/depot.actions';

/**
 * Type d'un contact existant pour le mode édition
 */
interface ExistingContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

interface DepotContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depotId: string;
  contact: ExistingContact | null;
  onSuccess: () => void;
}

export function DepotContactDialog({
  open,
  onOpenChange,
  depotId,
  contact,
  onSuccess,
}: DepotContactDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!contact;

  const form = useForm<DepotContactData>({
    resolver: zodResolver(depotContactSchema),
    defaultValues: {
      name: contact?.name ?? '',
      role: contact?.role ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      isPrimary: contact?.isPrimary ?? false,
    },
  });

  // Réinitialiser le formulaire quand le contact change (ouverture dialog)
  useEffect(() => {
    if (open) {
      form.reset({
        name: contact?.name ?? '',
        role: contact?.role ?? '',
        email: contact?.email ?? '',
        phone: contact?.phone ?? '',
        isPrimary: contact?.isPrimary ?? false,
      });
    }
  }, [open, contact, form]);

  async function onSubmit(data: DepotContactData) {
    setIsSubmitting(true);
    try {
      if (isEditing && contact) {
        await updateDepotContact(contact.id, data);
        toast({
          title: 'Contact modifié',
          description: `Le contact "${data.name}" a été mis à jour.`,
        });
      } else {
        await addDepotContact(depotId, data);
        toast({
          title: 'Contact ajouté',
          description: `Le contact "${data.name}" a été ajouté au dépôt.`,
        });
      }
      form.reset();
      onSuccess();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le contact' : 'Ajouter un contact'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nom */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet *</FormLabel>
                  <FormControl>
                    <Input placeholder="Jean Dupont" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rôle */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonction</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Responsable, Agent de réception..."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email et Téléphone */}
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@example.com"
                        {...field}
                        value={field.value ?? ''}
                      />
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
                      <Input
                        placeholder="+226 XX XX XX XX"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact principal */}
            <FormField
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Contact principal</FormLabel>
                    <FormDescription className="text-xs">
                      Ses coordonnées seront affichées dans les PDFs du dépôt.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
