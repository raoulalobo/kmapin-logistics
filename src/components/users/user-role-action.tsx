/**
 * Composant : Action de Modification de Rôle
 *
 * Dialog permettant aux administrateurs de modifier le rôle d'un utilisateur.
 * Affiche le rôle actuel et permet de sélectionner un nouveau rôle
 * avec une description complète.
 *
 * @module components/users
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, CircleNotch } from '@phosphor-icons/react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import {
  updateUserRoleAction,
  type UserRole,
  getAllRoles,
  getRoleLabel,
  getRoleDescription,
  getRoleBadgeVariant,
} from '@/modules/users';

/**
 * Props du composant UserRoleAction
 */
interface UserRoleActionProps {
  /** ID de l'utilisateur */
  userId: string;
  /** Rôle actuel de l'utilisateur */
  currentRole: UserRole;
  /** Élément déclencheur (bouton) */
  children: React.ReactNode;
}

/**
 * Dialog de modification du rôle utilisateur
 *
 * Affiche une comparaison entre le rôle actuel et le nouveau rôle sélectionné
 * avec leurs descriptions complètes.
 */
export function UserRoleAction({
  userId,
  currentRole,
  children,
}: UserRoleActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // États du dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);

  // Liste de tous les rôles disponibles
  const roles = getAllRoles();

  /**
   * Soumettre la modification de rôle
   */
  function handleSubmit() {
    // Vérifier si le rôle a changé
    if (selectedRole === currentRole) {
      toast.info('Le rôle est déjà défini à cette valeur');
      return;
    }

    startTransition(async () => {
      const result = await updateUserRoleAction(userId, { role: selectedRole });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la modification du rôle');
      } else {
        toast.success(
          `Rôle modifié avec succès : ${getRoleLabel(selectedRole)}`
        );

        // Fermer le dialog
        setIsDialogOpen(false);

        // Rafraîchir la page pour afficher le nouveau rôle
        router.refresh();
      }
    });
  }

  /**
   * Réinitialiser la sélection lors de la fermeture
   */
  function handleOpenChange(open: boolean) {
    if (!open) {
      setSelectedRole(currentRole);
    }
    setIsDialogOpen(open);
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le rôle de l'utilisateur</DialogTitle>
          <DialogDescription>
            Le rôle détermine les permissions de base de l'utilisateur dans le
            système. Des permissions personnalisées peuvent être ajoutées
            indépendamment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Affichage du rôle actuel */}
          <div className="space-y-2">
            <Label>Rôle actuel</Label>
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {getRoleLabel(currentRole)}
                    </span>
                  </div>
                  <Badge variant={getRoleBadgeVariant(currentRole)}>
                    {currentRole}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getRoleDescription(currentRole)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sélection du nouveau rôle */}
          <div className="space-y-2">
            <Label htmlFor="new-role">
              Nouveau rôle <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
              disabled={isPending}
            >
              <SelectTrigger id="new-role">
                <SelectValue placeholder="Sélectionnez un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((roleInfo) => (
                  <SelectItem key={roleInfo.role} value={roleInfo.role}>
                    {roleInfo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Affichage de la description du rôle sélectionné */}
          {selectedRole && selectedRole !== currentRole && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">
                      {getRoleLabel(selectedRole)}
                    </span>
                  </div>
                  <Badge variant={getRoleBadgeVariant(selectedRole)}>
                    {selectedRole}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getRoleDescription(selectedRole)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Message si le rôle n'a pas changé */}
          {selectedRole === currentRole && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Sélectionnez un nouveau rôle différent du rôle actuel
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedRole === currentRole}
          >
            {isPending ? (
              <>
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                Modification...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Modifier le rôle
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
