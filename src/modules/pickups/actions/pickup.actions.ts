/**
 * Server Actions pour la gestion des demandes d'enlèvement
 *
 * Architecture :
 * - IMPORTANT : Utilise le client Prisma STANDARD (pas Zenstack) car l'enhanced client bloque l'accès
 * - Les permissions sont vérifiées MANUELLEMENT via session.user.role
 * - Tous les changements sont loggés dans PickupLog pour traçabilité
 *
 * User Stories couvertes :
 * - US-1.1 : Création sans compte (createGuestPickup)
 * - US-1.2 : Suivi par token (trackPickupByToken)
 * - US-1.3 : Rattachement automatique (attachPickupToAccount)
 * - US-1.4 : Création avec compte (createPickup)
 * - US-3.1 : Liste des demandes (listPickups)
 * - US-3.2 : Changement de statut (updatePickupStatus)
 * - US-3.3 : Annulation avec raison (cancelPickup)
 */

'use server';

import { revalidatePath } from 'next/cache';
import { getSession, requireAuth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { PickupStatus, UserRole } from '@/lib/db/enums';
import {
  createGuestPickupSchema,
  createPickupSchema,
  trackPickupByTokenSchema,
  updatePickupStatusSchema,
  cancelPickupSchema,
  assignDriverSchema,
  schedulePickupSchema,
  type CreateGuestPickupInput,
  type CreatePickupInput,
  type TrackPickupByTokenInput,
  type UpdatePickupStatusInput,
  type CancelPickupInput,
  type AssignDriverInput,
  type SchedulePickupInput,
} from '../schemas/pickup.schema';
import {
  logPickupCreated,
  logStatusChanged,
  logAttachedToAccount,
  logDriverAssigned,
  logDriverChanged,
  logScheduled,
  logRescheduled,
} from '../lib/pickup-log-helper';

// ============================================
// UTILITAIRES
// ============================================

/**
 * Génère un numéro de tracking unique
 * Format: PK-YYYYMMDD-XXXXX
 *
 * @returns Numéro de tracking unique
 *
 * @example
 * PK-20260111-A1B2C
 */
function generateTrackingNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `PK-${year}${month}${day}-${random}`;
}

/**
 * Génère un token de tracking unique (cuid-like)
 * Utilise crypto.randomUUID() pour garantir l'unicité
 *
 * @returns Token unique pour le suivi public
 *
 * @example
 * "clx123abc456def"
 */
function generateTrackingToken(): string {
  // Utiliser crypto.randomUUID() et le formater comme un cuid
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Calcule la date d'expiration du token (72h)
 *
 * @returns Date d'expiration (72h à partir de maintenant)
 */
function getTokenExpirationDate(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 72); // 72h
  return expiresAt;
}

// ============================================
// US-1.1 : CRÉATION SANS COMPTE
// ============================================

/**
 * Crée une demande d'enlèvement SANS compte utilisateur
 *
 * User Story US-1.1 :
 * En tant qu'utilisateur non connecté, je veux créer une demande
 * d'enlèvement complète sans créer de compte
 *
 * Workflow :
 * 1. Validation des données avec Zod
 * 2. Génération trackingNumber et trackingToken
 * 3. Création dans la DB avec userId = null
 * 4. Création d'un log CREATED
 * 5. Retour du trackingToken et trackingNumber pour suivi
 *
 * @param data - Données de la demande
 * @returns Demande créée avec token de suivi
 */
