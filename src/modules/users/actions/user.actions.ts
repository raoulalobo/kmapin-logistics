/**
 * Server Actions : Module Users
 *
 * Actions serveur pour la gestion CRUD des utilisateurs
 * Toutes les actions sont sécurisées avec vérification admin (requireAdmin)
 *
 * Actions disponibles:
 * - getUsersAction : Lister les utilisateurs avec filtres et pagination
 * - createUserAction : Créer un nouvel utilisateur
 * - updateUserRoleAction : Modifier le rôle d'un utilisateur
 * - updateUserPermissionsAction : Gérer les permissions personnalisées
 * - toggleUserStatusAction : Activer/désactiver un compte utilisateur
 * - assignUserCompanyAction : Assigner un utilisateur à une entreprise
 * - getCompaniesForSelectAction : Récupérer la liste des entreprises (pour selects)
 *
 * @module modules/users/actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/client';
import { requireAdmin, requireAuth } from '@/lib/auth/config';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  userCreateSchema,
  userRoleUpdateSchema,
  userPermissionsSchema,
  userStatusSchema,
  userCompanySchema,
  userSearchSchema,
  type UserRole,
  type UserCreateData,
  type UserRoleUpdateData,
  type UserPermissionsData,
  type UserStatusData,
  type UserCompanyData,
  type UserSearchParams,
} from '../schemas/user.schema';

/**
 * Type pour les résultats d'actions avec erreur ou succès
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

/**
 * Action : Obtenir la liste des utilisateurs
 *
 * Récupère tous les utilisateurs avec pagination, recherche et filtres.
 * Inclut des statistiques globales (total, admins, actifs, inactifs).
 *
 * Sécurité : Réservé aux administrateurs uniquement
 *
 * @param params - Paramètres de recherche et filtrage
 * @param params.page - Numéro de page (défaut: 1)
 * @param params.limit - Nombre de résultats par page (défaut: 10)
 * @param params.search - Recherche par nom ou email
 * @param params.role - Filtre par rôle
 * @param params.status - Filtre par statut (all, active, inactive)
 * @param params.clientId - Filtre par entreprise
 * @returns Liste des utilisateurs avec statistiques et pagination
 */
