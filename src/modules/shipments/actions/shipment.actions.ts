/**
 * Server Actions : Expéditions (Shipments)
 *
 * Actions serveur pour la gestion CRUD des expéditions
 * Toutes les actions sont sécurisées avec vérification d'authentification et permissions RBAC
 *
 * @module modules/shipments/actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/config';
import { requirePermission, hasPermission } from '@/lib/auth/permissions';
import { UserRole } from '@/lib/db/enums';
import {
  shipmentSchema,
  shipmentUpdateSchema,
  shipmentStatusUpdateSchema,
  type ShipmentFormData,
  type ShipmentUpdateData,
  type ShipmentStatusUpdate,
} from '../schemas/shipment.schema';

/**
 * Type pour les résultats d'actions avec erreur ou succès
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

/**
 * Générer un numéro de tracking unique
 *
 * Format: {PAYS_DEST}-{CODE3}-{JJAA}-{SEQUENCE5}
 * Exemple: BF-XK7-1425-00042
 *
 * Composants :
 * - PAYS_DEST : Code pays destination ISO 3166-1 alpha-2 (ex: BF, FR, US)
 * - CODE3 : Code aléatoire de 3 caractères alphanumériques pour unicité
 * - JJAA : Jour (2 chiffres) + Année (2 derniers chiffres)
 * - SEQUENCE5 : Numéro séquentiel sur 5 chiffres (compteur journalier)
 *
 * @param destinationCountry - Code pays de destination (ex: "BF", "FR")
 * @returns Numéro de tracking unique
 */