export async function createGuestPickup(data: CreateGuestPickupInput) {
  try {
    // Validation
    const validated = createGuestPickupSchema.parse(data);

    // Génération des identifiants
    const trackingNumber = generateTrackingNumber();
    const trackingToken = generateTrackingToken(); // Générer manuellement au lieu de @default(cuid())
    const tokenExpiresAt = getTokenExpirationDate();

    console.log('🔧 [createGuestPickup] Création avec:', { trackingNumber, trackingToken, tokenExpiresAt });

    // Création de la demande (utilise prisma standard car pas de session)
    const pickup = await prisma.pickupRequest.create({
      data: {
        // Tracking
        trackingNumber,
        trackingToken, // Généré manuellement ci-dessus
        tokenExpiresAt,

        // Contact (pour matching US-1.3)
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        contactName: validated.contactName,

        // Adresse
        pickupAddress: validated.pickupAddress,
        pickupCity: validated.pickupCity,
        pickupPostalCode: validated.pickupPostalCode,
        pickupCountry: validated.pickupCountry,

        // Planification
        requestedDate: validated.requestedDate,
        timeSlot: validated.timeSlot,
        pickupTime: validated.pickupTime,

        // Marchandise
        cargoType: validated.cargoType,
        estimatedWeight: validated.estimatedWeight,
        estimatedVolume: validated.estimatedVolume,
        packageCount: validated.packageCount,
        description: validated.description,

        // Instructions
        specialInstructions: validated.specialInstructions,
        accessInstructions: validated.accessInstructions,

        // Métadonnées
        // userId: null (pas connecté)
        // clientId: null (pas rattaché)
        // createdById: null (création publique)
        status: PickupStatus.NOUVEAU,
      },
    });

    console.log('✅ [createGuestPickup] Pickup créé:', {
      id: pickup.id,
      trackingNumber: pickup.trackingNumber,
      trackingToken: pickup.trackingToken,
      hasToken: !!pickup.trackingToken
    });

    // Créer un log de création
    await logPickupCreated({
      pickupId: pickup.id,
      // changedById: null (création publique)
    });

    revalidatePath('/dashboard/pickups');

    return {
      success: true,
      data: {
        id: pickup.id,
        trackingNumber: pickup.trackingNumber,
        trackingToken: pickup.trackingToken,
        message:
          'Votre demande d\'enlèvement a été créée avec succès. Vous recevrez un email de confirmation avec un lien de suivi valide 72h.',
      },
    };
  } catch (error) {
    console.error('Erreur lors de la création de la demande d\'enlèvement:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la création de la demande.',
    };
  }
}

// ============================================
// US-1.4 : CRÉATION AVEC COMPTE
// ============================================

/**
 * Crée une demande d'enlèvement AVEC compte utilisateur
 *
 * User Story US-1.4 :
 * En tant qu'utilisateur connecté, je veux créer une demande
 * d'enlèvement liée à mon compte
 *
 * Différences avec createGuestPickup :
 * - userId rempli depuis la session
 * - clientId déduit de la session
 * - isAttachedToAccount = true dès la création
 * - createdById rempli
 *
 * IMPORTANT : Utilise le client Prisma standard car Zenstack bloque l'accès
 *
 * @param data - Données de la demande
 * @returns Demande créée
 */
export async function createPickup(data: CreatePickupInput) {
  try {
    // Authentification requise
    const session = await requireAuth();

    // Validation
    const validated = createPickupSchema.parse(data);

    // Génération des identifiants
    const trackingNumber = generateTrackingNumber();
    const trackingToken = generateTrackingToken();
    const tokenExpiresAt = getTokenExpirationDate();

    // Création de la demande (utilise prisma standard au lieu de enhanced)
    const pickup = await prisma.pickupRequest.create({
      data: {
        // Tracking
        trackingNumber,
        trackingToken,
        tokenExpiresAt,

        // Rattachement compte
        userId: session.user.id,
        clientId: session.user.clientId,
        isAttachedToAccount: true,

        // Contact
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        contactName: validated.contactName,

        // Adresse
        pickupAddress: validated.pickupAddress,
        pickupCity: validated.pickupCity,
        pickupPostalCode: validated.pickupPostalCode,
        pickupCountry: validated.pickupCountry,

        // Planification
        requestedDate: validated.requestedDate,
        timeSlot: validated.timeSlot,
        pickupTime: validated.pickupTime,

        // Marchandise
        cargoType: validated.cargoType,
        estimatedWeight: validated.estimatedWeight,
        estimatedVolume: validated.estimatedVolume,
        packageCount: validated.packageCount,
        description: validated.description,

        // Instructions
        specialInstructions: validated.specialInstructions,
        accessInstructions: validated.accessInstructions,
        internalNotes: validated.internalNotes,

        // Relations
        shipmentId: validated.shipmentId,

        // Métadonnées
        createdById: session.user.id,
        status: PickupStatus.NOUVEAU,
      },
    });

    // Créer un log de création
    await logPickupCreated({
      pickupId: pickup.id,
      changedById: session.user.id,
      notes: 'Demande créée depuis le compte utilisateur',
    });

    revalidatePath('/dashboard/pickups');

    return {
      success: true,
      data: {
        id: pickup.id,
        trackingNumber: pickup.trackingNumber,
        trackingToken: pickup.trackingToken,
        message: 'Votre demande d\'enlèvement a été créée avec succès.',
      },
    };
  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la création de la demande.',
    };
  }
}

