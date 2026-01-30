/**
 * Server Actions : Clients
 *
 * Actions serveur pour la gestion CRUD des clients
 * Toutes les actions sont sécurisées avec vérification d'authentification
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/config';
import { requirePermission } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/permissions-client';
import { UserRole } from '@/lib/db/enums';
import {
  clientSchema,
  clientUpdateSchema,
  type ClientFormData,
  type ClientUpdateData,
} from '../schemas/client.schema';

/**
 * Type pour les résultats d'actions avec erreur ou succès
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

/**
 * Action : Créer un nouveau client
 *
 * Crée une nouvelle entreprise cliente dans la base de données
 * après validation des données et vérification des permissions
 *
 * @param formData - Données du formulaire de création
 * @returns Résultat avec ID du client créé ou erreur
 */
export async function createClientAction(
  data: ClientFormData | FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN et OPERATIONS_MANAGER peuvent créer des clients
     * Permission requise: 'clients:create'
     */
    await requirePermission('clients:create');

    // Extraire et valider les données
    let validatedData: ClientFormData;

    if (data instanceof FormData) {
      // Si c'est un FormData (formulaire natif), extraire les valeurs
      const rawData = {
        name: data.get('name'),
        legalName: data.get('legalName') || null,
        taxId: data.get('taxId') || null,
        email: data.get('email'),
        phone: data.get('phone') || null,
        address: data.get('address'),
        city: data.get('city'),
        postalCode: data.get('postalCode'),
        country: data.get('country') || 'FR',
        website: data.get('website') || null,
      };
      validatedData = clientSchema.parse(rawData);
    } else {
      // Si c'est déjà un objet ClientFormData, juste valider
      validatedData = clientSchema.parse(data);
    }

    // Vérifier si un client avec le même email existe déjà
    const existingClient = await prisma.client.findFirst({
      where: { email: validatedData.email },
    });

    if (existingClient) {
      return {
        success: false,
        error: 'Un client avec cet email existe déjà',
        field: 'email',
      };
    }

    // Créer le client
    const client = await prisma.client.create({
      data: {
        name: validatedData.name,
        legalName: validatedData.legalName,
        taxId: validatedData.taxId,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        country: validatedData.country,
        website: validatedData.website,
      },
    });

    // Revalider la liste des clients
    revalidatePath('/dashboard/clients');

    return { success: true, data: { id: client.id } };
  } catch (error) {
    console.error('Error creating client:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour créer un client',
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
      error: 'Une erreur est survenue lors de la création du client',
    };
  }
}

/**
 * Paramètres pour la récupération des clients
 */
interface GetClientsParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Action : Obtenir la liste des clients
 *
 * Récupère tous les clients avec pagination optionnelle et recherche
 * Filtre selon les permissions de l'utilisateur
 *
 * @param params - Paramètres de pagination et recherche
 * @param params.page - Numéro de page (optionnel, défaut: 1)
 * @param params.limit - Nombre de résultats par page (optionnel, défaut: 10)
 * @param params.search - Terme de recherche optionnel
 * @returns Liste des clients
 */
export async function getClientsAction(params: GetClientsParams = {}) {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * La plupart des rôles peuvent lire les clients
     * Permission requise: 'clients:read' ou 'clients:read:own'
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Vérifier les permissions
    const canReadAll = hasPermission(userRole, 'clients:read');
    const canReadOwn = hasPermission(userRole, 'clients:read:own');

    if (!canReadAll && !canReadOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour consulter les clients',
      };
    }

    // Extraire les paramètres avec valeurs par défaut
    const { page = 1, limit = 10, search } = params;

    // Calculer le skip pour la pagination
    const skip = (page - 1) * limit;

    // Construire le filtre de recherche (nom, email, raison sociale, taxId)
    const whereClause: any = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { legalName: { contains: search, mode: 'insensitive' as const } },
            { taxId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Si l'utilisateur est CLIENT, il ne voit que son propre client
    if (canReadOwn && !canReadAll) {
      if (!session.user.clientId) {
        return {
          success: false,
          error: 'Votre compte n\'est pas associé à un client',
        };
      }
      whereClause.id = session.user.clientId;
    }

    // Récupérer les clients avec le filtre de recherche
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              shipments: true,
            },
          },
        },
      }),
      prisma.client.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Error getting clients:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour consulter les clients',
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
      error: 'Une erreur est survenue lors de la récupération des clients',
    };
  }
}

