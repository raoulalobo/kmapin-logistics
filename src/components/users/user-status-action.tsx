/**
 * Composant : Action d'Activation/Désactivation de Compte
 *
 * AlertDialog permettant aux administrateurs de désactiver ou réactiver
 * un compte utilisateur. Utilise AlertDialog car c'est une action sensible.
 *
 * Comportements :
 * - Actif → Désactiver (destructive, rouge)
 * - Inactif → Activer (default, vert)
 *
 * @module components/users
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { toggleUserStatusAction } from '@/modules/users';

/**
 * Props du composant UserStatusAction
 */
interface UserStatusActionProps {
  /** ID de l'utilisateur */
  userId: string;
  /** Nom de l'utilisateur (pour l'affichage) */
  userName: string;
  /** Statut actuel (emailVerified utilisé comme flag actif/inactif) */
  currentStatus: boolean;
  /** Élément déclencheur (bouton) */
  children: React.ReactNode;
}

/**
 * AlertDialog d'activation/désactivation de compte
 *
 * Affiche un message d'avertissement adapté selon l'action
 * (désactivation = destructive, activation = normale)
 */
export function UserStatusAction({
  userId,
  userName,
  currentStatus,
  children,
}: UserStatusActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Déterminer l'action à effectuer
  const isActivating = !currentStatus; // true si on active, false si on désactive

  /**
   * Soumettre le changement de statut
   */
  function handleSubmit() {
    startTransition(async () => {
      const result = await toggleUserStatusAction(userId, {
        active: isActivating,
        reason: null, // Optionnel, pas implémenté dans l'UI pour le moment
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la modification du statut');
      } else {
        toast.success(
          isActivating
            ? `Compte de ${userName} activé avec succès`
            : `Compte de ${userName} désactivé avec succès`
        );

        // Fermer le dialog
        setIsDialogOpen(false);

        // Rafraîchir la page
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {!isActivating && (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            <AlertDialogTitle>
              {isActivating
                ? 'Activer cet utilisateur ?'
                : 'Désactiver cet utilisateur ?'}
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription className="space-y-2">
            {isActivating ? (
              // Message pour activation
              <>
                <p>
                  Vous êtes sur le point d'activer le compte de{' '}
                  <span className="font-semibold text-foreground">
                    {userName}
                  </span>
                  .
                </p>
                <p>
                  L'utilisateur pourra à nouveau se connecter et accéder aux
                  fonctionnalités selon son rôle et ses permissions.
                </p>
              </>
            ) : (
              // Message pour désactivation
              <>
                <p>
                  Vous êtes sur le point de désactiver le compte de{' '}
                  <span className="font-semibold text-foreground">
                    {userName}
                  </span>
                  .
                </p>
                <p className="text-destructive font-medium">
                  L'utilisateur ne pourra plus se connecter au système.
                </p>
                <p className="text-xs text-muted-foreground">
                  Vous pourrez réactiver le compte à tout moment si nécessaire.
                  Aucune donnée ne sera supprimée.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={isPending}
            className={isActivating ? '' : 'bg-destructive hover:bg-destructive/90'}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isActivating ? 'Activation...' : 'Désactivation...'}
              </>
            ) : (
              <>
                {isActivating ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmer et activer
                  </>
                ) : (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    Confirmer et désactiver
                  </>
                )}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