// ============================================
// US-1.2 : SUIVI PAR TOKEN
// ============================================

/**
 * Récupère une demande par son token de suivi
 *
 * User Story US-1.2 :
 * En tant qu'utilisateur avec token, je veux suivre l'état
 * de ma demande sans compte
 *
 * IMPORTANT : Utilise le client Prisma STANDARD (pas enhanced)
 * car il n'y a pas de session utilisateur.
 *
 * @param input - Token de suivi
 * @returns Demande avec historique
 */
export async function trackPickupByToken(input: TrackPickupByTokenInput) {
  try {
    // Validation
    const validated = trackPickupByTokenSchema.parse(input);

    // Récupération avec prisma standard (PAS enhanced, car pas de session)
    const pickup = await prisma.pickupRequest.findUnique({
      where: {
        trackingToken: validated.trackingToken,
      },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            fileUrl: true,
            uploadedAt: true,
          },
        },
      },
    });

    if (!pickup) {
      return {
        success: false,
        error: 'Demande introuvable. Vérifiez votre token de suivi.',
      };
    }

    // Vérifier si le token a expiré
    if (new Date() > pickup.tokenExpiresAt) {
      return {
        success: false,
        error:
          'Votre token de suivi a expiré (validité 72h). Créez un compte pour continuer à suivre votre demande.',
      };
    }

    return {
      success: true,
      data: pickup,
    };
  } catch (error) {
    console.error('Erreur lors du suivi de la demande:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors du suivi de la demande.',
    };
  }
}

// ============================================
// US-1.3 : RATTACHEMENT AUTOMATIQUE
// ============================================

/**
 * Rattache les demandes orphelines à un compte utilisateur
 *
 * User Story US-1.3 :
 * En tant qu'utilisateur qui se connecte après création de demande,
 * je veux que ma demande soit automatiquement rattachée à mon compte
 *
 * Workflow :
 * 1. Recherche des demandes avec contactEmail OU contactPhone matchant
 * 2. Mise à jour : userId, clientId, isAttachedToAccount = true
 * 3. Création d'un log ATTACHED_TO_ACCOUNT
 *
 * Cette fonction est appelée automatiquement lors de :
 * - Création de compte
 * - Connexion (si première connexion)
 *
 * @param userId - ID de l'utilisateur
 * @returns Nombre de demandes rattachées
 */
export async function attachPickupToAccount(userId: string) {
  try {
    // Récupérer les infos de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        clientId: true,
      },
    });

    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    // Rechercher les demandes orphelines avec email ou phone matchant
    const orphanedPickups = await prisma.pickupRequest.findMany({
      where: {
        AND: [
          { userId: null }, // Pas encore rattachée
          {
            OR: [
              { contactEmail: user.email },
              ...(user.phone ? [{ contactPhone: user.phone }] : []),
            ],
          },
        ],
      },
    });

    if (orphanedPickups.length === 0) {
      return {
        success: true,
        data: { count: 0 },
      };
    }

    // Rattacher chaque demande
    const results = await Promise.all(
      orphanedPickups.map(async (pickup) => {
        // Mise à jour
        await prisma.pickupRequest.update({
          where: { id: pickup.id },
          data: {
            userId: user.id,
            clientId: user.clientId,
            isAttachedToAccount: true,
          },
        });

        // Log du rattachement
        const matchedBy =
          pickup.contactEmail === user.email ? 'email' : 'phone';

        await logAttachedToAccount({
          pickupId: pickup.id,
          email: user.email || '',
          matchedBy,
          notes: `Rattachement automatique lors de la création du compte`,
        });

        return pickup.id;
      })
    );

    revalidatePath('/dashboard/pickups');

    return {
      success: true,
      data: { count: results.length },
    };
  } catch (error) {
    console.error('Erreur lors du rattachement des demandes:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors du rattachement.',
    };
  }
}

// ============================================
// US-3.1 : LISTE DES DEMANDES
// ============================================

/**
 * Liste les demandes d'enlèvement avec filtres
 *
 * User Story US-3.1 :
 * En tant qu'agent Faso Fret, je veux voir la liste de
 * toutes les demandes d'enlèvement
 *
 * Access Control (vérifications manuelles) :
 * - ADMIN/OPERATIONS_MANAGER : Toutes les demandes
 * - FINANCE_MANAGER : Lecture seule, toutes les demandes
 * - CLIENT : Demandes de sa company uniquement
 *
 * IMPORTANT : Utilise le client Prisma standard car Zenstack bloque l'accès
 *
 * @param filters - Filtres optionnels (status, date, etc.)
 * @returns Liste paginée des demandes
 */