async function generateTrackingNumber(destinationCountry: string): Promise<string> {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2); // 2 derniers chiffres
  const dateCode = `${day}${year}`; // Format: JJAA (ex: "1425" pour 14 janvier 2025)

  // Générer un code aléatoire de 3 caractères pour garantir l'unicité
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans I, O, 0, 1 pour éviter confusion
  let randomCode = '';
  for (let i = 0; i < 3; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Compter le nombre d'expéditions créées aujourd'hui pour ce pays
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.shipment.count({
    where: {
      destinationCountry: destinationCountry.toUpperCase(),
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Formater le numéro séquentiel sur 5 chiffres
  const sequence = String(count + 1).padStart(5, '0');

  // Construire le numéro de tracking final
  // Format: PAYS-CODE-JJAA-SEQUENCE (ex: BF-XK7-1425-00001)
  const countryCode = destinationCountry.toUpperCase().slice(0, 2);
  const trackingNumber = `${countryCode}-${randomCode}-${dateCode}-${sequence}`;

  // Vérifier que le numéro n'existe pas déjà (très rare grâce au code aléatoire)
  const existing = await prisma.shipment.findUnique({
    where: { trackingNumber },
  });

  // Si le numéro existe déjà, régénérer avec un nouveau code aléatoire
  if (existing) {
    return generateTrackingNumber(destinationCountry);
  }

  return trackingNumber;
}

/**
 * Action : Créer une nouvelle expédition
 *
 * Crée une nouvelle expédition dans la base de données
 * après validation des données et vérification des permissions
 *
 * @param formData - Données du formulaire de création
 * @returns Résultat avec ID et numéro de tracking de l'expédition créée ou erreur
 *
 * @permissions 'shipments:create' - ADMIN, OPERATIONS_MANAGER
 */
export async function createShipmentAction(
  formData: FormData
): Promise<ActionResult<{ id: string; trackingNumber: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN et OPERATIONS_MANAGER peuvent créer des expéditions
     * Permission requise: 'shipments:create'
     */
    const session = await requirePermission('shipments:create');

    // Extraire et valider les données
    const rawData = {
      clientId: formData.get('clientId'),
      originAddress: formData.get('originAddress'),
      originCity: formData.get('originCity'),
      originPostalCode: formData.get('originPostalCode'),
      originCountry: formData.get('originCountry'),
      originContact: formData.get('originContact') || null,
      originPhone: formData.get('originPhone') || null,
      destinationAddress: formData.get('destinationAddress'),
      destinationCity: formData.get('destinationCity'),
      destinationPostalCode: formData.get('destinationPostalCode'),
      destinationCountry: formData.get('destinationCountry'),
      destinationContact: formData.get('destinationContact') || null,
      destinationPhone: formData.get('destinationPhone') || null,
      cargoType: formData.get('cargoType'),
      weight: Number(formData.get('weight')),
      volume: formData.get('volume') ? Number(formData.get('volume')) : null,
      packageCount: Number(formData.get('packageCount')),
      value: formData.get('value') ? Number(formData.get('value')) : null,
      currency: formData.get('currency') || 'EUR',
      description: formData.get('description'),
      specialInstructions: formData.get('specialInstructions') || null,
      isDangerous: formData.get('isDangerous') === 'true',
      isFragile: formData.get('isFragile') === 'true',
      transportMode: formData.getAll('transportMode'),
      priority: formData.get('priority') || 'STANDARD',
      requestedPickupDate: formData.get('requestedPickupDate') || null,
      estimatedDeliveryDate: formData.get('estimatedDeliveryDate') || null,
      estimatedCost: formData.get('estimatedCost')
        ? Number(formData.get('estimatedCost'))
        : null,
    };

    const validatedData = shipmentSchema.parse(rawData);

    // Vérifier que la compagnie existe
    const company = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
    });

    if (!company) {
      return {
        success: false,
        error: 'Compagnie introuvable',
        field: 'clientId',
      };
    }

    // Générer un numéro de tracking unique avec le pays de destination
    const trackingNumber = await generateTrackingNumber(validatedData.destinationCountry);

    // Créer l'expédition
    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber,
        clientId: validatedData.clientId,
        originAddress: validatedData.originAddress,
        originCity: validatedData.originCity,
        originPostalCode: validatedData.originPostalCode,
        originCountry: validatedData.originCountry,
        originContact: validatedData.originContact,
        originPhone: validatedData.originPhone,
        destinationAddress: validatedData.destinationAddress,
        destinationCity: validatedData.destinationCity,
        destinationPostalCode: validatedData.destinationPostalCode,
        destinationCountry: validatedData.destinationCountry,
        destinationContact: validatedData.destinationContact,
        destinationPhone: validatedData.destinationPhone,
        cargoType: validatedData.cargoType,
        weight: validatedData.weight,
        volume: validatedData.volume,
        packageCount: validatedData.packageCount,
        value: validatedData.value,
        currency: validatedData.currency,
        description: validatedData.description,
        specialInstructions: validatedData.specialInstructions,
        isDangerous: validatedData.isDangerous,
        isFragile: validatedData.isFragile,
        transportMode: validatedData.transportMode,
        priority: validatedData.priority,
        requestedPickupDate: validatedData.requestedPickupDate
          ? new Date(validatedData.requestedPickupDate)
          : null,
        estimatedDeliveryDate: validatedData.estimatedDeliveryDate
          ? new Date(validatedData.estimatedDeliveryDate)
          : null,
        estimatedCost: validatedData.estimatedCost,
        status: 'DRAFT',
        createdById: session.user.id,
      },
    });

    // Revalider la liste des expéditions
    revalidatePath('/dashboard/shipments');

    return {
      success: true,
      data: { id: shipment.id, trackingNumber: shipment.trackingNumber },
    };
  } catch (error) {
    console.error('Error creating shipment:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour créer une expédition',
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
      error: 'Une erreur est survenue lors de la création de l\'expédition',
    };
  }
}

/**
 * Utilitaire : Retry automatique pour les erreurs de connexion Prisma
 * Gère les erreurs temporaires de connexion à la base de données (Neon sleep mode)
 *
 * @param fn - Fonction à exécuter avec retry
 * @param maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @param delayMs - Délai entre les tentatives en ms (défaut: 1000)
 * @returns Résultat de la fonction
 */
async function retryOnConnectionError<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Vérifier si c'est une erreur de connexion Prisma temporaire
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes("Can't reach database server") ||
          error.message.includes('PrismaClientInitializationError'));

      // Si ce n'est pas une erreur de connexion OU si on a atteint le max de retries, throw
      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }

      // Log de la tentative de retry
      console.log(
        `[Retry ${attempt}/${maxRetries}] Erreur de connexion détectée, nouvelle tentative dans ${delayMs}ms...`
      );

      // Attendre avant de réessayer (avec backoff exponentiel)
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}