/**
 * Action : Obtenir un client par ID
 *
 * Récupère les détails complets d'un client
 *
 * @param id - ID du client
 * @returns Données du client ou erreur
 */
export async function getClientAction(id: string) {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'clients:read' ou 'clients:read:own'
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Vérifier les permissions
    const canReadAll = hasPermission(userRole, 'clients:read');
    const canReadOwn = hasPermission(userRole, 'clients:read:own');

    if (!canReadAll && !canReadOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour consulter ce client',
      };
    }

    // Récupérer le client avec statistiques
    let client = await prisma.client.findUnique({
      where: { id },
      include: {
        shipments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            shipments: true,
            users: true,
            quotes: true,
            documents: true,
          },
        },
      },
    });

    if (!client) {
      return {
        success: false,
        error: 'Client introuvable',
      };
    }

    // Si l'utilisateur est CLIENT, vérifier qu'il accède à son propre client
    if (canReadOwn && !canReadAll) {
      if (!session.user.clientId || session.user.clientId !== id) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour consulter ce client',
        };
      }
    }

    return { success: true, data: client };
  } catch (error) {
    console.error('Error getting client:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour consulter ce client',
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
      error: 'Une erreur est survenue lors de la récupération du client',
    };
  }
}

/**
 * Action : Mettre à jour un client
 *
 * Met à jour les informations d'un client existant
 *
 * @param id - ID du client à mettre à jour
 * @param formData - Nouvelles données du client
 * @returns Résultat de la mise à jour
 */
export async function updateClientAction(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN et OPERATIONS_MANAGER peuvent modifier des clients
     * Permission requise: 'clients:update'
     */
    await requirePermission('clients:update');

    // Vérifier que le client existe
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return { success: false, error: 'Client introuvable' };
    }

    // Extraire et valider les données
    const rawData = {
      name: formData.get('name'),
      legalName: formData.get('legalName') || null,
      taxId: formData.get('taxId') || null,
      email: formData.get('email'),
      phone: formData.get('phone') || null,
      address: formData.get('address'),
      city: formData.get('city'),
      postalCode: formData.get('postalCode'),
      country: formData.get('country'),
      website: formData.get('website') || null,
    };

    const validatedData = clientUpdateSchema.parse(rawData);

    // Vérifier si l'email est déjà utilisé par un autre client
    if (validatedData.email && validatedData.email !== existingClient.email) {
      const emailExists = await prisma.client.findFirst({
        where: {
          email: validatedData.email,
          id: { not: id },
        },
      });

      if (emailExists) {
        return {
          success: false,
          error: 'Un autre client utilise déjà cet email',
          field: 'email',
        };
      }
    }

    // Mettre à jour le client
    await prisma.client.update({
      where: { id },
      data: validatedData,
    });

    // Revalider les pages
    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error('Error updating client:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour modifier ce client',
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
      error: 'Une erreur est survenue lors de la mise à jour du client',
    };
  }
}

/**
 * Action : Supprimer un client
 *
 * Supprime un client de la base de données
 * ATTENTION : Cette action est irréversible
 *
 * @param id - ID du client à supprimer
 * @returns Résultat de la suppression
 */
export async function deleteClientAction(
  id: string
): Promise<ActionResult> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN peuvent supprimer des clients
     * Permission requise: 'clients:delete'
     *
     * IMPORTANT: Cette action est irréversible et réservée aux administrateurs
     * car elle peut avoir un impact majeur sur les données
     */
    await requirePermission('clients:delete');

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            shipments: true,
            quotes: true,
          },
        },
      },
    });

    if (!client) {
      return { success: false, error: 'Client introuvable' };
    }

    // Empêcher la suppression si le client a des expéditions ou des devis
    if (client._count.shipments > 0 || client._count.quotes > 0) {
      return {
        success: false,
        error:
          'Impossible de supprimer ce client car il a des expéditions ou des devis associés',
      };
    }

    // Supprimer le client
    await prisma.client.delete({
      where: { id },
    });

    // Revalider la liste des clients
    revalidatePath('/dashboard/clients');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting client:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Seuls les administrateurs peuvent supprimer des clients',
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
      error: 'Une erreur est survenue lors de la suppression du client',
    };
  }
}