export async function listPickups(filters?: {
  status?: PickupStatus;
  clientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const session = await requireAuth();

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    // Construction des filtres WHERE
    const where: any = {};

    // Filtrage manuel par rôle (remplace Zenstack)
    if (session.user.role === UserRole.CLIENT) {
      // Les CLIENTs voient seulement leurs propres pickups
      where.userId = session.user.id;
    }
    // ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER voient tous les pickups

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters?.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters?.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    // Recherche textuelle (trackingNumber, contactEmail, pickupAddress)
    if (filters?.search) {
      where.OR = [
        { trackingNumber: { contains: filters.search, mode: 'insensitive' } },
        { contactEmail: { contains: filters.search, mode: 'insensitive' } },
        { pickupAddress: { contains: filters.search, mode: 'insensitive' } },
        { pickupCity: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Récupération des demandes (utilise prisma standard au lieu de enhanced)
    const [pickups, total] = await Promise.all([
      prisma.pickupRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.pickupRequest.count({ where }),
    ]);

    return {
      success: true,
      data: {
        pickups,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération des demandes.',
    };
  }
}

// ============================================
// US-3.2 : CHANGEMENT DE STATUT
// ============================================

/**
 * Change le statut d'une demande d'enlèvement
 *
 * User Story US-3.2 :
 * En tant qu'agent, je veux changer le statut d'une demande
 * selon le workflow défini
 *
 * Workflow autorisé :
 * - NOUVEAU → PRISE_EN_CHARGE
 * - PRISE_EN_CHARGE → EFFECTUE
 * - * → ANNULE (via cancelPickup)
 *
 * IMPORTANT : Utilise le client Prisma standard car Zenstack bloque l'accès
 *
 * @param input - Paramètres de mise à jour
 * @returns Demande mise à jour
 */
export async function updatePickupStatus(input: UpdatePickupStatusInput) {
  try {
    const session = await requireAuth();

    // Vérifier les permissions (CLIENT ne peut pas modifier le statut)
    if (session.user.role === UserRole.CLIENT) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour modifier le statut d\'une demande.',
      };
    }

    // Validation
    const validated = updatePickupStatusSchema.parse(input);

    // Récupérer la demande actuelle (utilise prisma standard au lieu de enhanced)
    const currentPickup = await prisma.pickupRequest.findUnique({
      where: { id: validated.pickupId },
    });

    if (!currentPickup) {
      return {
        success: false,
        error: 'Demande introuvable.',
      };
    }

    // FINANCE_MANAGER peut uniquement voir (pas modifier)
    if (session.user.role === UserRole.FINANCE_MANAGER) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour modifier le statut d\'une demande.',
      };
    }

    // Validation du workflow
    const validTransitions: Record<PickupStatus, PickupStatus[]> = {
      [PickupStatus.NOUVEAU]: [PickupStatus.PRISE_EN_CHARGE, PickupStatus.ANNULE],
      [PickupStatus.PRISE_EN_CHARGE]: [PickupStatus.EFFECTUE, PickupStatus.ANNULE],
      [PickupStatus.EFFECTUE]: [], // Statut terminal
      [PickupStatus.ANNULE]: [], // Statut terminal
    };

    const allowedNext = validTransitions[currentPickup.status];
    if (!allowedNext.includes(validated.newStatus)) {
      return {
        success: false,
        error: `Transition ${currentPickup.status} → ${validated.newStatus} non autorisée.`,
      };
    }

    // Mise à jour
    const dataToUpdate: any = {
      status: validated.newStatus,
    };

    // Si EFFECTUE, enregistrer la date réelle
    if (validated.newStatus === PickupStatus.EFFECTUE) {
      dataToUpdate.actualPickupDate =
        validated.actualPickupDate ?? new Date();
      if (validated.completionNotes) {
        dataToUpdate.completionNotes = validated.completionNotes;
      }
    }

    const updatedPickup = await prisma.pickupRequest.update({
      where: { id: validated.pickupId },
      data: dataToUpdate,
    });

    // Créer un log de changement de statut
    await logStatusChanged({
      pickupId: validated.pickupId,
      oldStatus: currentPickup.status,
      newStatus: validated.newStatus,
      changedById: session.user.id,
      notes: validated.notes,
    });

    revalidatePath('/dashboard/pickups');
    revalidatePath(`/dashboard/pickups/${validated.pickupId}`);

    return {
      success: true,
      data: updatedPickup,
      message: `Statut mis à jour : ${validated.newStatus}`,
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour.',
    };
  }
}