/**
 * Action : Obtenir la liste des expéditions
 *
 * Récupère toutes les expéditions avec pagination optionnelle
 * Filtre selon les permissions de l'utilisateur (les CLIENTS ne voient que leurs expéditions)
 *
 * Inclut un système de retry automatique pour gérer les erreurs de connexion temporaires
 * (Neon serverless sleep mode)
 *
 * @param page - Numéro de page (optionnel, défaut: 1)
 * @param limit - Nombre de résultats par page (optionnel, défaut: 10)
 * @param clientId - Filtrer par compagnie (optionnel)
 * @param status - Filtrer par statut (optionnel)
 * @param search - Terme de recherche (tracking number, origine, destination) (optionnel)
 * @returns Liste des expéditions
 *
 * @permissions 'shipments:read' ou 'shipments:read:own' - Tous les rôles
 */
export async function getShipmentsAction(
  page = 1,
  limit = 10,
  clientId?: string,
  status?: string,
  search?: string
) {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'shipments:read' ou 'shipments:read:own'
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    console.log(`[getShipmentsAction] User: ${session.user.email}, Role: ${userRole}`);

    // Vérifier les permissions
    const canReadAll = hasPermission(userRole, 'shipments:read');
    const canReadOwn = hasPermission(userRole, 'shipments:read:own');

    console.log(`[getShipmentsAction] canReadAll: ${canReadAll}, canReadOwn: ${canReadOwn}`);

    if (!canReadAll && !canReadOwn) {
      console.error(`[getShipmentsAction] Permission refusée pour le rôle: ${userRole}`);
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour consulter les expéditions',
      };
    }

    // Calculer le skip pour la pagination
    const skip = (page - 1) * limit;

    // Construire les filtres
    const where: any = {};

    // Si l'utilisateur est CLIENT, il ne voit que ses propres expéditions
    if (canReadOwn && !canReadAll) {
      if (!session.user.clientId) {
        return {
          success: false,
          error: 'Votre compte n\'est pas associé à une compagnie',
        };
      }
      where.clientId = session.user.clientId;
    } else if (clientId) {
      // Sinon, filtrer par clientId si fourni
      where.clientId = clientId;
    }

    // Filtrer par statut si fourni
    if (status) {
      where.status = status;
    }

    // Recherche textuelle si fournie
    if (search && search.trim()) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { originCity: { contains: search, mode: 'insensitive' } },
        { originCountry: { contains: search, mode: 'insensitive' } },
        { destinationCity: { contains: search, mode: 'insensitive' } },
        { destinationCountry: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    /**
     * Récupérer les expéditions avec retry automatique
     * Gère les erreurs de connexion temporaires (Neon serverless sleep mode)
     */
    const [shipments, total] = await retryOnConnectionError(() =>
      Promise.all([
        prisma.shipment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                trackingEvents: true,
              },
            },
          },
        }),
        prisma.shipment.count({ where }),
      ])
    );

    return {
      success: true,
      data: {
        shipments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Error getting shipments:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour consulter les expéditions',
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
      error: 'Une erreur est survenue lors de la récupération des expéditions',
    };
  }
}

/**
 * Action : Obtenir une expédition par ID
 *
 * Récupère les détails complets d'une expédition
 * Les CLIENTS ne peuvent voir que leurs propres expéditions
 *
 * @param id - ID de l'expédition
 * @returns Données de l'expédition ou erreur
 *
 * @permissions 'shipments:read' ou 'shipments:read:own'
 */
