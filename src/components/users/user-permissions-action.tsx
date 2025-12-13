/**
 * Composant : Action de Gestion des Permissions Personnalisées
 *
 * Dialog permettant aux administrateurs de gérer les permissions
 * personnalisées d'un utilisateur au-delà de celles de son rôle.
 *
 * Utilise StandardModal pour une interface uniforme avec recherche,
 * filtres par catégorie et tri.
 *
 * @module components/users
 */

'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  StandardModal,
  type StandardModalItem,
} from '@/components/modals';

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
 * Dialog de gestion des permissions personnalisées avec StandardModal
 *
 * Affiche :
 * 1. Informations sur les permissions héritées du rôle (dans la description)
 * 2. StandardModal pour sélectionner les permissions personnalisées
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
   * Transformer les PERMISSION_CATEGORIES en StandardModalItem[]
   *
   * Chaque permission devient un item avec :
   * - id, label, description (depuis PermissionItem)
   * - status: 'active' si sélectionnée, 'default' sinon
   * - disabled: true si héritée du rôle
   * - disabledReason: explication si héritée
   * - badge: "Hérité" si héritée du rôle
   * - category: nom de la catégorie
   */
  const permissionItems: StandardModalItem[] = useMemo(() => {
    return Object.entries(PERMISSION_CATEGORIES).flatMap(
      ([categoryName, permissions]) =>
        permissions.map((permission) => {
          const isInherited = isInheritedPermission(permission.id);
          const isSelected = selectedPermissions.includes(permission.id);

          return {
            id: permission.id,
            label: permission.label,
            description: permission.description,
            status: isSelected ? ('active' as const) : ('default' as const),
            category: categoryName,
            disabled: isInherited,
            disabledReason: isInherited
              ? `Cette permission est déjà héritée du rôle ${userRole}`
              : undefined,
            badge: isInherited
              ? {
                  text: 'Hérité',
                  variant: 'outline' as const,
                }
              : undefined,
          };
        })
    );
  }, [selectedPermissions, userRole, isAdminRole, rolePermissions]);

  /**
   * Soumettre les nouvelles permissions
   */
  function handleSubmit(selectedIds: string[]) {
    // Vérifier si les permissions ont changé
    const permissionsChanged =
      JSON.stringify([...currentPermissions].sort()) !==
      JSON.stringify([...selectedIds].sort());

    if (!permissionsChanged) {
      toast.info("Les permissions n'ont pas changé");
      setIsModalOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await updateUserPermissionsAction(userId, {
        permissions: selectedIds,
      });

      if (!result.success) {
        toast.error(
          result.error || 'Erreur lors de la mise à jour des permissions'
        );
      } else {
        toast.success(`Permissions de ${userName} mises à jour avec succès`);

        // Fermer le modal
        setIsModalOpen(false);

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
    setIsModalOpen(open);
  }

  /**
   * Construire la description avec les infos sur les permissions héritées
   */
  const descriptionText = useMemo(() => {
    if (isAdminRole) {
      return `⚠️ Le rôle ADMIN a accès complet à toutes les fonctionnalités. Les permissions personnalisées s'ajouteront aux permissions du rôle.`;
    }

    if (rolePermissions.length > 0) {
      return `Les permissions personnalisées s'ajoutent aux ${rolePermissions.length} permission(s) héritée(s) du rôle ${userRole}. Les permissions héritées sont marquées "Hérité" et ne peuvent pas être modifiées.`;
    }

    return 'Sélectionnez les permissions personnalisées à accorder à cet utilisateur.';
  }, [isAdminRole, rolePermissions, userRole]);

  return (
    <div onClick={(e) => {
      // Si le trigger est cliqué, ouvrir le modal
      const target = e.target as HTMLElement;
      if (target.closest('[data-trigger]')) {
        setIsModalOpen(true);
      }
    }}>
      {/* Trigger Button */}
      <div data-trigger>{children}</div>

      {/* StandardModal - Dialog principal (pas de Dialog imbriqué) */}
      <StandardModal
        open={isModalOpen}
        onOpenChange={handleOpenChange}
        title={`Gérer les permissions de ${userName}`}
        description={descriptionText}
        items={permissionItems}
        selectionMode="multiple"
        selectedIds={selectedPermissions}
        onSelectionChange={setSelectedPermissions}
        filters={{
          searchEnabled: true,
          searchPlaceholder: 'Rechercher une permission...',
          filterOptions: Object.keys(PERMISSION_CATEGORIES).map(
            (categoryName) => ({
              label: categoryName,
              value: categoryName,
            })
          ),
          filterLabel: 'Catégorie',
          sortOptions: [
            {
              label: 'Nom (A-Z)',
              value: 'name-asc',
              sortFn: (a, b) => a.label.localeCompare(b.label),
            },
            {
              label: 'Nom (Z-A)',
              value: 'name-desc',
              sortFn: (a, b) => b.label.localeCompare(a.label),
            },
            {
              label: 'Catégorie',
              value: 'category',
              sortFn: (a, b) =>
                (a.category || '').localeCompare(b.category || ''),
            },
          ],
          sortLabel: 'Trier par',
        }}
        groupByCategory={true}
        onSubmit={handleSubmit}
        labels={{
          submit: 'Enregistrer les permissions',
          cancel: 'Annuler',
        }}
        isLoading={isPending}
        maxWidth="4xl"
      />
    </div>
  );
}