// ============================================
// US-3.3 : ANNULATION AVEC RAISON
// ============================================

/**
 * Annule une demande avec raison obligatoire
 *
 * User Story US-3.3 :
 * En tant qu'agent, je veux pouvoir annuler une demande
 * avec justification obligatoire
 *
 * IMPORTANT : Utilise le client Prisma standard car Zenstack bloque l'accès
 *
 * @param input - ID et raison d'annulation
 * @returns Demande annulée
 */
export async function cancelPickup(input: CancelPickupInput) {
  try {
    const session = await requireAuth();

    // Vérifier les permissions (CLIENT ne peut pas annuler)
    if (session.user.role === UserRole.CLIENT) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour annuler une demande.',
      };
    }

    // Validation
    const validated = cancelPickupSchema.parse(input);

    // Récupérer la demande actuelle (utilise prisma standard au lieu de enhanced)
    const currentPickup = await prisma.pickupRequest.findUnique({
      where: { id: validated.pickupId },
    });

    if (!currentPickup) {
      return {
        success: false,
        error: 'Demande introuvable.',
      };
    }

    // FINANCE_MANAGER peut uniquement voir (pas annuler)
    if (session.user.role === UserRole.FINANCE_MANAGER) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour annuler une demande.',
      };
    }

    // Vérifier que la demande n'est pas déjà terminée
    if (
      currentPickup.status === PickupStatus.EFFECTUE ||
      currentPickup.status === PickupStatus.ANNULE
    ) {
      return {
        success: false,
        error: `Impossible d'annuler une demande avec le statut ${currentPickup.status}.`,
      };
    }

    // Mise à jour
    const updatedPickup = await prisma.pickupRequest.update({
      where: { id: validated.pickupId },
      data: {
        status: PickupStatus.ANNULE,
        cancellationReason: validated.cancellationReason,
      },
    });

    // Créer un log de changement de statut vers ANNULE
    await logStatusChanged({
      pickupId: validated.pickupId,
      oldStatus: currentPickup.status,
      newStatus: PickupStatus.ANNULE,
      changedById: session.user.id,
      notes: validated.cancellationReason,
    });

    revalidatePath('/dashboard/pickups');
    revalidatePath(`/dashboard/pickups/${validated.pickupId}`);

    return {
      success: true,
      data: updatedPickup,
      message: 'Demande annulée avec succès.',
    };
  } catch (error) {
    console.error('Erreur lors de l\'annulation:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de l\'annulation.',
    };
  }
}

// ============================================
// ACTIONS COMPLÉMENTAIRES
// ============================================

/**
 * Assigne un chauffeur à une demande d'enlèvement
 *
 * IMPORTANT : Utilise le client Prisma standard car Zenstack bloque l'accès
 *
 * Note : On ne gère plus les transporteurs (entité supprimée), seulement
 * les informations directes du chauffeur (nom, téléphone, plaque).
 *
 * @param input - Données du chauffeur
 * @returns Demande mise à jour
 */
export async function assignDriver(input: AssignDriverInput) {
  try {
    const session = await requireAuth();

    // Seuls les ADMIN et OPERATIONS_MANAGER peuvent assigner
    if (
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.OPERATIONS_MANAGER
    ) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour assigner un chauffeur.',
      };
    }

    // Validation
    const validated = assignDriverSchema.parse(input);

    // Récupérer l'état actuel (utilise prisma standard au lieu de enhanced)
    const currentPickup = await prisma.pickupRequest.findUnique({
      where: { id: validated.pickupId },
      select: {
        driverName: true,
      },
    });

    if (!currentPickup) {
      return {
        success: false,
        error: 'Demande introuvable.',
      };
    }

    // Mise à jour des informations chauffeur
    const updatedPickup = await prisma.pickupRequest.update({
      where: { id: validated.pickupId },
      data: {
        driverName: validated.driverName,
        driverPhone: validated.driverPhone,
        vehiclePlate: validated.vehiclePlate,
      },
    });

    // Log de l'assignation (première fois) ou changement
    const isFirstAssignment = !currentPickup.driverName;

    if (isFirstAssignment) {
      await logDriverAssigned({
        pickupId: validated.pickupId,
        driverName: validated.driverName,
        driverPhone: validated.driverPhone,
        changedById: session.user.id,
      });
    } else {
      await logDriverChanged({
        pickupId: validated.pickupId,
        oldDriverName: currentPickup.driverName ?? undefined,
        newDriverName: validated.driverName,
        changedById: session.user.id,
        notes: 'Chauffeur modifié',
      });
    }

    revalidatePath('/dashboard/pickups');
    revalidatePath(`/dashboard/pickups/${validated.pickupId}`);

    return {
      success: true,
      data: updatedPickup,
      message: isFirstAssignment
        ? 'Chauffeur assigné avec succès.'
        : 'Chauffeur modifié avec succès.',
    };
  } catch (error) {
    console.error('Erreur lors de l\'assignation du chauffeur:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de l\'assignation.',
    };
  }
}