export async function getShipmentAction(id: string) {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'shipments:read' ou 'shipments:read:own'
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Vérifier les permissions
    const canReadAll = hasPermission(userRole, 'shipments:read');
    const canReadOwn = hasPermission(userRole, 'shipments:read:own');

    if (!canReadAll && !canReadOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour consulter cette expédition',
      };
    }

    // Récupérer l'expédition avec toutes les relations
    // Le client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier)
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        client: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invoice: true,
        trackingEvents: {
          orderBy: { timestamp: 'desc' },
          include: {
            // Inclure les informations de l'agent qui a effectué l'action
            performedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      return {
        success: false,
        error: 'Expédition introuvable',
      };
    }

    // Si l'utilisateur est CLIENT, vérifier qu'il peut accéder à cette expédition
    if (canReadOwn && !canReadAll) {
      if (session.user.clientId !== shipment.clientId) {
        return {
          success: false,
          error: 'Vous n\'avez pas accès à cette expédition',
        };
      }
    }

    return { success: true, data: shipment };
  } catch (error) {
    console.error('Error getting shipment:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour consulter cette expédition',
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
      error: 'Une erreur est survenue lors de la récupération de l\'expédition',
    };
  }
}

/**
 * Action : Mettre à jour une expédition
 *
 * Met à jour les informations d'une expédition existante
 *
 * @param id - ID de l'expédition à mettre à jour
 * @param formData - Nouvelles données de l'expédition
 * @returns Résultat de la mise à jour
 *
 * @permissions 'shipments:update' - ADMIN, OPERATIONS_MANAGER
 */
export async function updateShipmentAction(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN et OPERATIONS_MANAGER peuvent modifier des expéditions
     * Permission requise: 'shipments:update'
     */
    await requirePermission('shipments:update');

    // Vérifier que l'expédition existe
    const existingShipment = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!existingShipment) {
      return { success: false, error: 'Expédition introuvable' };
    }

    // Extraire et valider les données (similaire à createShipmentAction)
    const rawData: any = {};

    // Parcourir tous les champs possibles
    const fields = [
      'clientId',
      'originAddress',
      'originCity',
      'originPostalCode',
      'originCountry',
      'originContact',
      'originPhone',
      'destinationAddress',
      'destinationCity',
      'destinationPostalCode',
      'destinationCountry',
      'destinationContact',
      'destinationPhone',
      'cargoType',
      'description',
      'specialInstructions',
      'currency',
      'priority',
      'status',
      'requestedPickupDate',
      'estimatedDeliveryDate',
      'actualPickupDate',
      'actualDeliveryDate',
      'invoiceId',
    ];

    fields.forEach((field) => {
      const value = formData.get(field);
      if (value !== null) {
        rawData[field] = value || null;
      }
    });

    // Champs numériques
    ['weight', 'volume', 'packageCount', 'value', 'estimatedCost', 'actualCost'].forEach(
      (field) => {
        const value = formData.get(field);
        if (value !== null && value !== '') {
          rawData[field] = Number(value);
        }
      }
    );

    // Champs booléens
    ['isDangerous', 'isFragile'].forEach((field) => {
      const value = formData.get(field);
      if (value !== null) {
        rawData[field] = value === 'true';
      }
    });

    // Champs array
    const transportMode = formData.getAll('transportMode');
    if (transportMode.length > 0) {
      rawData.transportMode = transportMode;
    }

    const validatedData = shipmentUpdateSchema.parse(rawData);

    // Mettre à jour l'expédition
    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: {
        ...validatedData,
        requestedPickupDate: validatedData.requestedPickupDate
          ? new Date(validatedData.requestedPickupDate)
          : undefined,
        estimatedDeliveryDate: validatedData.estimatedDeliveryDate
          ? new Date(validatedData.estimatedDeliveryDate)
          : undefined,
        actualPickupDate: validatedData.actualPickupDate
          ? new Date(validatedData.actualPickupDate)
          : undefined,
        actualDeliveryDate: validatedData.actualDeliveryDate
          ? new Date(validatedData.actualDeliveryDate)
          : undefined,
      },
    });

    // Revalider les pages
    revalidatePath('/dashboard/shipments');
    revalidatePath(`/dashboard/shipments/${id}`);

    return { success: true, data: { id: updatedShipment.id } };
  } catch (error) {
    console.error('Error updating shipment:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour modifier cette expédition',
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
      error: 'Une erreur est survenue lors de la mise à jour de l\'expédition',
    };
  }
}

