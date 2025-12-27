/**
 * Server Actions pour la gestion des demandes d'enlèvement
 *
 * Ces actions gèrent le workflow complet d'enlèvement :
 * - Création de demandes
 * - Planification et assignation
 * - Suivi et mise à jour du statut
 * - Recherche et filtrage
 *
 * @module modules/pickups/actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/config';
import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client';
import {
  pickupRequestSchema,
  pickupRequestUpdateSchema,
  pickupStatusUpdateSchema,
  pickupSearchSchema,
  assignTransporterSchema,
  type PickupRequestFormData,
  type PickupRequestUpdateData,
  type PickupStatusUpdate,
  type PickupSearchParams,
  type AssignTransporterData,
} from '../schemas/pickup.schema';
import { PickupStatus } from '@/generated/prisma';

/**
 * Créer une nouvelle demande d'enlèvement
 *
 * @param data - Données de la demande (validation via pickupRequestSchema)
 * @returns Demande créée ou erreur
 *
 * @example
 * ```typescript
 * const result = await createPickupRequestAction({
 *   shipmentId: 'clxxx',
 *   pickupAddress: '123 Rue de la Paix',
 *   pickupCity: 'Paris',
 *   pickupPostalCode: '75001',
 *   pickupCountry: 'FR',
 *   requestedDate: '2025-01-15T09:00:00Z',
 *   timeSlot: 'MORNING',
 *   companyId: 'clxxx',
 * });
 * ```
 */