export async function getUsersAction(params: Partial<UserSearchParams> = {}) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin();

    // Valider et normaliser les paramètres
    const validatedParams = userSearchSchema.parse({
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search || null,
      role: params.role || null,
      status: params.status || 'all',
      clientId: params.clientId || null,
    });

    const { page, limit, search, role, status, clientId } = validatedParams;

    // Calculer le skip pour la pagination
    const skip = (page - 1) * limit;

    // Construire le filtre WHERE
    const whereClause: any = {};

    // Filtre de recherche (nom OU email)
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    // Filtre par rôle
    if (role) {
      whereClause.role = role;
    }

    // Filtre par statut (actif = emailVerified true, inactif = false)
    if (status === 'active') {
      whereClause.emailVerified = true;
    } else if (status === 'inactive') {
      whereClause.emailVerified = false;
    }

    // Filtre par entreprise
    if (clientId) {
      whereClause.clientId = clientId;
    }

    // Récupérer les utilisateurs et le total en parallèle
    const [users, total, stats] = await Promise.all([
      // Liste des utilisateurs
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              createdShipments: true,
            },
          },
        },
      }),

      // Total d'utilisateurs (avec filtres)
      prisma.user.count({ where: whereClause }),

      // Statistiques globales (sans filtres pour avoir le contexte global)
      prisma.user.groupBy({
        by: ['role', 'emailVerified'],
        _count: true,
      }),
    ]);

    // Calculer les statistiques
    const totalAdmins = stats
      .filter((s) => s.role === 'ADMIN')
      .reduce((acc, s) => acc + s._count, 0);

    const totalActive = stats
      .filter((s) => s.emailVerified === true)
      .reduce((acc, s) => acc + s._count, 0);

    const totalInactive = stats
      .filter((s) => s.emailVerified === false)
      .reduce((acc, s) => acc + s._count, 0);

    const totalUsers = await prisma.user.count();

    return {
      success: true,
      data: {
        users,
        stats: {
          total: totalUsers,
          admins: totalAdmins,
          active: totalActive,
          inactive: totalInactive,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Error getting users:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (
        error.message.includes('Forbidden') ||
        error.message.includes('permission')
      ) {
        return {
          success: false,
          error:
            'Vous n\'avez pas les permissions nécessaires pour consulter les utilisateurs',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération des utilisateurs',
    };
  }
}

/**
 * Action : Créer un nouvel utilisateur
 *
 * Crée un nouvel utilisateur dans le système avec validation complète.
 * Génère un mot de passe temporaire et envoie un email d'invitation si demandé.
 *
 * Sécurité :
 * - Réservé aux administrateurs
 * - Vérification de l'unicité de l'email
 * - Validation de l'entreprise si fournie
 *
 * @param data - Données de création de l'utilisateur
 * @returns ID de l'utilisateur créé ou erreur
 */
export async function createUserAction(
  data: UserCreateData
): Promise<ActionResult<{ id: string; email: string }>> {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin();

    // Valider les données
    const validatedData = userCreateSchema.parse(data);

    // Vérifier l'unicité de l'email
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Un utilisateur avec cet email existe déjà',
        field: 'email',
      };
    }

    // Vérifier que l'entreprise existe si fournie
    if (validatedData.clientId) {
      const companyExists = await prisma.client.findUnique({
        where: { id: validatedData.clientId },
      });

      if (!companyExists) {
        return {
          success: false,
          error: 'L\'entreprise spécifiée n\'existe pas',
          field: 'clientId',
        };
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // CRÉATION AUTOMATIQUE D'UN CLIENT POUR LES UTILISATEURS AVEC RÔLE CLIENT
    // ════════════════════════════════════════════════════════════════════════
    // Si l'utilisateur a le rôle CLIENT et qu'aucun clientId n'est fourni,
    // on crée automatiquement un Client de type INDIVIDUAL avec ses informations.
    // L'utilisateur pourra compléter son profil plus tard (adresse, etc.)
    // ════════════════════════════════════════════════════════════════════════

    let clientIdToUse = validatedData.clientId || null;

    if (validatedData.role === 'CLIENT' && !validatedData.clientId) {
      // Vérifier si un Client avec cet email existe déjà
      const existingClient = await prisma.client.findUnique({
        where: { email: validatedData.email },
      });

      if (existingClient) {
        // Utiliser le Client existant
        clientIdToUse = existingClient.id;
      } else {
        // Créer un nouveau Client INDIVIDUAL
        // Adresse et ville sont requises mais seront à compléter par l'utilisateur
        const newClient = await prisma.client.create({
          data: {
            type: 'INDIVIDUAL',
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone || null,
            address: 'À compléter', // Valeur temporaire
            city: 'À compléter',    // Valeur temporaire
            country: 'FR',
            // Champs spécifiques aux particuliers (extraits du nom si possible)
            firstName: validatedData.name.split(' ')[0] || null,
            lastName: validatedData.name.split(' ').slice(1).join(' ') || null,
          },
        });
        clientIdToUse = newClient.id;
      }
    }

    // Créer l'utilisateur
    // Note: Le mot de passe sera défini par l'utilisateur via le lien de vérification email
    // Better Auth gère automatiquement la création du token de vérification
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        phone: validatedData.phone || null,
        role: validatedData.role,
        clientId: clientIdToUse,
        emailVerified: false, // Sera vérifié via email
        // Le password sera défini lors de la première connexion via Better Auth
      },
    });

    // TODO: Envoyer l'email d'invitation si sendInvitation = true
    // Cette fonctionnalité nécessite l'intégration de Resend
    // et la création d'un template d'email d'invitation
    if (validatedData.sendInvitation) {
      console.log(
        `[TODO] Envoyer email d'invitation à ${user.email} avec lien de vérification`
      );
      // await sendInvitationEmail(user.email, user.name);
    }

    // Revalider la liste des utilisateurs
    revalidatePath('/dashboard/users');

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
      },
    };
  } catch (error) {
    console.error('Error creating user:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('Forbidden') ||
        error.message.includes('permission')
      ) {
        return {
          success: false,
          error:
            'Vous n\'avez pas les permissions nécessaires pour créer un utilisateur',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }

      if (error.message.includes('ZodError')) {
        return {
          success: false,
          error: 'Données invalides',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la création de l\'utilisateur',
    };
  }
}

/**
 * Action : Modifier le rôle d'un utilisateur
 *
 * Met à jour le rôle d'un utilisateur existant.
 *
 * Sécurité :
 * - Réservé aux administrateurs
 * - Empêche la modification de son propre rôle
 *
 * @param userId - ID de l'utilisateur à modifier
 * @param data - Nouveau rôle
 * @returns Résultat de la modification
 */
export async function updateUserRoleAction(
  userId: string,
  data: UserRoleUpdateData
): Promise<ActionResult<{ id: string }>> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();

    // Empêcher la modification de son propre rôle
    if (session.user.id === userId) {
      return {
        success: false,
        error:
          'Vous ne pouvez pas modifier votre propre rôle. Demandez à un autre administrateur.',
      };
    }

    // Valider les données
    const validatedData = userRoleUpdateSchema.parse(data);

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'Utilisateur introuvable',
      };
    }

    // Mettre à jour le rôle
    await prisma.user.update({
      where: { id: userId },
      data: { role: validatedData.role },
    });

    // Revalider la page
    revalidatePath('/dashboard/users');

    return {
      success: true,
      data: { id: userId },
    };
  } catch (error) {
    console.error('Error updating user role:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('Forbidden') ||
        error.message.includes('permission')
      ) {
        return {
          success: false,
          error:
            'Vous n\'avez pas les permissions nécessaires pour modifier ce rôle',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la modification du rôle',
    };
  }
}