/**
 * Action : Supprimer une expédition
 *
 * Supprime une expédition de la base de données
 * Seules les expéditions en statut DRAFT peuvent être supprimées
 *
 * @param id - ID de l'expédition à supprimer
 * @returns Résultat de la suppression
 *
 * @permissions 'shipments:delete' - ADMIN, OPERATIONS_MANAGER
 */
export async function deleteShipmentAction(id: string): Promise<ActionResult> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN et OPERATIONS_MANAGER peuvent supprimer des expéditions
     * Permission requise: 'shipments:delete'
     */
    await requirePermission('shipments:delete');

    // Vérifier que l'expédition existe
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        invoice: true,
        _count: {
          select: {
            trackingEvents: true,
          },
        },
      },
    });

    if (!shipment) {
      return { success: false, error: 'Expédition introuvable' };
    }

    // Empêcher la suppression si l'expédition n'est pas en DRAFT
    if (shipment.status !== 'DRAFT') {
      return {
        success: false,
        error: 'Seules les expéditions en brouillon peuvent être supprimées',
      };
    }

    // Empêcher la suppression si une facture est associée
    if (shipment.invoice) {
      return {
        success: false,
        error: 'Impossible de supprimer une expédition associée à une facture',
      };
    }

    // Supprimer l'expédition (les trackingEvents seront supprimés en cascade)
    await prisma.shipment.delete({
      where: { id },
    });

    // Revalider la liste des expéditions
    revalidatePath('/dashboard/shipments');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting shipment:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour supprimer cette expédition',
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
      error: 'Une erreur est survenue lors de la suppression de l\'expédition',
    };
  }
}

/**
 * Action : Mettre à jour le statut d'une expédition
 *
 * Change le statut d'une expédition et crée un événement de tracking associé
 * Utilisé pour les transitions d'état importantes (approuver, collecter, livrer, etc.)
 *
 * L'action enregistre automatiquement l'agent qui effectue le changement de statut
 * dans le TrackingEvent (champ performedById).
 *
 * @param id - ID de l'expédition
 * @param statusData - Nouveau statut et notes optionnelles
 * @returns Résultat de la mise à jour avec l'ID de l'expédition
 *
 * @permissions 'shipments:update' - ADMIN, OPERATIONS_MANAGER
 */
export async function updateShipmentStatusAction(
  id: string,
  statusData: ShipmentStatusUpdate
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification et récupérer les infos de l'agent
     * La session contient l'ID, le nom et le rôle de l'utilisateur
     */
    const session = await requireAuth();
    const agentId = session.user.id;
    const agentRole = session.user.role as UserRole;

    // Vérifier les permissions (ADMIN ou OPERATIONS_MANAGER uniquement)
    const canUpdateShipments = agentRole === 'ADMIN' || agentRole === 'OPERATIONS_MANAGER';
    if (!canUpdateShipments) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour modifier le statut',
      };
    }

    // Vérifier que l'expédition existe
    const shipment = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      return { success: false, error: 'Expédition introuvable' };
    }

    // Valider les données
    const validatedData = shipmentStatusUpdateSchema.parse(statusData);

    // Mettre à jour le statut et créer un événement de tracking
    await prisma.$transaction(async (tx) => {
      // Mettre à jour le statut de l'expédition
      await tx.shipment.update({
        where: { id },
        data: { status: validatedData.status },
      });

      // Créer un événement de tracking avec l'ID de l'agent
      await tx.trackingEvent.create({
        data: {
          shipmentId: id,
          status: validatedData.status,
          location: 'Mise à jour manuelle',
          description: validatedData.notes || `Statut changé en ${validatedData.status}`,
          performedById: agentId, // Enregistrer l'agent qui a effectué l'action
        },
      });
    });

    // Revalider les pages pour mettre à jour l'affichage
    revalidatePath('/dashboard/shipments');
    revalidatePath(`/dashboard/shipments/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error('Error updating shipment status:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour modifier le statut',
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
      error: 'Une erreur est survenue lors de la mise à jour du statut',
    };
  }
}