export async function createPickupRequestAction(data: unknown) {
  try {
    const session = await requireAuth();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les données
    const validated = pickupRequestSchema.parse(data);

    // Vérifier que l'expédition existe et est accessible
    const shipment = await db.shipment.findUnique({
      where: { id: validated.shipmentId },
      select: { id: true, companyId: true, trackingNumber: true },
    });

    if (!shipment) {
      return {
        success: false,
        error: 'Expédition introuvable',
      };
    }

    // Créer la demande d'enlèvement
    const pickupRequest = await db.pickupRequest.create({
      data: {
        ...validated,
        requestedDate: new Date(validated.requestedDate),
        companyId: shipment.companyId,
        createdById: session.user.id,
        status: PickupStatus.REQUESTED,
      },
      include: {
        shipment: {
          select: {
            trackingNumber: true,
            originAddress: true,
            originCity: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    revalidatePath('/dashboard/pickups');
    revalidatePath(`/dashboard/shipments/${validated.shipmentId}`);

    return {
      success: true,
      data: pickupRequest,
    };
  } catch (error: any) {
    console.error('Erreur createPickupRequestAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la création de la demande d\'enlèvement',
    };
  }
}

/**
 * Mettre à jour une demande d'enlèvement
 *
 * @param id - ID de la demande
 * @param data - Données à mettre à jour
 * @returns Demande mise à jour ou erreur
 */
export async function updatePickupRequestAction(id: string, data: unknown) {
  try {
    const session = await requireAuth();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les données
    const validated = pickupRequestUpdateSchema.parse(data);

    // Vérifier que la demande existe et est modifiable
    const existingPickup = await db.pickupRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existingPickup) {
      return {
        success: false,
        error: 'Demande d\'enlèvement introuvable',
      };
    }

    // Empêcher la modification des demandes COMPLETED ou CANCELED
    if (existingPickup.status === PickupStatus.COMPLETED || existingPickup.status === PickupStatus.CANCELED) {
      return {
        success: false,
        error: 'Impossible de modifier une demande terminée ou annulée',
      };
    }

    // Préparer les données de mise à jour
    const updateData: any = { ...validated };

    // Convertir les dates
    if (validated.requestedDate) {
      updateData.requestedDate = new Date(validated.requestedDate);
    }
    if (validated.scheduledDate) {
      updateData.scheduledDate = new Date(validated.scheduledDate);
    }
    if (validated.actualPickupDate) {
      updateData.actualPickupDate = new Date(validated.actualPickupDate);
    }

    // Mettre à jour
    const pickupRequest = await db.pickupRequest.update({
      where: { id },
      data: updateData,
      include: {
        shipment: {
          select: {
            trackingNumber: true,
          },
        },
        transporter: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    revalidatePath('/dashboard/pickups');
    revalidatePath(`/dashboard/pickups/${id}`);

    return {
      success: true,
      data: pickupRequest,
    };
  } catch (error: any) {
    console.error('Erreur updatePickupRequestAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la mise à jour de la demande',
    };
  }
}

/**
 * Mettre à jour le statut d'une demande d'enlèvement
 * Gère les transitions de workflow : REQUESTED → SCHEDULED → IN_PROGRESS → COMPLETED
 *
 * @param id - ID de la demande
 * @param data - Nouveau statut et données associées
 * @returns Demande mise à jour ou erreur
 */
export async function updatePickupStatusAction(id: string, data: unknown) {
  try {
    const session = await requireAuth();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les données
    const validated = pickupStatusUpdateSchema.parse(data);

    // Vérifier que la demande existe
    const existingPickup = await db.pickupRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        shipmentId: true,
      },
    });

    if (!existingPickup) {
      return {
        success: false,
        error: 'Demande d\'enlèvement introuvable',
      };
    }

    // Valider les transitions de statut
    const validTransitions: Record<PickupStatus, PickupStatus[]> = {
      REQUESTED: [PickupStatus.SCHEDULED, PickupStatus.CANCELED],
      SCHEDULED: [PickupStatus.IN_PROGRESS, PickupStatus.CANCELED],
      IN_PROGRESS: [PickupStatus.COMPLETED, PickupStatus.CANCELED],
      COMPLETED: [], // Statut final, pas de transition
      CANCELED: [], // Statut final, pas de transition
    };

    const allowedTransitions = validTransitions[existingPickup.status];
    if (!allowedTransitions.includes(validated.status)) {
      return {
        success: false,
        error: `Transition de statut invalide : ${existingPickup.status} → ${validated.status}`,
      };
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      status: validated.status,
    };

    // Ajouter les champs spécifiques selon le statut
    if (validated.status === PickupStatus.SCHEDULED && validated.scheduledDate) {
      updateData.scheduledDate = new Date(validated.scheduledDate);
    }

    if (validated.status === PickupStatus.COMPLETED) {
      updateData.actualPickupDate = validated.actualPickupDate
        ? new Date(validated.actualPickupDate)
        : new Date();
      updateData.completionNotes = validated.notes || null;
      updateData.confirmationSent = false; // Marquer pour envoi de confirmation
    }

    if (validated.status === PickupStatus.CANCELED) {
      updateData.completionNotes = validated.notes || 'Enlèvement annulé';
    }

    // Mettre à jour la demande
    const pickupRequest = await db.pickupRequest.update({
      where: { id },
      data: updateData,
      include: {
        shipment: true,
        transporter: true,
      },
    });

    // Si COMPLETED, mettre à jour aussi l'expédition
    if (validated.status === PickupStatus.COMPLETED) {
      await db.shipment.update({
        where: { id: existingPickup.shipmentId },
        data: {
          actualPickupDate: updateData.actualPickupDate,
          status: 'PICKED_UP',
        },
      });
    }

    revalidatePath('/dashboard/pickups');
    revalidatePath(`/dashboard/pickups/${id}`);
    revalidatePath(`/dashboard/shipments/${existingPickup.shipmentId}`);

    return {
      success: true,
      data: pickupRequest,
    };
  } catch (error: any) {
    console.error('Erreur updatePickupStatusAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la mise à jour du statut',
    };
  }
}

/**
 * Lister les demandes d'enlèvement avec filtres
 *
 * @param params - Paramètres de recherche et filtrage
 * @returns Liste paginée de demandes
 *
 * @example
 * ```typescript
 * const result = await listPickupRequestsAction({
 *   status: 'SCHEDULED',
 *   startDate: '2025-01-01',
 *   endDate: '2025-01-31',
 *   page: 1,
 *   limit: 20,
 * });
 * ```
 */
export async function listPickupRequestsAction(params?: unknown) {
  try {
    const session = await requireAuth();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les paramètres
    const validated = params ? pickupSearchSchema.parse(params) : pickupSearchSchema.parse({});

    // Construire les filtres
    const where: any = {};

    if (validated.query) {
      where.OR = [
        { pickupAddress: { contains: validated.query, mode: 'insensitive' } },
        { pickupCity: { contains: validated.query, mode: 'insensitive' } },
        { pickupContact: { contains: validated.query, mode: 'insensitive' } },
        { shipment: { trackingNumber: { contains: validated.query, mode: 'insensitive' } } },
      ];
    }

    if (validated.status) {
      where.status = validated.status;
    }

    if (validated.companyId) {
      where.companyId = validated.companyId;
    }

    if (validated.transporterId) {
      where.transporterId = validated.transporterId;
    }

    if (validated.timeSlot) {
      where.timeSlot = validated.timeSlot;
    }

    if (validated.pickupCountry) {
      where.pickupCountry = validated.pickupCountry;
    }

    if (validated.startDate || validated.endDate) {
      where.requestedDate = {};
      if (validated.startDate) {
        where.requestedDate.gte = new Date(validated.startDate);
      }
      if (validated.endDate) {
        where.requestedDate.lte = new Date(validated.endDate);
      }
    }

    // Pagination
    const skip = (validated.page - 1) * validated.limit;

    // Récupérer les demandes
    const [pickupRequests, total] = await Promise.all([
      db.pickupRequest.findMany({
        where,
        skip,
        take: validated.limit,
        orderBy: {
          [validated.sortBy]: validated.sortOrder,
        },
        include: {
          shipment: {
            select: {
              trackingNumber: true,
              description: true,
              weight: true,
              packageCount: true,
            },
          },
          company: {
            select: {
              name: true,
            },
          },
          transporter: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
      }),
      db.pickupRequest.count({ where }),
    ]);

    return {
      success: true,
      data: pickupRequests,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit),
      },
    };
  } catch (error: any) {
    console.error('Erreur listPickupRequestsAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération des demandes',
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Récupérer une demande d'enlèvement par ID
 *
 * @param id - ID de la demande
 * @returns Demande trouvée ou erreur
 */
export async function getPickupRequestByIdAction(id: string) {
  try {
    const session = await requireAuth();
    const db = getEnhancedPrismaFromSession(session);

    const pickupRequest = await db.pickupRequest.findUnique({
      where: { id },
      include: {
        shipment: true,
        company: true,
        transporter: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        documents: true,
      },
    });

    if (!pickupRequest) {
      return {
        success: false,
        error: 'Demande d\'enlèvement introuvable',
      };
    }

    return {
      success: true,
      data: pickupRequest,
    };
  } catch (error: any) {
    console.error('Erreur getPickupRequestByIdAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération de la demande',
    };
  }
}

/**
 * Assigner un transporteur à une demande d'enlèvement
 * Change automatiquement le statut à SCHEDULED
 *
 * @param id - ID de la demande
 * @param data - Données du transporteur et de planification
 * @returns Demande mise à jour ou erreur
 */
export async function assignTransporterAction(id: string, data: unknown) {
  try {
    const session = await requireAuth();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les données
    const validated = assignTransporterSchema.parse(data);

    // Vérifier que la demande existe
    const existingPickup = await db.pickupRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existingPickup) {
      return {
        success: false,
        error: 'Demande d\'enlèvement introuvable',
      };
    }

    // Vérifier le statut (ne peut assigner que si REQUESTED ou SCHEDULED)
    if (![PickupStatus.REQUESTED, PickupStatus.SCHEDULED].includes(existingPickup.status)) {
      return {
        success: false,
        error: 'Impossible d\'assigner un transporteur à cette étape',
      };
    }

    // Vérifier que le transporteur existe
    const transporter = await db.transporter.findUnique({
      where: { id: validated.transporterId },
      select: { id: true, name: true },
    });

    if (!transporter) {
      return {
        success: false,
        error: 'Transporteur introuvable',
      };
    }

    // Assigner et planifier
    const pickupRequest = await db.pickupRequest.update({
      where: { id },
      data: {
        transporterId: validated.transporterId,
        driverName: validated.driverName,
        driverPhone: validated.driverPhone,
        vehiclePlate: validated.vehiclePlate,
        scheduledDate: validated.scheduledDate ? new Date(validated.scheduledDate) : null,
        status: PickupStatus.SCHEDULED,
      },
      include: {
        shipment: true,
        transporter: true,
      },
    });

    revalidatePath('/dashboard/pickups');
    revalidatePath(`/dashboard/pickups/${id}`);

    return {
      success: true,
      data: pickupRequest,
    };
  } catch (error: any) {
    console.error('Erreur assignTransporterAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'assignation du transporteur',
    };
  }
}

/**
 * Annuler une demande d'enlèvement
 *
 * @param id - ID de la demande
 * @param reason - Raison de l'annulation
 * @returns Demande annulée ou erreur
 */
export async function cancelPickupRequestAction(id: string, reason?: string) {
  try {
    const session = await requireAuth();
    const db = getEnhancedPrismaFromSession(session);

    // Vérifier que la demande existe
    const existingPickup = await db.pickupRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existingPickup) {
      return {
        success: false,
        error: 'Demande d\'enlèvement introuvable',
      };
    }

    // Vérifier qu'on peut annuler (pas si déjà COMPLETED)
    if (existingPickup.status === PickupStatus.COMPLETED) {
      return {
        success: false,
        error: 'Impossible d\'annuler un enlèvement déjà effectué',
      };
    }

    if (existingPickup.status === PickupStatus.CANCELED) {
      return {
        success: false,
        error: 'Cette demande est déjà annulée',
      };
    }

    // Annuler
    const pickupRequest = await db.pickupRequest.update({
      where: { id },
      data: {
        status: PickupStatus.CANCELED,
        completionNotes: reason || 'Enlèvement annulé',
      },
      include: {
        shipment: true,
      },
    });

    revalidatePath('/dashboard/pickups');
    revalidatePath(`/dashboard/pickups/${id}`);

    return {
      success: true,
      data: pickupRequest,
    };
  } catch (error: any) {
    console.error('Erreur cancelPickupRequestAction:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'annulation de la demande',
    };
  }
}
