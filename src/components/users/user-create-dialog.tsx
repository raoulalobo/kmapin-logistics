/**
 * Composant : Dialog de Création d'Utilisateur
 *
 * Dialog permettant aux administrateurs de créer un nouvel utilisateur
 * avec validation complète des données (React Hook Form + Zod).
 *
 * Champs du formulaire:
 * - Email* (unique, validé)
 * - Nom complet*
 * - Téléphone (optionnel)
 * - Rôle* (select, défaut: CLIENT)
 * - Entreprise (select optionnel, chargement async)
 * - Envoyer invitation (checkbox, défaut: true)
 *
 * @module components/users
 */

'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import {
  createUserAction,
  getCompaniesForSelectAction,
  userCreateSchema,
  type UserCreateData,
} from '@/modules/users';
import { getAllRoles } from '@/modules/users';

/**
 * Props du composant UserCreateDialog
 */
interface UserCreateDialogProps {
  /** Élément déclencheur (bouton) du dialog */
  children: React.ReactNode;
}

/**
 * Dialog de création d'un utilisateur
 *
 * Affiche un formulaire complet avec validation en temps réel.
 * Charge la liste des entreprises dynamiquement au montage.
 */
export function UserCreateDialog({ children }: UserCreateDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // États du dialog et des données
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [companies, setCompanies] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  // Formulaire React Hook Form avec validation Zod
  const form = useForm<UserCreateData>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: '',
      name: '',
      phone: '',
      role: 'CLIENT',
      companyId: '',
      sendInvitation: true,
    },
  });

  /**
   * Charger la liste des entreprises au montage du dialog
   */
  useEffect(() => {
    if (isDialogOpen && companies.length === 0) {
      loadCompanies();
    }
  }, [isDialogOpen]);

  /**
   * Charger les entreprises disponibles
   */
  async function loadCompanies() {
    setIsLoadingCompanies(true);
    try {
      const result = await getCompaniesForSelectAction();
      if (result.success && result.data) {
        setCompanies(result.data);
      } else {
        toast.error('Erreur lors du chargement des entreprises');
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Erreur lors du chargement des entreprises');
    } finally {
      setIsLoadingCompanies(false);
    }
  }

  /**
   * Soumettre le formulaire de création
   */
  function onSubmit(data: UserCreateData) {
    startTransition(async () => {
      const result = await createUserAction(data);

      if (!result.success) {
        // Afficher l'erreur (avec champ spécifique si fourni)
        if (result.field) {
          form.setError(result.field as any, {
            message: result.error,
          });
        } else {
          toast.error(result.error || 'Erreur lors de la création');
        }
      } else {
        toast.success(
          `Utilisateur ${result.data.email} créé avec succès !${data.sendInvitation ? ' Un email d\'invitation a été envoyé.' : ''}`
        );

        // Fermer le dialog et réinitialiser le formulaire
        setIsDialogOpen(false);
        form.reset();

        // Rafraîchir la page pour afficher le nouvel utilisateur
        router.refresh();
      }
    });
  }

  /**
   * Récupérer la liste des rôles pour le select
   */
  const roles = getAllRoles();

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Ajoutez un nouvel utilisateur au système. Un email d'invitation sera
            envoyé pour permettre à l'utilisateur de définir son mot de passe.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="utilisateur@exemple.com"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Adresse email unique de l'utilisateur
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nom complet */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nom complet <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Jean Dupont"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Téléphone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      {...field}
                      value={field.value || ''}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Grille 2 colonnes pour Rôle et Entreprise */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rôle */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Rôle <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un rôle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((roleInfo) => (
                          <SelectItem
                            key={roleInfo.role}
                            value={roleInfo.role}
                          >
                            {roleInfo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Détermine les permissions de base
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Entreprise */}
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entreprise (optionnel)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || ''}
                      disabled={isPending || isLoadingCompanies}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Aucune entreprise" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Aucune entreprise</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Assignation à une entreprise cliente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Checkbox : Envoyer invitation */}
            <FormField
              control={form.control}
              name="sendInvitation"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Envoyer un email d'invitation</FormLabel>
                    <FormDescription>
                      L'utilisateur recevra un email avec un lien pour
                      vérifier son compte et définir son mot de passe
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer l'utilisateur
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