/**
 * Planifie ou replanifie une demande d'enlèvement
 *
 * IMPORTANT : Utilise le client Prisma standard car Zenstack bloque l'accès
 *
 * @param input - Données de planification
 * @returns Demande mise à jour
 */
export async function schedulePickup(input: SchedulePickupInput) {
  try {
    const session = await requireAuth();

    // Seuls les ADMIN et OPERATIONS_MANAGER peuvent planifier
    if (
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.OPERATIONS_MANAGER
    ) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour planifier un enlèvement.',
      };
    }

    // Validation
    const validated = schedulePickupSchema.parse(input);

    // Récupérer l'ancienne date planifiée (utilise prisma standard au lieu de enhanced)
    const currentPickup = await prisma.pickupRequest.findUnique({
      where: { id: validated.pickupId },
      select: { scheduledDate: true },
    });

    if (!currentPickup) {
      return {
        success: false,
        error: 'Demande introuvable.',
      };
    }

    // Mise à jour
    const updatedPickup = await prisma.pickupRequest.update({
      where: { id: validated.pickupId },
      data: {
        scheduledDate: validated.scheduledDate,
        timeSlot: validated.timeSlot,
        pickupTime: validated.pickupTime,
      },
    });

    // Log de planification ou replanification
    const isReschedule = currentPickup.scheduledDate !== null;

    if (isReschedule) {
      await logRescheduled({
        pickupId: validated.pickupId,
        oldScheduledDate: currentPickup.scheduledDate!,
        scheduledDate: new Date(validated.scheduledDate),
        timeSlot: validated.timeSlot,
        changedById: session.user.id,
        notes: validated.notes,
      });
    } else {
      await logScheduled({
        pickupId: validated.pickupId,
        scheduledDate: new Date(validated.scheduledDate),
        timeSlot: validated.timeSlot,
        changedById: session.user.id,
        notes: validated.notes,
      });
    }

    revalidatePath('/dashboard/pickups');
    revalidatePath(`/dashboard/pickups/${validated.pickupId}`);

    return {
      success: true,
      data: updatedPickup,
      message: isReschedule
        ? 'Enlèvement replanifié avec succès.'
        : 'Enlèvement planifié avec succès.',
    };
  } catch (error) {
    console.error('Erreur lors de la planification:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la planification.',
    };
  }
}

/**
 * Récupère les détails complets d'une demande
 *
 * IMPORTANT : Utilise toujours le client Prisma standard car Zenstack bloque l'accès
 *
 * @param pickupId - ID de la demande
 * @returns Demande avec historique et relations
 */
export async function getPickupDetails(pickupId: string) {
  try {
    const session = await getSession();

    // Utilise toujours prisma standard (pas enhanced)
    const pickup = await prisma.pickupRequest.findUnique({
      where: { id: pickupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        shipment: {
          select: {
            id: true,
            trackingNumber: true,
            status: true,
          },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: {
              select: {
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        documents: true,
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!pickup) {
      return {
        success: false,
        error: 'Demande introuvable.',
      };
    }

    // Vérification manuelle des permissions (remplace Zenstack)
    if (session && session.user.role === UserRole.CLIENT) {
      // Les CLIENTs ne peuvent voir que leurs propres demandes
      if (pickup.userId !== session.user.id) {
        return {
          success: false,
          error: 'Demande introuvable.',
        };
      }
    }

    return {
      success: true,
      data: pickup,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des détails:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue.',
    };
  }
}