/**
 * Action : Gérer les permissions personnalisées d'un utilisateur
 *
 * Ajoute ou retire des permissions custom au-delà de celles du rôle.
 * Stocke les permissions dans un champ JSON avec métadonnées.
 *
 * Structure JSON:
 * {
 *   "custom": ["permission1", "permission2"],
 *   "metadata": {
 *     "lastModified": "ISO date",
 *     "modifiedBy": "admin user id"
 *   }
 * }
 *
 * @param userId - ID de l'utilisateur
 * @param data - Nouvelles permissions custom
 * @returns Résultat de la modification
 */
export async function updateUserPermissionsAction(
  userId: string,
  data: UserPermissionsData
): Promise<ActionResult<{ id: string }>> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();

    // Valider les données
    const validatedData = userPermissionsSchema.parse(data);

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'Utilisateur introuvable',
      };
    }

    // Créer la structure JSON des permissions
    const permissionsData = {
      custom: validatedData.permissions,
      metadata: {
        lastModified: new Date().toISOString(),
        modifiedBy: session.user.id,
      },
    };

    // Mettre à jour les permissions
    await prisma.user.update({
      where: { id: userId },
      data: { permissions: permissionsData },
    });

    // Revalider la page
    revalidatePath('/dashboard/users');

    return {
      success: true,
      data: { id: userId },
    };
  } catch (error) {
    console.error('Error updating user permissions:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('Forbidden') ||
        error.message.includes('permission')
      ) {
        return {
          success: false,
          error:
            'Vous n\'avez pas les permissions nécessaires pour gérer les permissions',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour des permissions',
    };
  }
}

/**
 * Action : Activer ou désactiver un compte utilisateur
 *
 * Modifie le statut d'un utilisateur (champ emailVerified utilisé comme flag actif/inactif).
 *
 * Sécurité :
 * - Réservé aux administrateurs
 * - Empêche la désactivation de son propre compte
 * - Empêche la désactivation du dernier admin actif
 *
 * @param userId - ID de l'utilisateur
 * @param data - Nouveau statut (active: true/false)
 * @returns Résultat de la modification
 */
