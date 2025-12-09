/**
 * Composant : Action de Gestion des Permissions Personnalisées
 *
 * Dialog large permettant aux administrateurs de gérer les permissions
 * personnalisées d'un utilisateur au-delà de celles de son rôle.
 *
 * Affiche :
 * - Permissions héritées du rôle (read-only, badges gris)
 * - Permissions personnalisées (éditable, checkboxes par catégorie)
 *
 * @module components/users
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  updateUserPermissionsAction,
  type UserRole,
  PERMISSION_CATEGORIES,
} from '@/modules/users';
import { PERMISSIONS } from '@/lib/auth/permissions';

/**
 * Props du composant UserPermissionsAction
 */
interface UserPermissionsActionProps {
  /** ID de l'utilisateur */
  userId: string;
  /** Nom de l'utilisateur (pour l'affichage) */
  userName: string;
  /** Rôle de l'utilisateur (pour afficher les permissions héritées) */
  userRole: UserRole;
  /** Permissions personnalisées actuelles (array de strings) */
  currentPermissions: string[];
  /** Élément déclencheur (bouton) */
  children: React.ReactNode;
}

/**
 * Dialog de gestion des permissions personnalisées
 *
 * Organisation :
 * 1. Section "Permissions du rôle" (affichage uniquement)
 * 2. Section "Permissions personnalisées" (éditable par catégorie)
 */
export function UserPermissionsAction({
  userId,
  userName,
  userRole,
  currentPermissions,
  children,
}: UserPermissionsActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // États du dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] =
    useState<string[]>(currentPermissions);

  /**
   * Récupérer les permissions héritées du rôle
   */
  const rolePermissions = PERMISSIONS[userRole] || [];
  const isAdminRole = rolePermissions.includes('*');

  /**
   * Vérifier si une permission est héritée du rôle
   */
  function isInheritedPermission(permissionId: string): boolean {
    if (isAdminRole) return true; // Admin a toutes les permissions
    return rolePermissions.includes(permissionId);
  }

  /**
   * Gérer le changement d'une checkbox de permission
   */
  function handlePermissionToggle(permissionId: string, checked: boolean) {
    if (checked) {
      // Ajouter la permission
      setSelectedPermissions((prev) => [...prev, permissionId]);
    } else {
      // Retirer la permission
      setSelectedPermissions((prev) =>
        prev.filter((p) => p !== permissionId)
      );
    }
  }

  /**
   * Soumettre les nouvelles permissions
   */
  function handleSubmit() {
    // Vérifier si les permissions ont changé
    const permissionsChanged =
      JSON.stringify([...currentPermissions].sort()) !==
      JSON.stringify([...selectedPermissions].sort());

    if (!permissionsChanged) {
      toast.info('Les permissions n\'ont pas changé');
      return;
    }

    startTransition(async () => {
      const result = await updateUserPermissionsAction(userId, {
        permissions: selectedPermissions,
      });

      if (!result.success) {
        toast.error(
          result.error || 'Erreur lors de la mise à jour des permissions'
        );
      } else {
        toast.success(`Permissions de ${userName} mises à jour avec succès`);

        // Fermer le dialog
        setIsDialogOpen(false);

        // Rafraîchir la page
        router.refresh();
      }
    });
  }

  /**
   * Réinitialiser les permissions lors de la fermeture
   */
  function handleOpenChange(open: boolean) {
    if (!open) {
      setSelectedPermissions(currentPermissions);
    }
    setIsDialogOpen(open);
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gérer les permissions de {userName}</DialogTitle>
          <DialogDescription>
            Les permissions personnalisées s'ajoutent aux permissions héritées
            du rôle. L'utilisateur aura accès à toutes les permissions combinées.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Section 1: Permissions du rôle (read-only) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">
                  Permissions héritées du rôle ({userRole})
                </h3>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  {isAdminRole ? (
                    <div className="text-sm text-muted-foreground">
                      <Badge variant="destructive" className="mb-2">
                        ADMIN - Accès complet
                      </Badge>
                      <p>
                        Le rôle ADMIN a accès à toutes les fonctionnalités du
                        système sans restriction.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {rolePermissions.length > 0 ? (
                        rolePermissions.map((permission) => (
                          <Badge key={permission} variant="secondary">
                            {permission}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Aucune permission héritée du rôle
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Section 2: Permissions personnalisées (éditable) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">
                  Permissions personnalisées
                </h3>
              </div>

              {/* Affichage par catégories */}
              <div className="space-y-4">
                {Object.entries(PERMISSION_CATEGORIES).map(
                  ([categoryName, permissions]) => (
                    <Card key={categoryName}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          {categoryName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {permissions.map((permission) => {
                            const isInherited = isInheritedPermission(
                              permission.id
                            );
                            const isSelected = selectedPermissions.includes(
                              permission.id
                            );

                            return (
                              <div
                                key={permission.id}
                                className="flex items-start space-x-3"
                              >
                                <Checkbox
                                  id={permission.id}
                                  checked={isSelected}
                                  onCheckedChange={(checked) =>
                                    handlePermissionToggle(
                                      permission.id,
                                      checked as boolean
                                    )
                                  }
                                  disabled={isInherited || isPending}
                                />
                                <div className="grid gap-1.5 leading-none flex-1">
                                  <label
                                    htmlFor={permission.id}
                                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                                      isInherited
                                        ? 'text-muted-foreground'
                                        : 'cursor-pointer'
                                    }`}
                                  >
                                    {permission.label}
                                    {isInherited && (
                                      <Badge
                                        variant="outline"
                                        className="ml-2 text-xs"
                                      >
                                        Hérité
                                      </Badge>
                                    )}
                                  </label>
                                  <p className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Enregistrer les permissions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
