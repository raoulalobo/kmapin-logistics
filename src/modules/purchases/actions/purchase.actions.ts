/**
 * Server Actions pour la gestion des demandes d'achat délégué
 *
 * Architecture :
 * - IMPORTANT : Utilise le client Prisma STANDARD (pas Zenstack) car l'enhanced client bloque l'accès
 * - Les permissions sont vérifiées MANUELLEMENT via session.user.role
 * - Tous les changements sont loggés dans PurchaseLog pour traçabilité
 *
 * User Stories couvertes :
 * - US-1.1 : Création sans compte (createGuestPurchase)
 * - US-1.2 : Suivi par token (trackPurchaseByToken)
 * - US-1.3 : Rattachement automatique (attachPurchaseToAccount)
 * - US-1.4 : Création avec compte (createPurchase)
 * - US-3.1 : Liste des demandes (listPurchases)
 * - US-3.2 : Changement de statut (updatePurchaseStatus)
 * - US-3.3 : Annulation avec raison (cancelPurchase)
 * - US-3.4 : Mise à jour des coûts (updatePurchaseCosts)
 */

'use server';

import { revalidatePath } from 'next/cache';
import { getSession, requireAuth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { PurchaseStatus, DeliveryMode, UserRole } from '@/lib/db/enums';
import {
  createGuestPurchaseSchema,
  createPurchaseSchema,
  trackPurchaseByTokenSchema,
  updatePurchaseStatusSchema,
  cancelPurchaseSchema,
  updatePurchaseCostsSchema,
  type CreateGuestPurchaseInput,
  type CreatePurchaseInput,
  type TrackPurchaseByTokenInput,
  type UpdatePurchaseStatusInput,
  type CancelPurchaseInput,
  type UpdatePurchaseCostsInput,
} from '../schemas/purchase.schema';

// ============================================
// UTILITAIRES
// ============================================

/**
 * Génère un numéro de tracking unique pour achat délégué
 * Format: PR-YYYYMMDD-XXXXX
 *
 * @returns Numéro de tracking unique
 *
 * @example
 * PR-20260112-A1B2C
 */
function generateTrackingNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `PR-${year}${month}${day}-${random}`;
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

/**
 * Calcule les frais de service (15% du coût produit, minimum 10€)
 *
 * @param productCost - Coût réel du produit
 * @returns Frais de service calculés
 */
function calculateServiceFee(productCost: number): number {
  const calculated = productCost * 0.15; // 15%
  return Math.max(calculated, 10); // Minimum 10€
}

/**
 * Calcule le coût total d'un achat
 *
 * @param productCost - Coût réel du produit
 * @param deliveryCost - Frais de livraison
 * @param serviceFee - Frais de service (optionnel, calculé si non fourni)
 * @returns Coût total
 */
function calculateTotalCost(
  productCost: number,
  deliveryCost: number,
  serviceFee?: number
): number {
  const fee = serviceFee ?? calculateServiceFee(productCost);
  return productCost + deliveryCost + fee;
}

// ============================================
// HELPERS DE LOG (temporaires - à externaliser)
// ============================================

/**
 * Log de création d'une demande
 */
async function logPurchaseCreated(params: {
  purchaseId: string;
  changedById?: string;
  notes?: string;
}) {
  await prisma.purchaseLog.create({
    data: {
      purchaseId: params.purchaseId,
      eventType: 'CREATED',
      newStatus: PurchaseStatus.NOUVEAU,
      changedById: params.changedById,
      notes: params.notes ?? 'Demande d\'achat créée',
    },
  });
}

/**
 * Log de changement de statut
 */
async function logStatusChanged(params: {
  purchaseId: string;
  oldStatus: PurchaseStatus;
  newStatus: PurchaseStatus;
  changedById: string;
  notes?: string;
}) {
  await prisma.purchaseLog.create({
    data: {
      purchaseId: params.purchaseId,
      eventType: 'STATUS_CHANGED',
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      changedById: params.changedById,
      notes: params.notes,
    },
  });
}

/**
 * Log de rattachement à un compte
 */
async function logAttachedToAccount(params: {
  purchaseId: string;
  email: string;
  matchedBy: 'email' | 'phone';
  notes?: string;
}) {
  await prisma.purchaseLog.create({
    data: {
      purchaseId: params.purchaseId,
      eventType: 'ATTACHED_TO_ACCOUNT',
      notes: params.notes ?? `Rattaché automatiquement via ${params.matchedBy}: ${params.email}`,
      metadata: {
        matchedBy: params.matchedBy,
        email: params.email,
      },
    },
  });
}

/**
 * Log de mise à jour des coûts
 */
async function logCostsUpdated(params: {
  purchaseId: string;
  changedById: string;
  actualProductCost: number;
  deliveryCost: number;
  serviceFee: number;
  totalCost: number;
  notes?: string;
}) {
  await prisma.purchaseLog.create({
    data: {
      purchaseId: params.purchaseId,
      eventType: 'COSTS_UPDATED',
      changedById: params.changedById,
      notes: params.notes,
      metadata: {
        actualProductCost: params.actualProductCost,
        deliveryCost: params.deliveryCost,
        serviceFee: params.serviceFee,
        totalCost: params.totalCost,
      },
    },
  });
}

// ============================================
// US-1.1 : CRÉATION SANS COMPTE
// ============================================

/**
 * Crée une demande d'achat délégué SANS compte utilisateur
 *
 * User Story US-1.1 :
 * En tant qu'utilisateur non connecté, je veux déléguer un achat
 * à Faso Fret sans créer de compte
 *
 * Workflow :
 * 1. Validation des données avec Zod
 * 2. Génération trackingNumber et trackingToken
 * 3. Création dans la DB avec userId = null
 * 4. Création d'un log CREATED
 * 5. Retour du trackingToken et trackingNumber pour suivi
 *
 * @param data - Données de la demande d'achat
 * @returns Demande créée avec token de suivi
 */
export async function createGuestPurchase(data: CreateGuestPurchaseInput) {
  try {
    // Validation
    const validated = createGuestPurchaseSchema.parse(data);

    // Génération des identifiants
    const trackingNumber = generateTrackingNumber();
    const trackingToken = generateTrackingToken();
    const tokenExpiresAt = getTokenExpirationDate();

    console.log('🔧 [createGuestPurchase] Création avec:', {
      trackingNumber,
      trackingToken,
      tokenExpiresAt,
    });

    // Création de la demande (utilise prisma standard car pas de session)
    const purchase = await prisma.purchaseRequest.create({
      data: {
        // Tracking
        trackingNumber,
        trackingToken,
        tokenExpiresAt,

        // Contact (pour matching US-1.3)
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        contactName: validated.contactName,

        // Informations produit
        productName: validated.productName,
        productUrl: validated.productUrl,
        quantity: validated.quantity,
        estimatedPrice: validated.estimatedPrice,
        maxBudget: validated.maxBudget,
        productDescription: validated.productDescription,

        // Adresse de livraison
        deliveryAddress: validated.deliveryAddress,
        deliveryCity: validated.deliveryCity,
        deliveryPostalCode: validated.deliveryPostalCode,
        deliveryCountry: validated.deliveryCountry,

        // Planification
        requestedDate: validated.requestedDate,
        deliveryMode: validated.deliveryMode,

        // Instructions
        specialInstructions: validated.specialInstructions,

        // Conditions acceptées
        acceptedTerms: validated.acceptedTerms,
        acceptedUrgentFee: validated.acceptedUrgentFee,
        acceptedPricing: validated.acceptedPricing,

        // Métadonnées
        // userId: null (pas connecté)
        // companyId: null (pas rattaché)
        // createdById: null (création publique)
        status: PurchaseStatus.NOUVEAU,
      },
    });

    console.log('✅ [createGuestPurchase] Purchase créé:', {
      id: purchase.id,
      trackingNumber: purchase.trackingNumber,
      trackingToken: purchase.trackingToken,
      hasToken: !!purchase.trackingToken,
    });

    // Créer un log de création
    await logPurchaseCreated({
      purchaseId: purchase.id,
      // changedById: null (création publique)
    });

    revalidatePath('/dashboard/purchases');

    return {
      success: true,
      data: {
        id: purchase.id,
        trackingNumber: purchase.trackingNumber,
        trackingToken: purchase.trackingToken,
        message:
          'Votre demande d\'achat a été créée avec succès. Vous recevrez un email de confirmation avec un lien de suivi valide 72h.',
      },
    };
  } catch (error) {
    console.error('Erreur lors de la création de la demande d\'achat:', error);

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
 * Crée une demande d'achat délégué AVEC compte utilisateur
 *
 * User Story US-1.4 :
 * En tant qu'utilisateur connecté, je veux déléguer un achat
 * lié à mon compte
 *
 * Différences avec createGuestPurchase :
 * - userId rempli depuis la session
 * - companyId déduit de la session
 * - isAttachedToAccount = true dès la création
 * - createdById rempli
 *
 * IMPORTANT : Utilise le client Prisma standard car Zenstack bloque l'accès
 *
 * @param data - Données de la demande d'achat
 * @returns Demande créée
 */
export async function createPurchase(data: CreatePurchaseInput) {
  try {
    // Authentification requise
    const session = await requireAuth();

    // Validation
    const validated = createPurchaseSchema.parse(data);

    // Génération des identifiants
    const trackingNumber = generateTrackingNumber();
    const trackingToken = generateTrackingToken();
    const tokenExpiresAt = getTokenExpirationDate();

    // Création de la demande (utilise prisma standard au lieu de enhanced)
    const purchase = await prisma.purchaseRequest.create({
      data: {
        // Tracking
        trackingNumber,
        trackingToken,
        tokenExpiresAt,

        // Rattachement compte
        userId: session.user.id,
        companyId: session.user.companyId,
        isAttachedToAccount: true,

        // Contact
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        contactName: validated.contactName,

        // Informations produit
        productName: validated.productName,
        productUrl: validated.productUrl,
        quantity: validated.quantity,
        estimatedPrice: validated.estimatedPrice,
        maxBudget: validated.maxBudget,
        productDescription: validated.productDescription,

        // Adresse de livraison
        deliveryAddress: validated.deliveryAddress,
        deliveryCity: validated.deliveryCity,
        deliveryPostalCode: validated.deliveryPostalCode,
        deliveryCountry: validated.deliveryCountry,

        // Planification
        requestedDate: validated.requestedDate,
        deliveryMode: validated.deliveryMode,

        // Instructions
        specialInstructions: validated.specialInstructions,
        internalNotes: validated.internalNotes,

        // Conditions acceptées
        acceptedTerms: validated.acceptedTerms,
        acceptedUrgentFee: validated.acceptedUrgentFee,
        acceptedPricing: validated.acceptedPricing,

        // Relations
        shipmentId: validated.shipmentId,

        // Métadonnées
        createdById: session.user.id,
        status: PurchaseStatus.NOUVEAU,
      },
    });

    // Créer un log de création
    await logPurchaseCreated({
      purchaseId: purchase.id,
      changedById: session.user.id,
      notes: 'Demande créée depuis le compte utilisateur',
    });

    revalidatePath('/dashboard/purchases');

    return {
      success: true,
      data: {
        id: purchase.id,
        trackingNumber: purchase.trackingNumber,
        trackingToken: purchase.trackingToken,
        message: 'Votre demande d\'achat a été créée avec succès.',
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
 * Récupère une demande d'achat par son token de suivi
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
export async function trackPurchaseByToken(input: TrackPurchaseByTokenInput) {
  try {
    // Validation
    const validated = trackPurchaseByTokenSchema.parse(input);

    // Récupération avec prisma standard (PAS enhanced, car pas de session)
    const purchase = await prisma.purchaseRequest.findUnique({
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

    if (!purchase) {
      return {
        success: false,
        error: 'Demande introuvable. Vérifiez votre token de suivi.',
      };
    }

    // Vérifier si le token a expiré
    if (new Date() > purchase.tokenExpiresAt) {
      return {
        success: false,
        error:
          'Votre token de suivi a expiré (validité 72h). Créez un compte pour continuer à suivre votre demande.',
      };
    }

    return {
      success: true,
      data: purchase,
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
 * Rattache les demandes d'achat orphelines à un compte utilisateur
 *
 * User Story US-1.3 :
 * En tant qu'utilisateur qui se connecte après création de demande,
 * je veux que ma demande soit automatiquement rattachée à mon compte
 *
 * Workflow :
 * 1. Recherche des demandes avec contactEmail OU contactPhone matchant
 * 2. Mise à jour : userId, companyId, isAttachedToAccount = true
 * 3. Création d'un log ATTACHED_TO_ACCOUNT
 *
 * Cette fonction est appelée automatiquement lors de :
 * - Création de compte
 * - Connexion (si première connexion)
 *
 * @param userId - ID de l'utilisateur
 * @returns Nombre de demandes rattachées
 */
export async function attachPurchaseToAccount(userId: string) {
  try {
    // Récupérer les infos de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        companyId: true,
      },
    });

    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    // Rechercher les demandes orphelines avec email ou phone matchant
    const orphanedPurchases = await prisma.purchaseRequest.findMany({
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

    if (orphanedPurchases.length === 0) {
      return {
        success: true,
        data: { count: 0 },
      };
    }

    // Rattacher chaque demande
    const results = await Promise.all(
      orphanedPurchases.map(async (purchase) => {
        // Mise à jour
        await prisma.purchaseRequest.update({
          where: { id: purchase.id },
          data: {
            userId: user.id,
            companyId: user.companyId,
            isAttachedToAccount: true,
          },
        });

        // Log du rattachement
        const matchedBy =
          purchase.contactEmail === user.email ? 'email' : 'phone';

        await logAttachedToAccount({
          purchaseId: purchase.id,
          email: user.email || '',
          matchedBy,
          notes: `Rattachement automatique lors de la création du compte`,
        });

        return purchase.id;
      })
    );

    revalidatePath('/dashboard/purchases');

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
 * Liste les demandes d'achat avec filtres
 *
 * User Story US-3.1 :
 * En tant qu'agent Faso Fret, je veux voir la liste de
 * toutes les demandes d'achat
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
export async function listPurchases(filters?: {
  status?: PurchaseStatus;
  companyId?: string;
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
      // Les CLIENTs voient seulement leurs propres achats
      where.userId = session.user.id;
    }
    // ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER voient tous les achats

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.companyId) {
      where.companyId = filters.companyId;
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

    // Recherche textuelle (trackingNumber, contactEmail, productName)
    if (filters?.search) {
      where.OR = [
        { trackingNumber: { contains: filters.search, mode: 'insensitive' } },
        { contactEmail: { contains: filters.search, mode: 'insensitive' } },
        { productName: { contains: filters.search, mode: 'insensitive' } },
        { deliveryCity: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Récupération des demandes (utilise prisma standard au lieu de enhanced)
    const [purchases, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
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
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.purchaseRequest.count({ where }),
    ]);

    return {
      success: true,
      data: {
        purchases,
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
 * Change le statut d'une demande d'achat
 *
 * User Story US-3.2 :
 * En tant qu'agent, je veux changer le statut d'une demande
 * selon le workflow défini
 *
 * Workflow autorisé :
 * - NOUVEAU → EN_COURS
 * - EN_COURS → LIVRE
 * - * → ANNULE (via cancelPurchase)
 *
 * IMPORTANT : Utilise le client Prisma standard car Zenstack bloque l'accès
 *
 * @param input - Paramètres de mise à jour
 * @returns Demande mise à jour
 */
export async function updatePurchaseStatus(input: UpdatePurchaseStatusInput) {
  try {
    const session = await requireAuth();

    // Vérifier les permissions (CLIENT ne peut pas modifier le statut)
    if (session.user.role === UserRole.CLIENT) {
      return {
        success: false,
        error:
          'Vous n\'avez pas les permissions pour modifier le statut d\'une demande.',
      };
    }

    // Validation
    const validated = updatePurchaseStatusSchema.parse(input);

    // Récupérer la demande actuelle (utilise prisma standard au lieu de enhanced)
    const currentPurchase = await prisma.purchaseRequest.findUnique({
      where: { id: validated.purchaseId },
    });

    if (!currentPurchase) {
      return {
        success: false,
        error: 'Demande introuvable.',
      };
    }

    // FINANCE_MANAGER peut uniquement voir (pas modifier)
    if (session.user.role === UserRole.FINANCE_MANAGER) {
      return {
        success: false,
        error:
          'Vous n\'avez pas les permissions pour modifier le statut d\'une demande.',
      };
    }

    // Validation du workflow
    const validTransitions: Record<PurchaseStatus, PurchaseStatus[]> = {
      [PurchaseStatus.NOUVEAU]: [
        PurchaseStatus.EN_COURS,
        PurchaseStatus.ANNULE,
      ],
      [PurchaseStatus.EN_COURS]: [PurchaseStatus.LIVRE, PurchaseStatus.ANNULE],
      [PurchaseStatus.LIVRE]: [], // Statut terminal
      [PurchaseStatus.ANNULE]: [], // Statut terminal
    };

    const allowedNext = validTransitions[currentPurchase.status];
    if (!allowedNext.includes(validated.newStatus)) {
      return {
        success: false,
        error: `Transition ${currentPurchase.status} → ${validated.newStatus} non autorisée.`,
      };
    }

    // Mise à jour
    const dataToUpdate: any = {
      status: validated.newStatus,
    };

    // Si LIVRE, enregistrer la date réelle et coûts
    if (validated.newStatus === PurchaseStatus.LIVRE) {
      dataToUpdate.actualDeliveryDate =
        validated.actualDeliveryDate ?? new Date();

      // Mise à jour des coûts si fournis
      if (validated.actualProductCost) {
        dataToUpdate.actualProductCost = validated.actualProductCost;
      }
      if (validated.deliveryCost) {
        dataToUpdate.deliveryCost = validated.deliveryCost;
      }
      if (validated.serviceFee) {
        dataToUpdate.serviceFee = validated.serviceFee;
      } else if (validated.actualProductCost) {
        // Calculer automatiquement les frais de service si non fournis
        dataToUpdate.serviceFee = calculateServiceFee(
          validated.actualProductCost
        );
      }

      // Calculer le coût total si tous les coûts sont fournis
      if (
        validated.actualProductCost &&
        validated.deliveryCost &&
        dataToUpdate.serviceFee
      ) {
        dataToUpdate.totalCost = calculateTotalCost(
          validated.actualProductCost,
          validated.deliveryCost,
          dataToUpdate.serviceFee
        );
      }

      if (validated.completionNotes) {
        dataToUpdate.completionNotes = validated.completionNotes;
      }
    }

    const updatedPurchase = await prisma.purchaseRequest.update({
      where: { id: validated.purchaseId },
      data: dataToUpdate,
    });

    // Créer un log de changement de statut
    await logStatusChanged({
      purchaseId: validated.purchaseId,
      oldStatus: currentPurchase.status,
      newStatus: validated.newStatus,
      changedById: session.user.id,
      notes: validated.notes,
    });

    revalidatePath('/dashboard/purchases');
    revalidatePath(`/dashboard/purchases/${validated.purchaseId}`);

    return {
      success: true,
      data: updatedPurchase,
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
 * Annule une demande d'achat avec raison obligatoire
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
export async function cancelPurchase(input: CancelPurchaseInput) {
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
    const validated = cancelPurchaseSchema.parse(input);

    // Récupérer la demande actuelle (utilise prisma standard au lieu de enhanced)
    const currentPurchase = await prisma.purchaseRequest.findUnique({
      where: { id: validated.purchaseId },
    });

    if (!currentPurchase) {
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
      currentPurchase.status === PurchaseStatus.LIVRE ||
      currentPurchase.status === PurchaseStatus.ANNULE
    ) {
      return {
        success: false,
        error: `Impossible d'annuler une demande avec le statut ${currentPurchase.status}.`,
      };
    }

    // Mise à jour
    const updatedPurchase = await prisma.purchaseRequest.update({
      where: { id: validated.purchaseId },
      data: {
        status: PurchaseStatus.ANNULE,
        cancellationReason: validated.cancellationReason,
      },
    });

    // Créer un log de changement de statut vers ANNULE
    await logStatusChanged({
      purchaseId: validated.purchaseId,
      oldStatus: currentPurchase.status,
      newStatus: PurchaseStatus.ANNULE,
      changedById: session.user.id,
      notes: validated.cancellationReason,
    });

    revalidatePath('/dashboard/purchases');
    revalidatePath(`/dashboard/purchases/${validated.purchaseId}`);

    return {
      success: true,
      data: updatedPurchase,
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
// US-3.4 : MISE À JOUR DES COÛTS
// ============================================

/**
 * Met à jour les coûts réels d'un achat après effectuation
 *
 * User Story US-3.4 :
 * En tant qu'agent, je veux enregistrer les coûts réels
 * après avoir effectué l'achat
 *
 * IMPORTANT : Utilise le client Prisma standard car Zenstack bloque l'accès
 *
 * @param input - Coûts réels de l'achat
 * @returns Demande mise à jour avec coûts
 */
export async function updatePurchaseCosts(input: UpdatePurchaseCostsInput) {
  try {
    const session = await requireAuth();

    // Vérifier les permissions (CLIENT et VIEWER ne peuvent pas modifier)
    if (
      session.user.role === UserRole.CLIENT ||
      session.user.role === UserRole.VIEWER
    ) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour modifier les coûts.',
      };
    }

    // Validation
    const validated = updatePurchaseCostsSchema.parse(input);

    // Récupérer la demande actuelle (utilise prisma standard au lieu de enhanced)
    const currentPurchase = await prisma.purchaseRequest.findUnique({
      where: { id: validated.purchaseId },
    });

    if (!currentPurchase) {
      return {
        success: false,
        error: 'Demande introuvable.',
      };
    }

    // Calculer les frais de service si non fournis (15% min 10€)
    const serviceFee =
      validated.serviceFee ?? calculateServiceFee(validated.actualProductCost);

    // Calculer le coût total
    const totalCost = calculateTotalCost(
      validated.actualProductCost,
      validated.deliveryCost,
      serviceFee
    );

    // Mise à jour
    const updatedPurchase = await prisma.purchaseRequest.update({
      where: { id: validated.purchaseId },
      data: {
        actualProductCost: validated.actualProductCost,
        deliveryCost: validated.deliveryCost,
        serviceFee,
        totalCost,
        purchaseProof: validated.purchaseProof,
      },
    });

    // Créer un log de mise à jour des coûts
    await logCostsUpdated({
      purchaseId: validated.purchaseId,
      changedById: session.user.id,
      actualProductCost: validated.actualProductCost,
      deliveryCost: validated.deliveryCost,
      serviceFee,
      totalCost,
      notes: validated.notes,
    });

    revalidatePath('/dashboard/purchases');
    revalidatePath(`/dashboard/purchases/${validated.purchaseId}`);

    return {
      success: true,
      data: updatedPurchase,
      message: 'Coûts mis à jour avec succès.',
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour des coûts:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour des coûts.',
    };
  }
}

// ============================================
// RÉCUPÉRATION DES DÉTAILS
// ============================================

/**
 * Récupère les détails complets d'une demande d'achat
 *
 * IMPORTANT : Utilise toujours le client Prisma standard car Zenstack bloque l'accès
 *
 * @param purchaseId - ID de la demande
 * @returns Demande avec historique et relations
 */
export async function getPurchaseDetails(purchaseId: string) {
  try {
    const session = await getSession();

    // Utilise toujours prisma standard (pas enhanced)
    const purchase = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        company: {
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

    if (!purchase) {
      return {
        success: false,
        error: 'Demande introuvable.',
      };
    }

    // Vérification manuelle des permissions (remplace Zenstack)
    if (session && session.user.role === UserRole.CLIENT) {
      // Les CLIENTs ne peuvent voir que leurs propres demandes
      if (purchase.userId !== session.user.id) {
        return {
          success: false,
          error: 'Demande introuvable.',
        };
      }
    }

    return {
      success: true,
      data: purchase,
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