export async function toggleUserStatusAction(
  userId: string,
  data: UserStatusData
): Promise<ActionResult> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();

    // Valider les données
    const validatedData = userStatusSchema.parse(data);

    // Empêcher la désactivation de son propre compte
    if (session.user.id === userId && !validatedData.active) {
      return {
        success: false,
        error:
          'Vous ne pouvez pas désactiver votre propre compte. Demandez à un autre administrateur.',
      };
    }

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'Utilisateur introuvable',
      };
    }

    // Si on désactive un ADMIN, vérifier qu'il en reste au moins un autre actif
    if (existingUser.role === 'ADMIN' && !validatedData.active) {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: 'ADMIN',
          emailVerified: true,
          id: { not: userId }, // Exclure l'utilisateur qu'on désactive
        },
      });

      if (activeAdminsCount === 0) {
        return {
          success: false,
          error:
            'Impossible de désactiver le dernier administrateur actif. Il doit y avoir au moins un administrateur actif dans le système.',
        };
      }
    }

    // Mettre à jour le statut
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: validatedData.active,
      },
    });

    // Revalider la page
    revalidatePath('/dashboard/users');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Error toggling user status:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('Forbidden') ||
        error.message.includes('permission')
      ) {
        return {
          success: false,
          error:
            'Vous n\'avez pas les permissions nécessaires pour modifier le statut',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la modification du statut',
    };
  }
}

/**
 * Action : Assigner un utilisateur à une entreprise
 *
 * Associe ou dissocie un utilisateur d'une entreprise (modification du clientId).
 *
 * Sécurité :
 * - Réservé aux administrateurs
 * - Vérifie l'existence de l'entreprise si fournie
 *
 * @param userId - ID de l'utilisateur
 * @param data - ID de l'entreprise (ou null pour dissocier)
 * @returns Résultat de la modification
 */
export async function assignUserCompanyAction(
  userId: string,
  data: UserCompanyData
): Promise<ActionResult<{ id: string }>> {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin();

    // Valider les données
    const validatedData = userCompanySchema.parse(data);

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return {
        success: false,
        error: 'Utilisateur introuvable',
      };
    }

    // Si une entreprise est fournie, vérifier qu'elle existe
    if (validatedData.clientId) {
      const companyExists = await prisma.client.findUnique({
        where: { id: validatedData.clientId },
      });

      if (!companyExists) {
        return {
          success: false,
          error: 'L\'entreprise spécifiée n\'existe pas',
          field: 'clientId',
        };
      }
    }

    // Mettre à jour l'assignation
    await prisma.user.update({
      where: { id: userId },
      data: {
        clientId: validatedData.clientId || null,
      },
    });

    // Revalider la page
    revalidatePath('/dashboard/users');

    return {
      success: true,
      data: { id: userId },
    };
  } catch (error) {
    console.error('Error assigning user to company:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('Forbidden') ||
        error.message.includes('permission')
      ) {
        return {
          success: false,
          error:
            'Vous n\'avez pas les permissions nécessaires pour assigner des entreprises',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }
    }

    return {
      success: false,
      error:
        'Une erreur est survenue lors de l\'assignation de l\'entreprise',
    };
  }
}

/**
 * Action : Récupérer la liste des entreprises pour les selects
 *
 * Retourne une liste simplifiée des entreprises (id + nom)
 * pour alimenter les composants de sélection (Select, Combobox).
 *
 * Sécurité : Réservé aux administrateurs
 *
 * @returns Liste des entreprises avec id et nom uniquement
 */
export async function getCompaniesForSelectAction(): Promise<
  ActionResult<Array<{ id: string; name: string }>>
> {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin();

    // Récupérer les entreprises triées par nom
    const companies = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: companies,
    };
  } catch (error) {
    console.error('Error getting companies for select:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('Forbidden') ||
        error.message.includes('permission')
      ) {
        return {
          success: false,
          error:
            'Vous n\'avez pas les permissions nécessaires pour consulter les entreprises',
        };
      }

      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour effectuer cette action',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération des entreprises',
    };
  }
}
