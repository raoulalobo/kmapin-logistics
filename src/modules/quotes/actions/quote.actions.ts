/**
 * Server Actions : Devis (Quotes)
 *
 * Actions serveur pour la gestion CRUD des devis
 * Toutes les actions sont sécurisées avec vérification d'authentification et permissions RBAC
 *
 * @module modules/quotes/actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/client';
import { requireAuth } from '@/lib/auth/config';
import { requirePermission, hasPermission } from '@/lib/auth/permissions';
import { UserRole, ShipmentStatus, QuoteStatus } from '@/lib/db/enums';
import { logShipmentCreated } from '@/modules/shipments';
import {
  logQuoteCreated,
  logQuoteUpdated,
  logQuoteSubmittedByClient,
  logQuoteSentToClient,
  logQuoteAcceptedByClient,
  logQuoteRejectedByClient,
  logQuoteTreatmentStarted,
  logQuoteTreatmentValidated,
  logQuoteCancelled,
  logQuoteSoftDeleted,
  logQuoteRestored,
} from '../lib/quote-log-helper';
import {
  calculerPrixMultiPackages,
  type CargoTypeForPricing,
  type PriorityType,
} from '../lib/pricing-calculator-dynamic';
import { z } from 'zod';
import {
  quoteSchema,
  quoteUpdateSchema,
  quoteAcceptSchema,
  quoteRejectSchema,
  quoteStartTreatmentSchema,
  quoteValidateTreatmentSchema,
  quoteCancelSchema,
  createGuestQuoteSchema,
  trackQuoteByTokenSchema,
  packageSchema,
  packagesArraySchema,
  type QuoteFormData,
  type QuoteUpdateData,
  type QuoteAcceptData,
  type QuoteRejectData,
  type QuoteStartTreatmentData,
  type QuoteValidateTreatmentData,
  type QuoteCancelData,
  type CreateGuestQuoteInput,
  type TrackQuoteByTokenInput,
  type PackageFormData,
} from '../schemas/quote.schema';

/**
 * Type pour les résultats d'actions avec erreur ou succès
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

/**
 * Formate le mode de paiement en français
 *
 * Traduit les valeurs de l'enum QuotePaymentMethod pour l'affichage
 * dans les logs et les messages utilisateur.
 *
 * @param method - Valeur brute du mode de paiement (CASH, ON_DELIVERY, BANK_TRANSFER)
 * @returns Libellé traduit en français
 *
 * @example
 * formatPaymentMethod('ON_DELIVERY') // => "À la livraison"
 */
function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return 'Non défini';

  const methodMap: Record<string, string> = {
    CASH: 'Comptant',
    ON_DELIVERY: 'À la livraison',
    BANK_TRANSFER: 'Virement bancaire',
  };

  return methodMap[method] || method;
}

/**
 * Générer un numéro de devis unique
 * Format: QTE-YYYYMMDD-XXXXX (ex: QTE-20250103-00001)
 */
async function generateQuoteNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Compter le nombre de devis créés aujourd'hui
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const count = await prisma.quote.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Incrémenter et formater le numéro
  const sequence = String(count + 1).padStart(5, '0');
  const quoteNumber = `QTE-${datePrefix}-${sequence}`;

  // Vérifier que le numéro n'existe pas déjà (très rare)
  const existing = await prisma.quote.findUnique({
    where: { quoteNumber },
  });

  if (existing) {
    // Si le numéro existe déjà, régénérer avec un timestamp
    const timestamp = Date.now().toString().slice(-5);
    return `QTE-${datePrefix}-${timestamp}`;
  }

  return quoteNumber;
}

/**
 * Action : Créer un nouveau devis
 *
 * Crée un nouveau devis dans la base de données
 * après validation des données et vérification des permissions
 *
 * @param formData - Données du formulaire de création
 * @returns Résultat avec ID et numéro de devis créé ou erreur
 *
 * @permissions 'quotes:create' - ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER, CLIENT (peut créer ses propres devis)
 */
export async function createQuoteAction(
  formData: FormData
): Promise<ActionResult<{ id: string; quoteNumber: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'quotes:create' ou 'quotes:create:own'
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    const canCreateAll = hasPermission(userRole, 'quotes:create');
    const canCreateOwn = hasPermission(userRole, 'quotes:create:own');

    if (!canCreateAll && !canCreateOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour créer un devis',
      };
    }

    // === DIAGNOSTIC LOGS ===
    console.log('[createQuoteAction] === DIAGNOSTIC CLIENTID ===');
    console.log('[createQuoteAction] formData.get("clientId"):', formData.get('clientId'));
    console.log('[createQuoteAction] Type formData clientId:', typeof formData.get('clientId'));
    console.log('[createQuoteAction] Est vide?', !formData.get('clientId') || formData.get('clientId') === '');
    console.log('[createQuoteAction] Session user:', {
      id: session.user.id,
      role: userRole,
      clientId: session.user.clientId,
    });
    // === FIN DIAGNOSTIC ===

    // Extraire et valider les données
    const rawData = {
      clientId: formData.get('clientId'),
      // Dépôt Faso Fret associé (optionnel)
      depotId: formData.get('depotId') || undefined,
      originCountry: formData.get('originCountry'),
      destinationCountry: formData.get('destinationCountry'),
      cargoType: formData.get('cargoType'),
      weight: Number(formData.get('weight')),
      volume: formData.get('volume') ? Number(formData.get('volume')) : null,
      // Snapshot adresses expéditeur (optionnelles)
      originAddress: formData.get('originAddress') || undefined,
      originCity: formData.get('originCity') || undefined,
      originPostalCode: formData.get('originPostalCode') || undefined,
      originContactName: formData.get('originContactName') || undefined,
      originContactPhone: formData.get('originContactPhone') || undefined,
      originContactEmail: formData.get('originContactEmail') || undefined,
      // Snapshot adresses destinataire (optionnelles)
      destinationAddress: formData.get('destinationAddress') || undefined,
      destinationCity: formData.get('destinationCity') || undefined,
      destinationPostalCode: formData.get('destinationPostalCode') || undefined,
      destinationContactName: formData.get('destinationContactName') || undefined,
      destinationContactPhone: formData.get('destinationContactPhone') || undefined,
      destinationContactEmail: formData.get('destinationContactEmail') || undefined,
      transportMode: formData.getAll('transportMode'),
      // Priorité de livraison : sert au moteur de pricing pour appliquer les surcharges
      // (pas de colonne en DB sur Quote, uniquement utilisé pour le calcul)
      priority: (formData.get('priority') as string) || 'STANDARD',
      estimatedCost: Number(formData.get('estimatedCost')),
      currency: formData.get('currency') || 'EUR',
      validUntil: formData.get('validUntil'),
      status: formData.get('status') || 'DRAFT',
    };

    // Extraire les packages (colis détaillés) depuis le FormData
    // Les packages sont sérialisés en JSON dans le champ 'packages'
    // Si non fournis, on créera un package unique depuis les champs plats (rétrocompatibilité)
    let packagesData: PackageFormData[] | undefined;
    const packagesRaw = formData.get('packages');
    if (packagesRaw && typeof packagesRaw === 'string') {
      try {
        const parsed = JSON.parse(packagesRaw);
        packagesData = packagesArraySchema.parse(parsed);
      } catch (parseError) {
        console.error('[createQuoteAction] Erreur parsing packages:', parseError);
        // En cas d'erreur de parsing, on continue sans packages détaillés
      }
    }

    // === DIAGNOSTIC LOGS ===
    console.log('[createQuoteAction] rawData.clientId:', rawData.clientId);
    console.log('[createQuoteAction] Type rawData.clientId:', typeof rawData.clientId);
    // === FIN DIAGNOSTIC ===

    // Valider les données avec Zod (avec capture des erreurs détaillées)
    let validatedData: QuoteFormData;
    try {
      validatedData = quoteSchema.parse(rawData);
      console.log('[createQuoteAction] Validation Zod réussie pour clientId:', validatedData.clientId);
    } catch (zodError) {
      // === DIAGNOSTIC LOGS ERREUR ZOD ===
      console.error('[createQuoteAction] === ERREUR ZOD ===');
      console.error('[createQuoteAction] rawData.clientId au moment de l\'erreur:', rawData.clientId);
      if (zodError instanceof z.ZodError) {
        console.error('[createQuoteAction] Erreurs de validation détaillées:', JSON.stringify(zodError.errors, null, 2));
        // Chercher spécifiquement l'erreur sur clientId
        const clientIdError = zodError.errors.find(e => e.path.includes('clientId'));
        if (clientIdError) {
          console.error('[createQuoteAction] Erreur clientId spécifique:', clientIdError);
        }
      }
      // === FIN DIAGNOSTIC ===
      throw zodError; // Re-lancer pour que le catch externe le gère
    }

    // Si l'utilisateur est CLIENT, vérifier qu'il crée un devis pour sa propre compagnie
    if (canCreateOwn && !canCreateAll) {
      if (!session.user.clientId) {
        return {
          success: false,
          error: 'Votre compte n\'est pas associé à une compagnie',
        };
      }

      if (validatedData.clientId !== session.user.clientId) {
        return {
          success: false,
          error: 'Vous ne pouvez créer des devis que pour votre propre compagnie',
        };
      }
    }

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

    // Générer un numéro de devis unique
    const quoteNumber = await generateQuoteNumber();

    // Date d'expiration du token de suivi : 72h
    // Ce token permet aux visiteurs de suivre leur devis sans compte
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 72);

    // Créer le devis avec les packages (colis détaillés) via Prisma nested create
    // Si des packages sont fournis, les champs plats (weight, cargoType) servent d'agrégats
    // Si aucun package n'est fourni, on crée un package unique depuis les champs plats (rétrocompatibilité)
    //
    // Préparer les données brutes des packages pour le moteur de pricing
    // Si des packages détaillés sont fournis, on les utilise directement
    // Sinon, rétrocompatibilité : on crée un package unique depuis les champs plats du devis
    const rawPackages = packagesData && packagesData.length > 0
      ? packagesData.map((pkg) => ({
          description: pkg.description || null,
          quantity: pkg.quantity ?? 1,
          cargoType: pkg.cargoType,
          weight: pkg.weight,
          length: pkg.length || null,
          width: pkg.width || null,
          height: pkg.height || null,
        }))
      : [{
          description: null,
          quantity: 1,
          cargoType: validatedData.cargoType,
          weight: validatedData.weight,
          length: validatedData.length || null,
          width: validatedData.width || null,
          height: validatedData.height || null,
        }];

    // === Calcul des prix unitaires via le moteur de pricing serveur ===
    // Utilise calculerPrixMultiPackages() pour calculer le VRAI prix par colis,
    // incluant les surcharges cargo spécifiques (FRAGILE +30%, DANGEROUS +50%, etc.)
    // au lieu de la distribution proportionnelle au poids qui les ignorait.
    const pricingResult = await calculerPrixMultiPackages({
      packages: rawPackages.map((pkg) => ({
        description: pkg.description || undefined,
        quantity: pkg.quantity,
        cargoType: pkg.cargoType as CargoTypeForPricing,
        weight: pkg.weight,
        length: pkg.length || undefined,
        width: pkg.width || undefined,
        height: pkg.height || undefined,
      })),
      modeTransport: validatedData.transportMode[0] as 'ROAD' | 'SEA' | 'AIR',
      priorite: (rawData.priority as PriorityType) || 'STANDARD',
      paysOrigine: validatedData.originCountry,
      paysDestination: validatedData.destinationCountry,
    });

    // Le prix autoritatif vient du moteur de pricing serveur (pas du client)
    const serverEstimatedCost = pricingResult.totalPrice;

    // Construire les données de création des packages avec les vrais unitPrice
    const packageCreateData = rawPackages.map((pkg, index) => ({
      ...pkg,
      // Prix unitaire calculé par le moteur (inclut surcharge cargo, EXCLUT surcharge priorité)
      unitPrice: pricingResult.lines[index]?.unitPrice ?? null,
    }));

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        clientId: validatedData.clientId,
        depotId: validatedData.depotId ?? null, // Dépôt Faso Fret (optionnel, fallback sur dépôt par défaut dans les PDFs)
        contactEmail: session.user.email, // Email de l'utilisateur connecté (requis par le schéma)
        originCountry: validatedData.originCountry,
        destinationCountry: validatedData.destinationCountry,
        cargoType: validatedData.cargoType,
        weight: validatedData.weight,
        // Snapshot adresses expéditeur (optionnelles - Pattern Immutable Data)
        originAddress: validatedData.originAddress,
        originCity: validatedData.originCity,
        originPostalCode: validatedData.originPostalCode,
        originContactName: validatedData.originContactName,
        originContactPhone: validatedData.originContactPhone,
        originContactEmail: validatedData.originContactEmail,
        // Snapshot adresses destinataire (optionnelles - Pattern Immutable Data)
        destinationAddress: validatedData.destinationAddress,
        destinationCity: validatedData.destinationCity,
        destinationPostalCode: validatedData.destinationPostalCode,
        destinationContactName: validatedData.destinationContactName,
        destinationContactPhone: validatedData.destinationContactPhone,
        destinationContactEmail: validatedData.destinationContactEmail,
        transportMode: validatedData.transportMode,
        // Prix total calculé par le moteur de pricing serveur (remplace le prix client)
        estimatedCost: serverEstimatedCost,
        currency: validatedData.currency,
        validUntil: new Date(validatedData.validUntil),
        status: validatedData.status || 'DRAFT',
        tokenExpiresAt, // Date d'expiration du token de suivi (requis par le schéma)
        // Création des colis détaillés (nested create Prisma)
        packages: {
          create: packageCreateData,
        },
      },
    });

    // Enregistrer l'événement de création dans l'historique (QuoteLog)
    // Calcul du résumé multi-colis pour enrichir les metadata du log
    const totalPackageCount = packageCreateData.reduce((sum, pkg) => sum + (pkg.quantity ?? 1), 0);
    const packagesSummary = packageCreateData
      .map((pkg) => `${pkg.quantity ?? 1}x ${pkg.description || pkg.cargoType} (${pkg.weight}kg)`)
      .join(' + ');

    await logQuoteCreated({
      quoteId: quote.id,
      changedById: session.user.id,
      notes: `Devis ${quote.quoteNumber} créé`,
      source: 'dashboard',
      packageCount: totalPackageCount,
      packagesSummary,
    });

    // Revalider la liste des devis
    revalidatePath('/dashboard/quotes');

    return {
      success: true,
      data: { id: quote.id, quoteNumber: quote.quoteNumber },
    };
  } catch (error) {
    console.error('Error creating quote:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour créer un devis',
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
      error: 'Une erreur est survenue lors de la création du devis',
    };
  }
}

/**
 * Action : Obtenir la liste des devis
 *
 * Récupère tous les devis avec pagination optionnelle
 * Filtre selon les permissions de l'utilisateur (les CLIENTS ne voient que leurs devis)
 *
 * @param page - Numéro de page (optionnel, défaut: 1)
 * @param limit - Nombre de résultats par page (optionnel, défaut: 10)
 * @param clientId - Filtrer par compagnie (optionnel)
 * @param status - Filtrer par statut (optionnel)
 * @param search - Terme de recherche (numéro devis, client, destination) (optionnel)
 * @returns Liste des devis
 *
 * @permissions 'quotes:read' ou 'quotes:read:own' - Tous les rôles
 */
export async function getQuotesAction(
  page = 1,
  limit = 10,
  clientId?: string,
  status?: string,
  search?: string
) {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'quotes:read' ou 'quotes:read:own'
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Vérifier les permissions
    const canReadAll = hasPermission(userRole, 'quotes:read');
    const canReadOwn = hasPermission(userRole, 'quotes:read:own');

    if (!canReadAll && !canReadOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour consulter les devis',
      };
    }

    // Calculer le skip pour la pagination
    const skip = (page - 1) * limit;

    // Construire les filtres
    // Exclure les devis soft-deleted (deletedAt != null) de la liste normale
    const where: any = { deletedAt: null };

    // Si l'utilisateur est CLIENT, il ne voit que ses propres devis
    if (canReadOwn && !canReadAll) {
      // Si l'utilisateur n'a pas de clientId, retourner une liste vide
      if (!session.user.clientId) {
        return {
          success: true,
          data: {
            quotes: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
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
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { originCountry: { contains: search, mode: 'insensitive' } },
        { destinationCountry: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Récupérer les devis
    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
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
          // Compteur de packages pour affichage résumé dans la liste
          // Retourne quote._count.packages (nombre de lignes de colis)
          _count: {
            select: { packages: true },
          },
        },
      }),
      prisma.quote.count({ where }),
    ]);

    return {
      success: true,
      data: {
        quotes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Error getting quotes:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour consulter les devis',
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
      error: 'Une erreur est survenue lors de la récupération des devis',
    };
  }
}

/**
 * Action : Obtenir un devis par ID
 *
 * Récupère les détails complets d'un devis
 * Les CLIENTS ne peuvent voir que leurs propres devis
 *
 * @param id - ID du devis
 * @returns Données du devis ou erreur
 *
 * @permissions 'quotes:read' ou 'quotes:read:own'
 */
export async function getQuoteAction(id: string) {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'quotes:read' ou 'quotes:read:own'
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Vérifier les permissions
    const canReadAll = hasPermission(userRole, 'quotes:read');
    const canReadOwn = hasPermission(userRole, 'quotes:read:own');

    if (!canReadAll && !canReadOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour consulter ce devis',
      };
    }

    // Récupérer le devis avec toutes les relations
    // Le client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier)
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        user: true,
        // Récupérer la personne ayant confirmé le paiement (si applicable)
        paymentReceivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shipment: {
          select: {
            id: true,
            trackingNumber: true,
          },
        },
        // Récupérer les colis détaillés du devis (QuotePackage)
        // Triés par date de création pour conserver l'ordre d'ajout
        packages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        // Récupérer l'historique complet des événements (QuoteLog)
        logs: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!quote) {
      return {
        success: false,
        error: 'Devis introuvable',
      };
    }

    // Si l'utilisateur est CLIENT, vérifier qu'il peut accéder à ce devis
    if (canReadOwn && !canReadAll) {
      if (session.user.clientId !== quote.clientId) {
        return {
          success: false,
          error: 'Vous n\'avez pas accès à ce devis',
        };
      }
    }

    // Les non-admins ne peuvent pas voir les devis soft-deleted
    // Les admins y accèdent via la vue "Corbeille"
    if (quote.deletedAt && !canReadAll) {
      return {
        success: false,
        error: 'Devis introuvable',
      };
    }

    return { success: true, data: quote };
  } catch (error) {
    console.error('Error getting quote:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour consulter ce devis',
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
      error: 'Une erreur est survenue lors de la récupération du devis',
    };
  }
}

/**
 * Action : Mettre à jour un devis
 *
 * Met à jour les informations d'un devis existant
 * Seuls les devis en DRAFT ou SENT peuvent être modifiés
 *
 * @param id - ID du devis à mettre à jour
 * @param formData - Nouvelles données du devis
 * @returns Résultat de la mise à jour
 *
 * @permissions 'quotes:update' - ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER
 * @permissions 'quotes:update:own' - CLIENT (uniquement ses propres devis en DRAFT)
 */
export async function updateQuoteAction(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     *
     * Deux niveaux de permission :
     * - 'quotes:update' : ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER → peut modifier tout devis
     * - 'quotes:update:own' : CLIENT → peut modifier uniquement ses propres devis en DRAFT
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    const canUpdateAll = hasPermission(userRole, 'quotes:update');
    const canUpdateOwn = hasPermission(userRole, 'quotes:update:own');

    if (!canUpdateAll && !canUpdateOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour modifier un devis',
      };
    }

    // Vérifier que le devis existe
    const existingQuote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!existingQuote) {
      return { success: false, error: 'Devis introuvable' };
    }

    /**
     * Vérification d'ownership pour les utilisateurs CLIENT
     *
     * Si l'utilisateur n'a que la permission 'quotes:update:own' (pas 'quotes:update'),
     * il doit être propriétaire du devis (via clientId) et le devis doit être en DRAFT.
     */
    if (canUpdateOwn && !canUpdateAll) {
      // Vérifier que l'utilisateur est bien associé à un client
      if (!session.user.clientId) {
        return {
          success: false,
          error: 'Votre compte n\'est pas associé à une entreprise',
        };
      }

      // Vérifier que le devis appartient au client de l'utilisateur
      if (existingQuote.clientId !== session.user.clientId) {
        return {
          success: false,
          error: 'Vous n\'avez pas accès à ce devis',
        };
      }

      // Un CLIENT ne peut modifier que ses devis en brouillon (DRAFT)
      if (existingQuote.status !== 'DRAFT') {
        return {
          success: false,
          error: 'Seuls les devis en brouillon peuvent être modifiés par un client',
        };
      }
    }

    // Empêcher la modification si le devis est accepté ou expiré (pour tous les rôles)
    if (existingQuote.status === 'ACCEPTED' || existingQuote.status === 'EXPIRED') {
      return {
        success: false,
        error: 'Un devis accepté ou expiré ne peut pas être modifié',
      };
    }

    // Extraire et valider les données du FormData
    const rawData: any = {};

    // Champs simples (strings) - incluant les adresses expéditeur et destinataire
    const simpleFields = [
      'clientId',
      'originCountry',
      'destinationCountry',
      'cargoType',
      'currency',
      'status',
      'validUntil',
      'acceptedAt',
      'rejectedAt',
      // Priorité de livraison (affecte le prix et le délai)
      'priority',
      // Adresses expéditeur
      'originAddress',
      'originCity',
      'originPostalCode',
      'originContactName',
      'originContactPhone',
      'originContactEmail',
      // Adresses destinataire
      'destinationAddress',
      'destinationCity',
      'destinationPostalCode',
      'destinationContactName',
      'destinationContactPhone',
      'destinationContactEmail',
    ];

    simpleFields.forEach((field) => {
      const value = formData.get(field);
      if (value !== null) {
        // Pour les champs adresse, on garde la chaîne vide ou null
        rawData[field] = value || null;
      }
    });

    // Champs numériques (incluant les dimensions)
    ['weight', 'volume', 'estimatedCost', 'length', 'width', 'height'].forEach((field) => {
      const value = formData.get(field);
      if (value !== null && value !== '') {
        rawData[field] = Number(value);
      }
    });

    // Champs array (modes de transport)
    const transportMode = formData.getAll('transportMode');
    if (transportMode.length > 0) {
      rawData.transportMode = transportMode;
    }

    // ── Extraction des packages (colis détaillés) depuis le FormData ──
    // Les packages sont sérialisés en JSON dans le champ 'packages'
    // Pattern Delete+Recreate : on supprime les anciens packages et on recrée les nouveaux
    // dans une transaction atomique (si la recréation échoue, la suppression est annulée)
    let packagesData: PackageFormData[] | undefined;
    const packagesRaw = formData.get('packages');
    if (packagesRaw && typeof packagesRaw === 'string') {
      try {
        const parsed = JSON.parse(packagesRaw);
        packagesData = packagesArraySchema.parse(parsed);
      } catch (parseError) {
        console.error('[updateQuoteAction] Erreur parsing packages:', parseError);
        // En cas d'erreur de parsing, on continue sans modifier les packages
      }
    }

    const validatedData = quoteUpdateSchema.parse(rawData);

    // Déterminer les champs modifiés en comparant avec les valeurs existantes
    // On collecte les noms des champs envoyés dans le FormData (= champs potentiellement modifiés)
    const changedFields = Object.keys(validatedData).filter((key) => {
      const newVal = validatedData[key as keyof typeof validatedData];
      const oldVal = existingQuote[key as keyof typeof existingQuote];

      // Ignorer les champs non définis dans les nouvelles données
      if (newVal === undefined) return false;

      // Comparer les valeurs (conversion en string pour gérer Date vs string, Decimal vs number)
      return String(newVal ?? '') !== String(oldVal ?? '');
    });

    // Si des packages sont fournis, les ajouter aux champs modifiés pour le log
    if (packagesData) {
      changedFields.push('packages');
    }

    // Mettre à jour le devis + packages dans une transaction atomique
    // Extraction des champs non-persistés et des FK scalaires avant le spread
    // - priority : utilisé uniquement pour le calcul du tarif, pas de colonne en DB
    // - clientId : Prisma update() exige la syntaxe relationnelle client: { connect: { id } }
    // - packages : géré séparément via deleteMany + create (pas un champ Prisma update scalaire)
    const { clientId, priority, packages: _packages, ...restValidatedData } = validatedData;

    const updatedQuote = await prisma.$transaction(async (tx) => {
      // 1. Si des packages sont fournis, supprimer les anciens et créer les nouveaux
      //    Pattern Delete+Recreate : plus simple que l'upsert car useFieldArray
      //    ne conserve pas les IDs serveur des QuotePackage
      if (packagesData && packagesData.length > 0) {
        // Supprimer tous les anciens packages de ce devis
        await tx.quotePackage.deleteMany({
          where: { quoteId: id },
        });

        // === Calcul des prix unitaires via le moteur de pricing serveur ===
        // Résout le problème de la distribution proportionnelle au poids qui ignorait
        // les surcharges cargo spécifiques (FRAGILE +30%, DANGEROUS +50%, etc.)
        // On utilise le mode de transport mis à jour s'il est fourni, sinon celui existant
        const updateTransportMode = (validatedData.transportMode?.[0] || existingQuote.transportMode[0]) as 'ROAD' | 'SEA' | 'AIR';
        const updateOriginCountry = validatedData.originCountry || existingQuote.originCountry;
        const updateDestinationCountry = validatedData.destinationCountry || existingQuote.destinationCountry;

        const updatePricingResult = await calculerPrixMultiPackages({
          packages: packagesData.map((pkg) => ({
            description: pkg.description || undefined,
            quantity: pkg.quantity ?? 1,
            cargoType: pkg.cargoType as CargoTypeForPricing,
            weight: pkg.weight,
            length: pkg.length || undefined,
            width: pkg.width || undefined,
            height: pkg.height || undefined,
          })),
          modeTransport: updateTransportMode,
          priorite: (priority as PriorityType) || 'STANDARD',
          paysOrigine: updateOriginCountry,
          paysDestination: updateDestinationCountry,
        });

        // Persister le prix recalculé par le moteur serveur dans estimatedCost
        restValidatedData.estimatedCost = updatePricingResult.totalPrice;

        await tx.quotePackage.createMany({
          data: packagesData.map((pkg, index) => {
            const qty = pkg.quantity ?? 1;
            return {
              quoteId: id,
              description: pkg.description || null,
              quantity: qty,
              cargoType: pkg.cargoType,
              weight: pkg.weight,
              length: pkg.length || null,
              width: pkg.width || null,
              height: pkg.height || null,
              // Prix unitaire calculé par le moteur (inclut surcharge cargo, EXCLUT surcharge priorité)
              unitPrice: updatePricingResult.lines[index]?.unitPrice ?? null,
            };
          }),
        });
      }

      // 2. Mettre à jour le devis lui-même (champs plats + agrégats)
      return tx.quote.update({
        where: { id },
        data: {
          ...restValidatedData,
          validUntil: validatedData.validUntil
            ? new Date(validatedData.validUntil)
            : undefined,
          acceptedAt: validatedData.acceptedAt
            ? new Date(validatedData.acceptedAt)
            : undefined,
          rejectedAt: validatedData.rejectedAt
            ? new Date(validatedData.rejectedAt)
            : undefined,
          // Relation client : connect si clientId fourni, disconnect si null, ignorer si undefined
          ...(clientId !== undefined
            ? clientId !== null
              ? { client: { connect: { id: clientId } } }
              : { client: { disconnect: true } }
            : {}),
        },
      });
    });

    // Enregistrer l'événement de modification dans l'historique
    // Permet de tracer qui a modifié quoi et quand
    if (changedFields.length > 0) {
      const isClient = canUpdateOwn && !canUpdateAll;
      await logQuoteUpdated({
        quoteId: id,
        changedById: session.user.id,
        changedFields,
        source: isClient ? 'client-portal' : 'dashboard',
        notes: `Devis modifié (${changedFields.length} champ${changedFields.length > 1 ? 's' : ''})`,
      });
    }

    // Revalider les pages
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${id}`);

    return { success: true, data: { id: updatedQuote.id } };
  } catch (error) {
    console.error('Error updating quote:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour modifier ce devis',
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
      error: 'Une erreur est survenue lors de la mise à jour du devis',
    };
  }
}

/**
 * Action : Supprimer un devis (soft delete)
 *
 * Marque le devis comme supprimé (deletedAt) au lieu de le supprimer physiquement.
 * Le devis reste en base de données et peut être restauré par un admin via la Corbeille.
 *
 * Statuts autorisés selon le rôle :
 * - ADMIN / OPERATIONS_MANAGER / FINANCE_MANAGER : DRAFT, SUBMITTED, SENT, REJECTED, EXPIRED, CANCELLED
 * - CLIENT : DRAFT uniquement
 * - Statuts interdits pour tous : ACCEPTED, IN_TREATMENT, VALIDATED (processus métier actif)
 *
 * @param id - ID du devis à mettre à la corbeille
 * @returns Résultat de l'opération
 *
 * @permissions 'quotes:delete' - ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER
 * @permissions 'quotes:delete:own' - CLIENT (uniquement ses propres devis en DRAFT)
 */
export async function deleteQuoteAction(id: string): Promise<ActionResult> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     *
     * Deux niveaux de permission :
     * - 'quotes:delete' : ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER → statuts élargis
     * - 'quotes:delete:own' : CLIENT → DRAFT uniquement
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    const canDeleteAll = hasPermission(userRole, 'quotes:delete');
    const canDeleteOwn = hasPermission(userRole, 'quotes:delete:own');

    if (!canDeleteAll && !canDeleteOwn) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour supprimer un devis',
      };
    }

    // Vérifier que le devis existe et n'est pas déjà supprimé
    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return { success: false, error: 'Devis introuvable' };
    }

    // Ne pas re-supprimer un devis déjà dans la corbeille
    if (quote.deletedAt) {
      return { success: false, error: 'Ce devis est déjà dans la corbeille' };
    }

    /**
     * Vérification d'ownership pour les utilisateurs CLIENT
     *
     * Si l'utilisateur n'a que la permission 'quotes:delete:own' (pas 'quotes:delete'),
     * il doit être propriétaire du devis (via clientId) et le devis doit être en DRAFT.
     */
    if (canDeleteOwn && !canDeleteAll) {
      // Vérifier que l'utilisateur est bien associé à un client
      if (!session.user.clientId) {
        return {
          success: false,
          error: 'Votre compte n\'est pas associé à une entreprise',
        };
      }

      // Vérifier que le devis appartient au client de l'utilisateur
      if (quote.clientId !== session.user.clientId) {
        return {
          success: false,
          error: 'Vous n\'avez pas accès à ce devis',
        };
      }

      // CLIENT : seuls les brouillons peuvent être supprimés
      if (quote.status !== 'DRAFT') {
        return {
          success: false,
          error: 'Seuls les devis en brouillon peuvent être supprimés',
        };
      }
    }

    // ADMIN / Agents : tous les statuts sont autorisés pour le soft delete
    // La seule restriction est le paiement confirmé (vérifiée ci-dessous)
    // Note : le devis reste restaurable par un ADMIN depuis la corbeille

    // Empêcher la suppression si le paiement a été confirmé
    // (une facture peut être générée à partir de ce devis)
    if (quote.paymentReceivedAt) {
      return {
        success: false,
        error: 'Impossible de supprimer un devis dont le paiement a été confirmé',
      };
    }

    // Soft delete : marquer le devis comme supprimé (au lieu de prisma.quote.delete)
    await prisma.quote.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session.user.id,
      },
    });

    // Tracer l'événement dans le QuoteLog pour audit trail
    await logQuoteSoftDeleted({
      quoteId: id,
      changedById: session.user.id,
    });

    // Revalider la liste des devis
    revalidatePath('/dashboard/quotes');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error soft-deleting quote:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour supprimer ce devis',
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
      error: 'Une erreur est survenue lors de la suppression du devis',
    };
  }
}

/**
 * Action : Restaurer un devis depuis la corbeille
 *
 * Remet deletedAt et deletedById à null, rendant le devis visible à nouveau.
 * Réservé aux ADMIN et OPERATIONS_MANAGER.
 *
 * @param id - ID du devis à restaurer
 * @returns Résultat de l'opération
 *
 * @permissions ADMIN, OPERATIONS_MANAGER uniquement
 */
export async function restoreQuoteAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Seuls les ADMIN et OPERATIONS_MANAGER peuvent restaurer
    if (userRole !== 'ADMIN' && userRole !== 'OPERATIONS_MANAGER') {
      return {
        success: false,
        error: 'Seuls les administrateurs et gestionnaires des opérations peuvent restaurer un devis',
      };
    }

    // Vérifier que le devis existe
    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return { success: false, error: 'Devis introuvable' };
    }

    // Vérifier que le devis est bien dans la corbeille
    if (!quote.deletedAt) {
      return { success: false, error: 'Ce devis n\'est pas dans la corbeille' };
    }

    // Restaurer le devis en remettant les champs soft delete à null
    await prisma.quote.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
      },
    });

    // Tracer l'événement de restauration dans le QuoteLog
    await logQuoteRestored({
      quoteId: id,
      changedById: session.user.id,
    });

    // Revalider les pages impactées
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${id}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error restoring quote:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return {
        success: false,
        error: 'Vous devez être connecté pour effectuer cette action',
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la restauration du devis',
    };
  }
}

/**
 * Action : Lister les devis supprimés (corbeille)
 *
 * Récupère les devis marqués comme supprimés (deletedAt != null) avec pagination.
 * Réservé aux ADMIN et OPERATIONS_MANAGER pour la vue "Corbeille".
 *
 * @param page - Numéro de page (défaut: 1)
 * @param limit - Nombre de devis par page (défaut: 20)
 * @returns Liste paginée des devis soft-deleted
 *
 * @permissions ADMIN, OPERATIONS_MANAGER uniquement
 */
export async function getDeletedQuotesAction(page = 1, limit = 20) {
  try {
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Seuls les ADMIN et OPERATIONS_MANAGER accèdent à la corbeille
    if (userRole !== 'ADMIN' && userRole !== 'OPERATIONS_MANAGER') {
      return {
        success: false,
        error: 'Accès réservé aux administrateurs et gestionnaires des opérations',
      };
    }

    const skip = (page - 1) * limit;

    // Récupérer les devis supprimés, triés par date de suppression (plus récent en premier)
    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where: { deletedAt: { not: null } },
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          // Inclure l'utilisateur qui a supprimé le devis
          deletedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: { packages: true },
          },
        },
      }),
      prisma.quote.count({ where: { deletedAt: { not: null } } }),
    ]);

    return {
      success: true,
      data: {
        quotes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Error getting deleted quotes:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return {
        success: false,
        error: 'Vous devez être connecté pour effectuer cette action',
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération des devis supprimés',
    };
  }
}

/**
 * Action : Envoyer un devis au client
 *
 * Passe le devis de SUBMITTED à SENT, le rendant visible et actionnable par le client
 * Le client pourra ensuite accepter ou rejeter le devis depuis son dashboard
 *
 * @param id - ID du devis à envoyer
 * @returns Résultat de l'envoi
 *
 * @permissions 'quotes:update' (ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER)
 *
 * @example
 * // Envoyer un devis au client
 * const result = await sendQuoteAction('clx1234...');
 * if (result.success) {
 *   toast.success('Devis envoyé au client');
 * }
 */
export async function sendQuoteAction(
  id: string
): Promise<ActionResult<{ id: string; quoteNumber: string }>> {
  try {
    // Vérifier l'authentification et les permissions
    const session = await requirePermission('quotes:update');

    // Récupérer le devis
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, email: true } },
      },
    });

    if (!quote) {
      return { success: false, error: 'Devis introuvable' };
    }

    // Vérifier que le devis est en SUBMITTED (soumis par le client, prêt à être envoyé par l'agent)
    if (quote.status !== 'SUBMITTED') {
      return {
        success: false,
        error: 'Seuls les devis soumis peuvent être envoyés au client',
      };
    }

    // Vérifier que le devis a un client associé
    if (!quote.clientId) {
      return {
        success: false,
        error: 'Le devis doit être associé à un client avant d\'être envoyé',
      };
    }

    // Mettre à jour le statut du devis
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'SENT',
        // Note: L'envoi d'email sera implémenté plus tard via Inngest
      },
    });

    console.log(
      `📧 [sendQuote] Devis ${quote.quoteNumber} envoyé au client ${quote.client?.name} par ${session.user.email}`
    );

    // Enregistrer l'événement d'envoi dans l'historique (QuoteLog)
    await logQuoteSentToClient({
      quoteId: quote.id,
      changedById: session.user.id,
      sentTo: quote.client?.email || quote.contactEmail,
      notes: `Devis envoyé au client ${quote.client?.name}`,
    });

    // Revalider les pages
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${id}`);

    return {
      success: true,
      data: { id: updatedQuote.id, quoteNumber: updatedQuote.quoteNumber },
    };
  } catch (error) {
    console.error('Error sending quote:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour envoyer ce devis',
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
      error: 'Une erreur est survenue lors de l\'envoi du devis',
    };
  }
}

/**
 * Action : Accepter un devis
 *
 * Marque un devis comme accepté par le client
 * Change le statut à ACCEPTED et enregistre la date d'acceptation
 *
 * @param id - ID du devis
 * @param acceptData - Données d'acceptation (notes optionnelles)
 * @returns Résultat de l'acceptation
 *
 * @permissions 'quotes:update' ou CLIENT propriétaire du devis
 */
export async function acceptQuoteAction(
  id: string,
  acceptData: QuoteAcceptData
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification
     * Les CLIENTS peuvent accepter leurs propres devis
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Récupérer le devis
    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return { success: false, error: 'Devis introuvable' };
    }

    // Vérifier les permissions
    // Un utilisateur peut accepter un devis s'il a la permission 'quotes:update' OU s'il est propriétaire
    // La propriété peut être via :
    // - clientId : l'utilisateur appartient à la même entreprise cliente que le devis (devis B2B)
    // - userId : l'utilisateur est le propriétaire direct du devis (devis personnels/guest)
    const canUpdate = hasPermission(userRole, 'quotes:update');
    const isOwnerByClient =
      session.user.clientId && session.user.clientId === quote.clientId;
    const isOwnerByUser = session.user.id && session.user.id === quote.userId;
    const isOwner = isOwnerByClient || isOwnerByUser;

    if (!canUpdate && !isOwner) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour accepter ce devis',
      };
    }

    // Vérifier que le devis est en SENT
    if (quote.status !== 'SENT') {
      return {
        success: false,
        error: 'Seuls les devis envoyés peuvent être acceptés',
      };
    }

    // Vérifier que le devis n'est pas expiré
    if (new Date() > quote.validUntil) {
      return {
        success: false,
        error: 'Ce devis est expiré',
      };
    }

    // Valider les données
    const validatedData = quoteAcceptSchema.parse(acceptData);

    // Mettre à jour le devis avec la méthode de paiement choisie par le client
    // La méthode de paiement sera utilisée par les agents lors du traitement
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        // Sauvegarder la méthode de paiement choisie par le client
        // Options : CASH (comptant), ON_DELIVERY (à la livraison), BANK_TRANSFER (virement)
        paymentMethod: validatedData.paymentMethod,
      },
    });

    // Enregistrer l'événement d'acceptation dans l'historique (QuoteLog)
    // Note : on utilise formatPaymentMethod pour afficher le mode de paiement en français
    await logQuoteAcceptedByClient({
      quoteId: quote.id,
      changedById: session.user.id,
      notes: `Devis accepté par le client avec méthode de paiement: ${formatPaymentMethod(validatedData.paymentMethod)}`,
    });

    // Revalider les pages
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error('Error accepting quote:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour accepter ce devis',
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
      error: 'Une erreur est survenue lors de l\'acceptation du devis',
    };
  }
}

/**
 * Action : Rejeter un devis
 *
 * Marque un devis comme rejeté par le client
 * Change le statut à REJECTED et enregistre la raison du rejet
 *
 * @param id - ID du devis
 * @param rejectData - Données de rejet (raison)
 * @returns Résultat du rejet
 *
 * @permissions 'quotes:update' ou CLIENT propriétaire du devis
 */
export async function rejectQuoteAction(
  id: string,
  rejectData: QuoteRejectData
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification
     * Les CLIENTS peuvent rejeter leurs propres devis
     */
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Récupérer le devis
    const quote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      return { success: false, error: 'Devis introuvable' };
    }

    // Vérifier les permissions
    // Un utilisateur peut rejeter un devis s'il a la permission 'quotes:update' OU s'il est propriétaire
    // La propriété peut être via :
    // - clientId : l'utilisateur appartient à la même entreprise cliente que le devis (devis B2B)
    // - userId : l'utilisateur est le propriétaire direct du devis (devis personnels/guest)
    const canUpdate = hasPermission(userRole, 'quotes:update');
    const isOwnerByClient =
      session.user.clientId && session.user.clientId === quote.clientId;
    const isOwnerByUser = session.user.id && session.user.id === quote.userId;
    const isOwner = isOwnerByClient || isOwnerByUser;

    if (!canUpdate && !isOwner) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour rejeter ce devis',
      };
    }

    // Vérifier que le devis est en SENT
    if (quote.status !== 'SENT') {
      return {
        success: false,
        error: 'Seuls les devis envoyés peuvent être rejetés',
      };
    }

    // Valider les données
    const validatedData = quoteRejectSchema.parse(rejectData);

    // Mettre à jour le devis
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
      },
    });

    // Enregistrer l'événement de rejet dans l'historique (QuoteLog)
    // Permet de tracer le rejet du devis par le client
    await logQuoteRejectedByClient({
      quoteId: id,
      changedById: session.user.id,
      reason: validatedData.reason,
      notes: validatedData.reason || 'Devis rejeté par le client',
    });

    // Revalider les pages
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error('Error rejecting quote:', error);

    // Gestion des erreurs de permissions
    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Vous n\'avez pas les permissions nécessaires pour rejeter ce devis',
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
      error: 'Une erreur est survenue lors du rejet du devis',
    };
  }
}

/**
 * Mapping des noms de pays complets vers codes ISO
 * Utilisé pour convertir les noms de pays en codes pour la recherche de distance
 */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'France': 'FR',
  'Allemagne': 'DE',
  'Espagne': 'ES',
  'Italie': 'IT',
  'Belgique': 'BE',
  'Pays-Bas': 'NL',
  'Royaume-Uni': 'GB',
  'Pologne': 'PL',
  'États-Unis': 'US',
  'Chine': 'CN',
  'Japon': 'JP',
  'Australie': 'AU',
  'Brésil': 'BR',
  'Canada': 'CA',
  'Inde': 'IN',
  'Afrique du Sud': 'ZA',
  'Maroc': 'MA',
  'Algérie': 'DZ',
  'Tunisie': 'TN',
  'Côte d\'Ivoire': 'CI',
  'Sénégal': 'SN',
};

/**
 * Fonction helper pour obtenir la distance entre deux pays
 * Utilise la configuration dynamique des distances depuis la base de données
 *
 * Stratégie :
 * 1. Convertir les noms de pays en codes ISO
 * 2. Récupérer la distance depuis la base de données (avec cache)
 * 3. Fallback aux valeurs par défaut si non trouvée
 *
 * @param origin - Pays d'origine (nom complet ou code ISO)
 * @param destination - Pays de destination (nom complet ou code ISO)
 * @returns Distance en kilomètres
 */
async function getDistance(origin: string, destination: string): Promise<number> {
  // Import dynamique pour éviter les dépendances circulaires
  const { getCountryDistance } = await import('@/modules/pricing-config');

  // Nettoyer et convertir en code ISO si nécessaire
  const cleanOrigin = origin.trim();
  const cleanDestination = destination.trim();

  // Convertir en code ISO si c'est un nom complet
  const originCode = COUNTRY_NAME_TO_ISO[cleanOrigin] || cleanOrigin.toUpperCase().substring(0, 2);
  const destinationCode = COUNTRY_NAME_TO_ISO[cleanDestination] || cleanDestination.toUpperCase().substring(0, 2);

  // Récupérer la distance depuis la configuration
  return getCountryDistance(originCode, destinationCode);
}

/**
 * Action : Calculer une estimation de devis (publique)
 *
 * Calcule un prix estimatif pour un transport sans authentification requise
 * Utilisée par le calculateur sur la page d'accueil
 *
 * Logique de calcul :
 * 1. Coût de base par kg : 0.50 EUR/kg
 * 2. Facteur de distance : distance / 1000 * coût de base
 * 3. Multiplicateur par mode de transport :
 *    - ROAD (Routier) : x1.0
 *    - SEA (Maritime) : x0.6 (moins cher)
 *    - AIR (Aérien) : x3.0 (plus cher)
 * 4. Supplément type de marchandise :
 *    - GENERAL : +0%
 *    - DANGEROUS (Dangereux) : +50%
 *    - PERISHABLE (Périssable) : +40%
 *    - FRAGILE : +30%
 *    - BULK (Vrac) : -10%
 *    - CONTAINER : +20%
 *    - PALLETIZED (Palettisé) : +15%
 *    - OTHER : +10%
 * 5. Supplément priorité :
 *    - STANDARD : +0%
 *    - URGENT : +30%
 * 6. Poids volumétrique : Si volume fourni, calculer poids volumétrique
 *    (volume_m3 * 200) et prendre le max entre poids réel et poids volumétrique
 *
 * @param data - Données du formulaire d'estimation
 * @returns Résultat du calcul avec coût estimé et détails
 *
 * @permissions Aucune - Action publique
 */
export async function calculateQuoteEstimateAction(
  data: unknown
): Promise<ActionResult<import('../schemas/quote.schema').QuoteEstimateResult>> {
  try {
    // Importer le schéma, les types et la configuration
    const { quoteEstimateSchema } = await import('../schemas/quote.schema');
    const { getPricingConfig } = await import('@/modules/pricing-config');
    const { getTransportRate } = await import('@/modules/transport-rates');

    // Récupérer la configuration dynamique des prix
    const config = await getPricingConfig();

    // Valider les données
    const validatedData = quoteEstimateSchema.parse(data);

    // === 1. Calculer le volume à partir des dimensions ===
    const volume =
      validatedData.length && validatedData.width && validatedData.height
        ? validatedData.length * validatedData.width * validatedData.height
        : 0;

    // === 2. NOUVEAU : Chercher le tarif spécifique pour cette route ===
    const primaryTransportMode = validatedData.transportMode[0];

    // Convertir les noms de pays en codes ISO
    const originCode = COUNTRY_NAME_TO_ISO[validatedData.originCountry] || validatedData.originCountry;
    const destCode = COUNTRY_NAME_TO_ISO[validatedData.destinationCountry] || validatedData.destinationCountry;

    const transportRate = await getTransportRate(
      originCode,
      destCode,
      primaryTransportMode
    );

    // === 3. Déterminer les tarifs à utiliser (route ou défaut) ===
    let ratePerKg: number;
    let ratePerM3: number;
    let cargoSurcharges: any;
    let prioritySurcharges: any;
    let usedDefaultRate = false;

    if (transportRate && transportRate.isActive) {
      // ROUTE CONFIGURÉE : Utiliser les tarifs spécifiques
      ratePerKg = transportRate.ratePerKg;
      ratePerM3 = transportRate.ratePerM3;

      // Surcharges : utiliser celles de la route si définies, sinon globales
      cargoSurcharges = transportRate.cargoTypeSurcharges || config.cargoTypeSurcharges;
      prioritySurcharges = transportRate.prioritySurcharges || config.prioritySurcharges;
    } else {
      // ROUTE NON CONFIGURÉE : Utiliser les tarifs directs depuis config.transportMultipliers
      //
      // ⚠️ IMPORTANT — Sémantique de transportMultipliers après refactoring :
      //   ROAD / AIR → valeur en €/kg  (ex: ROAD = 1.0 €/kg, AIR = 3.0 €/kg)
      //   SEA        → valeur en €/m³  (ex: SEA = 120.0 €/m³, facturation volumétrique)
      //
      // config.defaultRatePerKg / defaultRatePerM3 n'existent plus dans PricingConfigData
      // → les utiliser produisait NaN (undefined × number = NaN)
      const directRate = config.transportMultipliers[primaryTransportMode] ?? 1.0;

      if (primaryTransportMode === 'SEA') {
        // Maritime : facturation à la mesure (m³), pas au poids
        ratePerKg = 0;
        ratePerM3 = directRate;
      } else {
        // Routier / Aérien : facturation au poids (kg)
        ratePerKg = directRate;
        ratePerM3 = 0;
      }
      cargoSurcharges = config.cargoTypeSurcharges;
      prioritySurcharges = config.prioritySurcharges;
      usedDefaultRate = true;

      console.log(
        `[calculateQuoteEstimateAction] Aucun tarif configuré pour ${originCode}→${destCode} ${primaryTransportMode},`,
        `utilisation du tarif par défaut: ${directRate}`
      );
    }

    // === 4. Calcul du prix de base : MAX(poids × ratePerKg, volume × ratePerM3) ===
    const weightCost = validatedData.weight * ratePerKg;
    const volumeCost = volume * ratePerM3;
    const baseCost = Math.max(weightCost, volumeCost);

    // === 5. Supplément type de marchandise ===
    const cargoSurchargeRate = cargoSurcharges[validatedData.cargoType] || 0;
    const cargoTypeSurcharge = baseCost * cargoSurchargeRate;

    // === 6. Supplément priorité ===
    const priority = validatedData.priority || 'STANDARD';
    const prioritySurchargeRate = prioritySurcharges[priority] || 0;
    const prioritySurcharge = baseCost * prioritySurchargeRate;

    // === 7. Coût total estimé ===
    const estimatedCost = Math.round(baseCost + cargoTypeSurcharge + prioritySurcharge);

    // === 8. Estimation du délai de livraison (en jours) ===
    // Basé sur le mode de transport et les délais configurés
    const deliverySpeed = config.deliverySpeedsPerMode[primaryTransportMode];

    // Calculer la distance (utilisée uniquement pour varier le délai entre min et max)
    const distance = await getDistance(
      validatedData.originCountry,
      validatedData.destinationCountry
    );

    // Calculer un délai basé sur la distance et les limites configurées
    const distanceRatio = Math.min(distance / 10000, 1); // Normaliser sur 10000 km max
    let estimatedDeliveryDays = Math.round(
      deliverySpeed.min + (deliverySpeed.max - deliverySpeed.min) * distanceRatio
    );

    // Ajuster selon la priorité
    if (priority === 'URGENT') {
      estimatedDeliveryDays = Math.ceil(estimatedDeliveryDays * 0.5); // -50%
    }

    // Minimum 1 jour
    if (estimatedDeliveryDays < 1) estimatedDeliveryDays = 1;

    // === 9. Calculer le coût de base SANS le multiplicateur de transport ===
    // Pour montrer au client l'impact du mode de transport
    const baseRatePerKg = usedDefaultRate ? config.defaultRatePerKg : ratePerKg / (config.transportMultipliers[primaryTransportMode] || 1.0);
    const baseRatePerM3 = usedDefaultRate ? config.defaultRatePerM3 : ratePerM3 / (config.transportMultipliers[primaryTransportMode] || 1.0);

    const baseWeightCost = validatedData.weight * baseRatePerKg;
    const baseVolumeCost = volume * baseRatePerM3;
    const baseCostWithoutTransport = Math.max(baseWeightCost, baseVolumeCost);

    // Coût ajouté par le mode de transport (différence entre avec et sans multiplicateur)
    const transportModeCost = Math.round(baseCost - baseCostWithoutTransport);

    // Facteur distance (pour l'instant 0, mais pourrait être calculé selon la distance)
    const distanceFactor = 0;

    // === 10. Retourner le résultat ===
    return {
      success: true,
      data: {
        estimatedCost,
        currency: 'EUR',
        breakdown: {
          baseCost: Math.round(baseCostWithoutTransport),
          transportModeCost,
          cargoTypeSurcharge: Math.round(cargoTypeSurcharge),
          prioritySurcharge: Math.round(prioritySurcharge),
          distanceFactor,
        },
        estimatedDeliveryDays,
      },
    };
  } catch (error) {
    console.error('Error calculating quote estimate:', error);

    // Gestion des erreurs de validation Zod
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        error: 'Données invalides. Veuillez vérifier tous les champs.',
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors du calcul de l\'estimation',
    };
  }
}

/**
 * Action : Sauvegarder un devis depuis le calculateur
 *
 * Crée un nouveau devis dans l'espace client de l'utilisateur connecté
 * à partir des données du calculateur de devis
 *
 * @param data - Données du devis calculé
 * @returns Résultat avec ID et numéro de devis créé ou erreur
 *
 * @permissions Utilisateur authentifié avec une company
 */
export async function saveQuoteFromCalculatorAction(
  data: unknown
): Promise<ActionResult<{ id: string; quoteNumber: string }>> {
  try {
    // Importer le schéma
    const { quoteEstimateSchema } = await import('../schemas/quote.schema');

    // Vérifier l'authentification
    const session = await requireAuth();

    // Valider les données
    const validatedData = quoteEstimateSchema.parse(data);

    // Calculer l'estimation pour obtenir le coût
    const estimation = await calculateQuoteEstimateAction(data);

    if (!estimation.success || !estimation.data) {
      return {
        success: false,
        error: 'Erreur lors du calcul de l\'estimation',
      };
    }

    // Générer un numéro de devis unique
    const quoteNumber = await generateQuoteNumber();

    // Date de validité : 30 jours par défaut
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    // Date d'expiration du token de suivi : 72h
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 72);

    // Vérifier que estimatedCost est un nombre valide (pas NaN ni Infinity)
    // Peut arriver si aucun tarif n'est configuré pour la route et que le fallback échoue
    const estimatedCost = estimation.data.estimatedCost;
    if (!isFinite(estimatedCost) || isNaN(estimatedCost)) {
      return {
        success: false,
        error: 'Impossible de calculer le tarif pour cette route. Contactez notre équipe.',
      };
    }

    // Créer le devis en DRAFT
    // - user/client : via relation Prisma (connect) — userId scalaire non exposé directement
    // - isAttachedToAccount : true car créé par un utilisateur authentifié
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        // Prisma attend la syntaxe relation { connect } et non le scalaire userId directement
        user: { connect: { id: session.user.id } },
        ...(session.user.clientId
          ? { client: { connect: { id: session.user.clientId } } }
          : {}),
        contactEmail: session.user.email,
        contactName: session.user.name ?? null,
        isAttachedToAccount: true,
        originCountry: validatedData.originCountry,
        destinationCountry: validatedData.destinationCountry,
        cargoType: validatedData.cargoType,
        weight: validatedData.weight,
        transportMode: validatedData.transportMode,
        estimatedCost,
        currency: 'EUR',
        validUntil,
        tokenExpiresAt,
        status: 'DRAFT',
      },
    });

    // Revalider la liste des devis
    revalidatePath('/dashboard/quotes');

    return {
      success: true,
      data: { id: quote.id, quoteNumber: quote.quoteNumber },
    };
  } catch (error) {
    console.error('[saveQuoteFromCalculatorAction] Erreur:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
    });

    // Gestion des erreurs
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Vous devez être connecté pour sauvegarder un devis',
        };
      }

      if (error.name === 'ZodError') {
        return {
          success: false,
          error: 'Données invalides',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la sauvegarde du devis',
    };
  }
}

/**
 * Compter les devis en attente de validation
 *
 * Compte les devis avec statut SENT créés par des utilisateurs CLIENT
 * qui nécessitent une validation par les ADMIN/MANAGERS
 *
 * @returns Nombre de devis en attente
 */
export async function countPendingQuotesAction(): Promise<ActionResult<number>> {
  try {
    const session = await requireAuth();

    // Seuls les ADMIN et MANAGERS peuvent voir les notifications
    const canSeeNotifications = hasPermission(
      session.user.role as UserRole,
      'quotes',
      'read'
    );

    if (!canSeeNotifications) {
      return { success: true, data: 0 };
    }

    // Compter les devis SENT créés par des CLIENTs
    const count = await prisma.quote.count({
      where: {
        status: 'SENT',
        // Récupérer les devis créés par des utilisateurs avec rôle CLIENT
        client: {
          users: {
            some: {
              role: 'CLIENT',
            },
          },
        },
      },
    });

    return { success: true, data: count };
  } catch (error) {
    console.error('Error counting pending quotes:', error);
    return { success: false, error: 'Erreur lors du comptage des devis' };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIONS WORKFLOW AGENT - Traitement des devis
// ════════════════════════════════════════════════════════════════════════════

/**
 * Action : Démarrer le traitement d'un devis par un agent
 *
 * Workflow :
 * 1. Vérification des permissions (ADMIN ou OPERATIONS_MANAGER)
 * 2. Validation des données (méthode de paiement, commentaire)
 * 3. Mise à jour du statut vers IN_TREATMENT
 * 4. Enregistrement de l'agent traitant et des dates
 * 5. Si virement bancaire → déclenche l'envoi d'email RIB (via Inngest)
 *
 * @param quoteId - ID du devis à traiter
 * @param data - Données de traitement (paymentMethod, comment)
 * @returns Résultat avec les données du devis mis à jour ou erreur
 *
 * @permissions ADMIN, OPERATIONS_MANAGER
 *
 * @example
 * // Démarrer le traitement avec paiement par virement
 * const result = await startQuoteTreatmentAction('cuid123', {
 *   paymentMethod: 'BANK_TRANSFER',
 *   comment: 'Client contacté par téléphone',
 * });
 */
export async function startQuoteTreatmentAction(
  quoteId: string,
  data: QuoteStartTreatmentData
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    // 1. Vérifier l'authentification
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // 2. Vérifier les permissions (ADMIN ou OPERATIONS_MANAGER)
    const canTreatQuotes =
      userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER';

    if (!canTreatQuotes) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour traiter ce devis',
      };
    }

    // 3. Valider les données avec le schéma Zod
    const validatedData = quoteStartTreatmentSchema.parse(data);

    // 4. Récupérer le devis existant
    // Le client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier)
    const existingQuote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: {
          include: {
            users: {
              where: { role: 'CLIENT' },
              take: 1,
            },
          },
        },
      },
    });

    if (!existingQuote) {
      return {
        success: false,
        error: 'Devis introuvable',
      };
    }

    // 5. Vérifier que le statut permet le traitement
    // L'agent ne peut traiter un devis que si le client l'a accepté (statut ACCEPTED)
    // Cela garantit que le client a donné son consentement et choisi sa méthode de paiement
    // Workflow : DRAFT → SENT → ACCEPTED → IN_TREATMENT → VALIDATED
    if (existingQuote.status !== 'ACCEPTED') {
      return {
        success: false,
        error: 'Impossible de traiter ce devis. Le client doit d\'abord accepter le devis avant qu\'un agent puisse le traiter.',
      };
    }

    // 6. Mettre à jour le devis avec le nouveau statut
    // NOTE : La méthode de paiement n'est PAS modifiée ici - elle a été définie par le client
    // lors de l'acceptation et seul le client (owner) ou un ADMIN peut la modifier
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'IN_TREATMENT',
        agentComment: validatedData.comment,
        treatmentStartedAt: new Date(),
        // Syntaxe relationnelle Prisma : connect l'agent qui traite le devis
        treatmentAgent: { connect: { id: session.user.id } },
      },
    });

    // 7. Si virement bancaire (choisi par le client), déclencher l'envoi d'email RIB
    // TODO: Intégration Inngest pour l'envoi d'email
    if (existingQuote.paymentMethod === 'BANK_TRANSFER') {
      console.log(
        `[QUOTE TREATMENT] Virement bancaire choisi par le client pour le devis ${existingQuote.quoteNumber}. Email RIB à envoyer.`
      );
      // L'intégration Inngest sera ajoutée ultérieurement
    }

    // 8. Enregistrer l'événement de prise en charge dans l'historique (QuoteLog)
    // Permet de tracer quel agent a pris en charge le devis et quand
    await logQuoteTreatmentStarted({
      quoteId: quoteId,
      changedById: session.user.id,
      notes: validatedData.comment || `Devis pris en charge par l'agent`,
    });

    // 9. Revalider les caches
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${quoteId}`);

    return {
      success: true,
      data: {
        id: updatedQuote.id,
        status: updatedQuote.status,
      },
    };
  } catch (error) {
    console.error('Error starting quote treatment:', error);

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return {
          success: false,
          error: 'Données invalides',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors du démarrage du traitement',
    };
  }
}

/**
 * Générer un numéro de suivi unique pour les expéditions
 *
 * Format: {PAYS_DEST}-{CODE3}-{JJAA}-{SEQUENCE5}
 * Exemple: BF-XK7-1425-00042
 *
 * Composants :
 * - PAYS_DEST : Code pays destination ISO 3166-1 alpha-2 (ex: BF, FR, US)
 * - CODE3 : Code aléatoire de 3 caractères alphanumériques pour unicité
 * - JJAA : Jour (2 chiffres) + Année (2 derniers chiffres)
 * - SEQUENCE5 : Numéro séquentiel sur 5 chiffres (compteur journalier par pays)
 *
 * @param destinationCountry - Code pays de destination (ex: "BF", "FR")
 * @returns Numéro de suivi unique
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
 * Action : Valider le traitement d'un devis et créer l'expédition
 *
 * Workflow :
 * 1. Vérification des permissions (ADMIN ou OPERATIONS_MANAGER)
 * 2. Validation des données (adresses, description, etc.)
 * 3. Création automatique de l'expédition (Shipment)
 * 4. Liaison devis ↔ expédition
 * 5. Mise à jour du statut vers VALIDATED
 *
 * @param quoteId - ID du devis à valider
 * @param data - Données de validation (adresses, description, etc.)
 * @returns Résultat avec les données du devis et de l'expédition créée
 *
 * @permissions ADMIN, OPERATIONS_MANAGER
 *
 * @example
 * // Valider le traitement et créer l'expédition
 * const result = await validateQuoteTreatmentAction('cuid123', {
 *   destinationAddress: '123 Rue de Paris',
 *   destinationCity: 'Paris',
 *   destinationPostalCode: '75001',
 *   packageCount: 2,
 * });
 */
export async function validateQuoteTreatmentAction(
  quoteId: string,
  data: QuoteValidateTreatmentData
): Promise<
  ActionResult<{ quoteId: string; shipmentId: string; trackingNumber: string }>
> {
  try {
    // 1. Vérifier l'authentification
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // 2. Vérifier les permissions (ADMIN ou OPERATIONS_MANAGER)
    const canValidateQuotes =
      userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER';

    if (!canValidateQuotes) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour valider ce devis',
      };
    }

    // 3. Valider les données avec le schéma Zod
    const validatedData = quoteValidateTreatmentSchema.parse(data);

    // 4. Récupérer le devis existant avec les informations nécessaires
    // Le client peut être de type COMPANY (entreprise) ou INDIVIDUAL (particulier)
    // Les packages sont chargés pour être copiés vers ShipmentPackage
    const existingQuote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: {
          include: {
            users: {
              where: { role: 'CLIENT' },
              take: 1,
            },
          },
        },
        // Charger les colis détaillés pour les copier vers ShipmentPackage
        packages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!existingQuote) {
      return {
        success: false,
        error: 'Devis introuvable',
      };
    }

    // 5. Vérifier que le statut permet la validation
    // On ne peut valider qu'un devis IN_TREATMENT
    if (existingQuote.status !== 'IN_TREATMENT') {
      return {
        success: false,
        error: `Impossible de valider un devis avec le statut "${existingQuote.status}". Le devis doit être en cours de traitement (IN_TREATMENT).`,
      };
    }

    // 6. Si pas de client associé, vérifier que les informations de contact sont disponibles
    // Le modèle Shipment accepte désormais clientId optionnel
    // Dans ce cas, on utilise les informations de contact du devis (contactEmail, contactName)
    if (!existingQuote.clientId && !existingQuote.contactEmail) {
      return {
        success: false,
        error: 'Impossible de valider ce devis : aucun client associé et pas d\'email de contact. Le devis doit avoir un client ou des informations de contact.',
      };
    }

    // 7. Générer un numéro de suivi pour l'expédition (avec pays destination)
    const trackingNumber = await generateTrackingNumber(existingQuote.destinationCountry);

    // 8. Récupérer les informations du client pour les adresses par défaut
    const clientUser = existingQuote.client?.users?.[0];
    const companyName = existingQuote.client?.name || 'Client';

    // 9. Calculer le nombre total de colis depuis les QuotePackage
    // Si des packages existent → somme des quantités, sinon fallback sur la valeur saisie par l'agent
    const calculatedPackageCount = existingQuote.packages && existingQuote.packages.length > 0
      ? existingQuote.packages.reduce((sum, pkg) => sum + pkg.quantity, 0)
      : validatedData.packageCount || 1;

    // 10. Créer l'expédition + copier les packages (transaction pour assurer l'intégrité)
    const result = await prisma.$transaction(async (tx) => {
      // Créer l'expédition liée au client du devis (optionnel)
      // Si pas de client, on utilise les informations de contact du devis
      const shipment = await tx.shipment.create({
        data: {
          trackingNumber,
          // clientId peut être null si l'expéditeur n'est pas un client enregistré
          clientId: existingQuote.clientId || null,

          // Origine - Pattern Snapshot : Copie depuis Quote
          // Ordre de priorité : 1) Agent override, 2) Snapshot Quote, 3) Défaut
          originAddress:
            validatedData.originAddress || existingQuote.originAddress || 'Adresse à compléter',
          originCity:
            validatedData.originCity || existingQuote.originCity || 'Ville à compléter',
          originPostalCode:
            validatedData.originPostalCode || existingQuote.originPostalCode || '00000',
          originCountry: existingQuote.originCountry,
          originContact:
            validatedData.originContact || existingQuote.originContactName || existingQuote.contactName || 'Contact à définir',
          originEmail:
            existingQuote.originContactEmail || existingQuote.contactEmail, // Email de l'expéditeur depuis le snapshot Quote
          originPhone:
            validatedData.originPhone || existingQuote.originContactPhone || existingQuote.contactPhone,

          // Destination - Pattern Snapshot : Copie depuis Quote
          // Ordre de priorité : 1) Agent override, 2) Snapshot Quote, 3) Client info, 4) Défaut
          destinationAddress:
            validatedData.destinationAddress || existingQuote.destinationAddress || 'Adresse à compléter',
          destinationCity:
            validatedData.destinationCity || existingQuote.destinationCity || 'Ville à compléter',
          destinationPostalCode:
            validatedData.destinationPostalCode || existingQuote.destinationPostalCode || '00000',
          destinationCountry: existingQuote.destinationCountry,
          destinationContact:
            validatedData.destinationContact || existingQuote.destinationContactName || clientUser?.name || companyName,
          destinationEmail:
            validatedData.destinationEmail || existingQuote.destinationContactEmail || clientUser?.email || existingQuote.client?.email,
          destinationPhone:
            validatedData.destinationPhone || existingQuote.destinationContactPhone || clientUser?.phone,

          // Détails marchandise (agrégats depuis le devis)
          cargoType: existingQuote.cargoType,
          weight: existingQuote.weight,
          length: existingQuote.length,
          width: existingQuote.width,
          height: existingQuote.height,
          // packageCount calculé automatiquement depuis QuotePackage[].quantity
          packageCount: calculatedPackageCount,
          description:
            validatedData.cargoDescription ||
            `Expédition issue du devis ${existingQuote.quoteNumber}`,
          specialInstructions: validatedData.specialInstructions,

          // Transport
          transportMode: existingQuote.transportMode,
          priority: 'STANDARD',

          // Financier
          estimatedCost: existingQuote.estimatedCost,
          currency: existingQuote.currency,

          // Statut initial : PENDING_APPROVAL = "Enregistré" dans le workflow agent
          status: 'PENDING_APPROVAL',

          // Métadonnées
          createdById: session.user.id,
        },
      });

      // Copier les QuotePackage → ShipmentPackage
      // Chaque ligne de colis du devis est dupliquée dans l'expédition
      // avec le prix unitaire figé au moment de la validation (snapshot)
      if (existingQuote.packages && existingQuote.packages.length > 0) {
        await tx.shipmentPackage.createMany({
          data: existingQuote.packages.map((pkg) => ({
            shipmentId: shipment.id,
            description: pkg.description,
            quantity: pkg.quantity,
            cargoType: pkg.cargoType,
            weight: pkg.weight,
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            // Snapshot du prix unitaire calculé au moment du devis
            unitPrice: pkg.unitPrice,
          })),
        });
      }

      // Mettre à jour le devis avec le lien vers l'expédition
      const updatedQuote = await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: 'VALIDATED',
          treatmentValidatedAt: new Date(),
          // Syntaxe relationnelle Prisma : connect l'expédition créée au devis
          shipment: { connect: { id: shipment.id } },
          agentComment: validatedData.comment
            ? `${existingQuote.agentComment || ''}\n[Validation] ${validatedData.comment}`.trim()
            : existingQuote.agentComment,
        },
      });

      return { shipment, updatedQuote };
    });

    // 10. Enregistrer l'événement de création dans l'historique (ShipmentLog)
    // Cela permet de tracer l'origine de l'expédition et l'agent qui l'a créée
    // Le packageCount enrichit le log pour la timeline multi-colis
    await logShipmentCreated({
      shipmentId: result.shipment.id,
      changedById: session.user.id,
      initialStatus: ShipmentStatus.PENDING_APPROVAL,
      notes: `Expédition créée depuis le devis ${existingQuote.quoteNumber}`,
      metadata: {
        source: 'quote',
        quoteId: existingQuote.id,
        packageCount: calculatedPackageCount,
      },
    });

    // 11. Enregistrer l'événement de validation dans l'historique (QuoteLog)
    // Permet de tracer la validation du devis et la création de l'expédition associée
    // Le packageCount enrichit le log pour la timeline multi-colis
    await logQuoteTreatmentValidated({
      quoteId: quoteId,
      changedById: session.user.id,
      shipmentId: result.shipment.id,
      notes: validatedData.comment || `Devis validé - Expédition ${result.shipment.trackingNumber} créée`,
      packageCount: calculatedPackageCount,
    });

    // 12. Revalider les caches
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${quoteId}`);
    revalidatePath('/dashboard/shipments');
    revalidatePath(`/dashboard/shipments/${result.shipment.id}`);

    return {
      success: true,
      data: {
        quoteId: result.updatedQuote.id,
        shipmentId: result.shipment.id,
        trackingNumber: result.shipment.trackingNumber,
      },
    };
  } catch (error) {
    console.error('Error validating quote treatment:', error);

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return {
          success: false,
          error: 'Données invalides',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la validation du traitement',
    };
  }
}

/**
 * Action : Annuler un devis
 *
 * Workflow :
 * 1. Vérification des permissions (ADMIN ou OPERATIONS_MANAGER)
 * 2. Validation de la raison d'annulation
 * 3. Mise à jour du statut vers CANCELLED
 * 4. Enregistrement de la date et raison d'annulation
 *
 * @param quoteId - ID du devis à annuler
 * @param data - Données d'annulation (raison obligatoire)
 * @returns Résultat avec confirmation ou erreur
 *
 * @permissions ADMIN, OPERATIONS_MANAGER
 *
 * @example
 * // Annuler un devis
 * const result = await cancelQuoteAction('cuid123', {
 *   reason: 'Client ne répond plus depuis 30 jours',
 * });
 */
export async function cancelQuoteAction(
  quoteId: string,
  data: QuoteCancelData
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    // 1. Vérifier l'authentification
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // 2. Vérifier les permissions (ADMIN ou OPERATIONS_MANAGER)
    const canCancelQuotes =
      userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER';

    if (!canCancelQuotes) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour annuler ce devis',
      };
    }

    // 3. Valider les données avec le schéma Zod
    const validatedData = quoteCancelSchema.parse(data);

    // 4. Récupérer le devis existant
    const existingQuote = await prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!existingQuote) {
      return {
        success: false,
        error: 'Devis introuvable',
      };
    }

    // 5. Vérifier que le statut permet l'annulation
    // On ne peut pas annuler un devis déjà validé ou déjà annulé
    const forbiddenStatuses = ['VALIDATED', 'CANCELLED'];
    if (forbiddenStatuses.includes(existingQuote.status)) {
      return {
        success: false,
        error: `Impossible d'annuler un devis avec le statut "${existingQuote.status}".`,
      };
    }

    // 6. Mettre à jour le devis avec le statut CANCELLED
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: validatedData.reason,
        // Syntaxe relationnelle Prisma : connect l'agent qui a annulé le devis
        // Utilise l'agent de traitement existant ou l'utilisateur courant
        treatmentAgent: { connect: { id: existingQuote.treatmentAgentId || session.user.id } },
      },
    });

    // 7. Enregistrer l'événement d'annulation dans l'historique (QuoteLog)
    // Permet de tracer qui a annulé le devis et pour quelle raison
    await logQuoteCancelled({
      quoteId: quoteId,
      changedById: session.user.id,
      reason: validatedData.reason,
      notes: `Devis annulé: ${validatedData.reason}`,
    });

    // 8. Revalider les caches
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${quoteId}`);

    return {
      success: true,
      data: {
        id: updatedQuote.id,
        status: updatedQuote.status,
      },
    };
  } catch (error) {
    console.error('Error cancelling quote:', error);

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return {
          success: false,
          error: 'Données invalides',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de l\'annulation du devis',
    };
  }
}

/**
 * Compter les devis en attente de traitement par un agent
 *
 * Compte les devis avec statut SENT ou ACCEPTED qui nécessitent
 * un traitement par un ADMIN ou OPERATIONS_MANAGER
 *
 * @returns Nombre de devis en attente de traitement
 */
export async function countQuotesAwaitingTreatmentAction(): Promise<
  ActionResult<number>
> {
  try {
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Seuls les ADMIN et OPERATIONS_MANAGER peuvent voir cette notification
    const canSeeNotifications =
      userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER';

    if (!canSeeNotifications) {
      return { success: true, data: 0 };
    }

    // Compter les devis SENT ou ACCEPTED (en attente de traitement)
    const count = await prisma.quote.count({
      where: {
        status: {
          in: ['SENT', 'ACCEPTED'],
        },
      },
    });

    return { success: true, data: count };
  } catch (error) {
    console.error('Error counting quotes awaiting treatment:', error);
    return { success: false, error: 'Erreur lors du comptage des devis' };
  }
}

/**
 * Compter les devis en cours de traitement
 *
 * Compte les devis avec statut IN_TREATMENT
 *
 * @returns Nombre de devis en cours de traitement
 */
export async function countQuotesInTreatmentAction(): Promise<
  ActionResult<number>
> {
  try {
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // Seuls les ADMIN et OPERATIONS_MANAGER peuvent voir cette notification
    const canSeeNotifications =
      userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER';

    if (!canSeeNotifications) {
      return { success: true, data: 0 };
    }

    // Compter les devis IN_TREATMENT
    const count = await prisma.quote.count({
      where: {
        status: 'IN_TREATMENT',
      },
    });

    return { success: true, data: count };
  } catch (error) {
    console.error('Error counting quotes in treatment:', error);
    return { success: false, error: 'Erreur lors du comptage des devis' };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIONS CRÉATION SANS COMPTE (GUEST QUOTE)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Génère un token de suivi unique pour les devis guest
 *
 * Utilise crypto.randomUUID() pour garantir l'unicité
 * Format: UUID sans tirets (32 caractères alphanumériques)
 *
 * @returns Token unique pour le suivi public
 *
 * @example
 * "a1b2c3d4e5f6789012345678abcdef12"
 */
function generateGuestTrackingToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Calcule la date d'expiration du token (72h à partir de maintenant)
 *
 * Après 72h, le visiteur doit créer un compte pour continuer
 * à suivre son devis
 *
 * @returns Date d'expiration du token
 */
function getTokenExpirationDate(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 72); // Validité 72h
  return expiresAt;
}

/**
 * Action : Créer un devis SANS compte (visiteur)
 *
 * User Story :
 * En tant que visiteur, je veux demander un devis sans créer de compte
 * pour évaluer rapidement le coût d'une expédition
 *
 * Workflow :
 * 1. Validation des données avec Zod (createGuestQuoteSchema)
 * 2. Génération du numéro de devis et du token de suivi (72h)
 * 3. Calcul automatique du coût estimé
 * 4. Création dans la DB avec userId = null (orphelin)
 * 5. Retour du token et numéro pour email de confirmation
 *
 * Après création :
 * - Email de confirmation envoyé avec lien de suivi
 * - Si l'utilisateur crée un compte avec le même email → rattachement auto
 *
 * @param data - Données du formulaire de demande de devis
 * @returns Succès avec token et numéro de devis, ou erreur
 *
 * @permissions Aucune - Action publique
 *
 * @example
 * const result = await createGuestQuoteAction({
 *   contactEmail: 'client@example.com',
 *   originCountry: 'FR',
 *   destinationCountry: 'BF',
 *   cargoType: 'GENERAL',
 *   weight: 500,
 *   transportMode: ['SEA', 'ROAD'],
 * });
 */
export async function createGuestQuoteAction(
  data: CreateGuestQuoteInput
): Promise<ActionResult<{
  id: string;
  quoteNumber: string;
  trackingToken: string;
  estimatedCost: number;
}>> {
  try {
    // 1. Validation des données avec le schéma Zod
    const validated = createGuestQuoteSchema.parse(data);

    // 2. Générer les identifiants uniques
    const quoteNumber = await generateQuoteNumber();
    const trackingToken = generateGuestTrackingToken();
    const tokenExpiresAt = getTokenExpirationDate();

    console.log('🔧 [createGuestQuote] Création avec:', {
      quoteNumber,
      trackingToken,
      tokenExpiresAt,
      contactEmail: validated.contactEmail,
    });

    // 3. Calculer le coût estimé automatiquement
    const estimationResult = await calculateQuoteEstimateAction({
      originCountry: validated.originCountry,
      destinationCountry: validated.destinationCountry,
      cargoType: validated.cargoType,
      weight: validated.weight,
      length: validated.length || 0,
      width: validated.width || 0,
      height: validated.height || 0,
      transportMode: validated.transportMode,
      priority: validated.priority,
    });

    const estimatedCost = estimationResult.success && estimationResult.data
      ? estimationResult.data.estimatedCost
      : 0;

    // 4. Date de validité : 30 jours
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    // 5. Créer le devis avec un QuotePackage unique (rétrocompatibilité)
    // Les devis guest utilisent les champs plats → on crée un package unique automatiquement
    // pour que le système multi-colis fonctionne de manière uniforme
    const quote = await prisma.quote.create({
      data: {
        // Identifiants
        quoteNumber,
        trackingToken,
        tokenExpiresAt,

        // Contact (pour matching lors de l'inscription)
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        contactName: validated.contactName,

        // Route
        originCountry: validated.originCountry,
        destinationCountry: validated.destinationCountry,

        // Marchandise (agrégats — source de vérité dans packages[])
        cargoType: validated.cargoType,
        weight: validated.weight,
        length: validated.length || null,
        width: validated.width || null,
        height: validated.height || null,

        // Transport
        transportMode: validated.transportMode,

        // Financier
        estimatedCost,
        currency: 'EUR',
        validUntil,

        // Statut initial : SENT (car demandé par un visiteur)
        status: 'SENT',

        // Métadonnées guest
        // userId: null (pas connecté)
        // clientId: null (pas rattaché)
        // createdById: null (création publique)
        isAttachedToAccount: false,

        // Création automatique d'un QuotePackage unique depuis les champs plats
        // Permet au système multi-colis de fonctionner uniformément
        packages: {
          create: {
            description: null,
            quantity: 1,
            cargoType: validated.cargoType,
            weight: validated.weight,
            length: validated.length || null,
            width: validated.width || null,
            height: validated.height || null,
            unitPrice: estimatedCost > 0 ? estimatedCost : null,
          },
        },
      },
    });

    console.log('✅ [createGuestQuote] Devis créé:', {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      trackingToken: quote.trackingToken,
      estimatedCost: quote.estimatedCost,
    });

    // 6. TODO: Envoyer email de confirmation (via Inngest)
    // L'email contiendra :
    // - Numéro de devis
    // - Coût estimé
    // - Lien de suivi : /quotes/track/[token]
    // - Invitation à créer un compte

    // 7. Revalider la liste des devis (pour les agents)
    revalidatePath('/dashboard/quotes');

    return {
      success: true,
      data: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        trackingToken: quote.trackingToken,
        estimatedCost: quote.estimatedCost,
      },
    };
  } catch (error) {
    console.error('Erreur lors de la création du devis guest:', error);

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return {
          success: false,
          error: 'Données invalides. Veuillez vérifier tous les champs.',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la création du devis.',
    };
  }
}

/**
 * Action : Suivre un devis via son token public
 *
 * User Story :
 * En tant qu'utilisateur ayant demandé un devis sans compte,
 * je veux suivre l'état de mon devis via le lien reçu par email
 *
 * Workflow :
 * 1. Validation du token (format CUID)
 * 2. Recherche du devis par trackingToken
 * 3. Vérification de l'expiration du token (72h)
 * 4. Retour des informations du devis
 *
 * URL : /quotes/track/[token]
 * Validité : 72h après création
 *
 * @param input - Token de suivi
 * @returns Données du devis ou erreur
 *
 * @permissions Aucune - Action publique (protégée par token unique)
 *
 * @example
 * const result = await trackQuoteByTokenAction({
 *   trackingToken: 'a1b2c3d4e5f6789012345678abcdef12',
 * });
 */
export async function trackQuoteByTokenAction(
  input: TrackQuoteByTokenInput
): Promise<ActionResult<{
  id: string;
  quoteNumber: string;
  status: string;
  originCountry: string;
  destinationCountry: string;
  cargoType: string;
  weight: number;
  transportMode: string[];
  estimatedCost: number;
  currency: string;
  validUntil: Date;
  createdAt: Date;
  contactEmail: string;
  contactName: string | null;
  isExpired: boolean;
  tokenExpired: boolean;
}>> {
  try {
    // 1. Validation du token
    const validated = trackQuoteByTokenSchema.parse(input);

    // 2. Rechercher le devis par token (prisma standard, pas enhanced)
    const quote = await prisma.quote.findUnique({
      where: {
        trackingToken: validated.trackingToken,
      },
    });

    if (!quote) {
      return {
        success: false,
        error: 'Devis introuvable. Vérifiez votre lien de suivi.',
      };
    }

    // 3. Vérifier si le token a expiré
    const tokenExpired = new Date() > quote.tokenExpiresAt;

    if (tokenExpired) {
      return {
        success: false,
        error: 'Votre lien de suivi a expiré (validité 72h). Créez un compte pour continuer à suivre votre devis.',
      };
    }

    // 4. Vérifier si le devis lui-même est expiré
    const isExpired = new Date() > quote.validUntil;

    return {
      success: true,
      data: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        originCountry: quote.originCountry,
        destinationCountry: quote.destinationCountry,
        cargoType: quote.cargoType,
        weight: quote.weight,
        transportMode: quote.transportMode,
        estimatedCost: quote.estimatedCost,
        currency: quote.currency,
        validUntil: quote.validUntil,
        createdAt: quote.createdAt,
        contactEmail: quote.contactEmail,
        contactName: quote.contactName,
        isExpired,
        tokenExpired: false,
      },
    };
  } catch (error) {
    console.error('Erreur lors du suivi du devis:', error);

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return {
          success: false,
          error: 'Token de suivi invalide.',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors du suivi du devis.',
    };
  }
}

/**
 * Action : Rattacher les devis orphelins à un compte utilisateur
 *
 * User Story US-1.3 :
 * En tant qu'utilisateur qui vient de créer un compte,
 * mes devis précédents (créés sans compte) sont automatiquement
 * rattachés à mon compte si l'email ou le téléphone correspondent
 *
 * Workflow :
 * 1. Récupérer l'email et téléphone de l'utilisateur
 * 2. Rechercher les devis orphelins (userId = null) avec matching email/phone
 * 3. Pour chaque devis trouvé :
 *    - userId = nouvel utilisateur
 *    - isAttachedToAccount = true
 *    - clientId = celui de l'utilisateur (si existant)
 * 4. Retour du nombre de devis rattachés
 *
 * Cette fonction est appelée automatiquement lors de :
 * - Création de compte (callback Better Auth)
 * - Première connexion après création de compte
 *
 * @param userId - ID de l'utilisateur nouvellement créé/connecté
 * @returns Nombre de devis rattachés
 *
 * @permissions Appelée par le système (auth callbacks)
 *
 * @example
 * // Dans le callback de création de compte (auth.ts)
 * await attachQuotesToUserAction(newUser.id);
 */
export async function attachQuotesToUserAction(
  userId: string
): Promise<ActionResult<{ count: number; quoteNumbers: string[] }>> {
  try {
    // 1. Récupérer les informations de l'utilisateur
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
      return {
        success: false,
        error: 'Utilisateur introuvable',
      };
    }

    // 2. Rechercher les devis orphelins avec email ou phone matchant
    const orphanedQuotes = await prisma.quote.findMany({
      where: {
        AND: [
          { userId: null }, // Pas encore rattaché
          {
            OR: [
              { contactEmail: user.email },
              ...(user.phone ? [{ contactPhone: user.phone }] : []),
            ],
          },
        ],
      },
    });

    if (orphanedQuotes.length === 0) {
      console.log('📭 [attachQuotes] Aucun devis orphelin trouvé pour:', user.email);
      return {
        success: true,
        data: { count: 0, quoteNumbers: [] },
      };
    }

    console.log(`📬 [attachQuotes] ${orphanedQuotes.length} devis orphelins trouvés pour:`, user.email);

    // 3. Rattacher chaque devis
    const attachedQuoteNumbers: string[] = [];

    await Promise.all(
      orphanedQuotes.map(async (quote) => {
        // Mise à jour du devis
        // Syntaxe relationnelle Prisma pour update() :
        // Les FK scalaires (userId, clientId) ne sont pas acceptées,
        // il faut utiliser user: { connect } et client: { connect }
        await prisma.quote.update({
          where: { id: quote.id },
          data: {
            user: { connect: { id: user.id } },
            ...(user.clientId ? { client: { connect: { id: user.clientId } } } : {}),
            isAttachedToAccount: true,
          },
        });

        // Identifier le critère de matching pour les logs
        const matchedBy = quote.contactEmail === user.email ? 'email' : 'phone';

        console.log(`🔗 [attachQuotes] Devis ${quote.quoteNumber} rattaché via ${matchedBy}`);
        attachedQuoteNumbers.push(quote.quoteNumber);
      })
    );

    // 4. Revalider les caches
    revalidatePath('/dashboard/quotes');

    return {
      success: true,
      data: {
        count: attachedQuoteNumbers.length,
        quoteNumbers: attachedQuoteNumbers,
      },
    };
  } catch (error) {
    console.error('Erreur lors du rattachement des devis:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors du rattachement des devis.',
    };
  }
}

// ============================================
// PAIEMENT
// ============================================

/**
 * Action : Marquer le paiement d'un devis comme reçu
 *
 * Permet à un agent de confirmer la réception du paiement pour un devis validé.
 * Une fois le paiement confirmé, le client peut télécharger la facture PDF.
 *
 * Workflow :
 * 1. Vérification des permissions (ADMIN, OPERATIONS_MANAGER ou FINANCE_MANAGER)
 * 2. Vérification que le devis est VALIDATED
 * 3. Mise à jour du champ paymentReceivedAt
 *
 * @param quoteId - ID du devis
 * @returns Résultat avec confirmation ou erreur
 *
 * @permissions ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER
 *
 * @example
 * // Confirmer le paiement d'un devis
 * const result = await markQuotePaymentReceivedAction('cuid123');
 * if (result.success) {
 *   // Afficher le bouton "Télécharger facture"
 * }
 */
export async function markQuotePaymentReceivedAction(
  quoteId: string
): Promise<ActionResult<{ id: string; paymentReceivedAt: Date }>> {
  try {
    // 1. Vérifier l'authentification
    const session = await requireAuth();
    const userRole = session.user.role as UserRole;

    // 2. Vérifier les permissions
    // ADMIN, OPERATIONS_MANAGER et FINANCE_MANAGER peuvent confirmer les paiements
    const canConfirmPayment =
      userRole === 'ADMIN' ||
      userRole === 'OPERATIONS_MANAGER' ||
      userRole === 'FINANCE_MANAGER';

    if (!canConfirmPayment) {
      return {
        success: false,
        error: 'Vous n\'avez pas les permissions pour confirmer ce paiement',
      };
    }

    // 3. Récupérer le devis existant
    const existingQuote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        paymentReceivedAt: true,
      },
    });

    if (!existingQuote) {
      return {
        success: false,
        error: 'Devis introuvable',
      };
    }

    // 4. Vérifier que le paiement n'a pas déjà été confirmé
    if (existingQuote.paymentReceivedAt) {
      return {
        success: false,
        error: `Le paiement de ce devis a déjà été confirmé le ${existingQuote.paymentReceivedAt.toLocaleDateString('fr-FR')}`,
      };
    }

    // 5. Vérifier que le devis est validé (status VALIDATED)
    // Le paiement ne peut être confirmé que sur un devis validé (colis créé)
    if (existingQuote.status !== 'VALIDATED') {
      return {
        success: false,
        error: `Impossible de confirmer le paiement d'un devis avec le statut "${existingQuote.status}". Le devis doit être VALIDATED.`,
      };
    }

    // 6. Mettre à jour le devis avec la date de paiement
    const now = new Date();
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        paymentReceivedAt: now,
        // Syntaxe relationnelle Prisma : connect l'utilisateur qui confirme le paiement
        paymentReceivedBy: { connect: { id: session.user.id } },
      },
    });

    console.log(
      `💰 [Quote] Paiement confirmé pour le devis ${existingQuote.quoteNumber} par ${session.user.email}`
    );

    // 7. Revalider les caches
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${quoteId}`);

    return {
      success: true,
      data: {
        id: updatedQuote.id,
        paymentReceivedAt: now,
      },
    };
  } catch (error) {
    console.error('Erreur lors de la confirmation du paiement:', error);

    return {
      success: false,
      error: 'Une erreur est survenue lors de la confirmation du paiement',
    };
  }
}

// ============================================
// SOUMISSION DU DEVIS (CLIENT)
// ============================================

/**
 * Action : Soumettre un devis brouillon pour traitement
 *
 * Permet au client propriétaire d'un devis de soumettre son brouillon aux agents.
 * Après soumission, le devis devient visible aux agents (OPERATIONS_MANAGER, FINANCE_MANAGER)
 * et passe du statut DRAFT à SUBMITTED.
 *
 * Workflow Client → Agent :
 * 1. Client crée un brouillon (DRAFT) - invisible aux agents
 * 2. Client soumet son devis (DRAFT → SUBMITTED) - visible aux agents
 * 3. Agent envoie une offre formelle (SUBMITTED → SENT)
 * 4. Client accepte ou rejette (SENT → ACCEPTED/REJECTED)
 *
 * Permissions :
 * - Seul le propriétaire du devis (userId) ou le client (clientId) peut soumettre
 * - Le devis doit être au statut DRAFT pour être soumis
 *
 * @param id - ID du devis à soumettre
 * @returns Résultat avec ID et numéro de devis ou erreur
 *
 * @example
 * ```ts
 * // Client soumet son brouillon
 * const result = await submitQuoteAction('cuid123');
 * if (result.success) {
 *   console.log(`Devis ${result.data.quoteNumber} soumis avec succès`);
 * }
 * ```
 */
export async function submitQuoteAction(
  id: string
): Promise<ActionResult<{ id: string; quoteNumber: string }>> {
  try {
    // 1. Vérifier l'authentification
    const session = await requireAuth();
    const userId = session.user.id;
    const userClientId = session.user.clientId;
    const userRole = session.user.role as UserRole;

    // 2. Récupérer le devis
    const quote = await prisma.quote.findUnique({
      where: { id },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        userId: true,        // Propriétaire direct du devis
        clientId: true,      // Client (COMPANY ou INDIVIDUAL) associé
        contactEmail: true,  // Email de contact
        createdById: true,   // Utilisateur ayant créé le devis
      },
    });

    // 3. Vérifier que le devis existe
    if (!quote) {
      return {
        success: false,
        error: 'Devis introuvable',
      };
    }

    // 4. Vérifier le statut actuel (doit être DRAFT)
    if (quote.status !== 'DRAFT') {
      const statusMessages: Record<string, string> = {
        SUBMITTED: 'Ce devis a déjà été soumis et est en attente de traitement.',
        SENT: 'Une offre a déjà été envoyée pour ce devis.',
        ACCEPTED: 'Ce devis a déjà été accepté.',
        REJECTED: 'Ce devis a été rejeté.',
        EXPIRED: 'Ce devis a expiré.',
        IN_TREATMENT: 'Ce devis est en cours de traitement.',
        VALIDATED: 'Ce devis a été validé.',
        CANCELLED: 'Ce devis a été annulé.',
      };
      return {
        success: false,
        error: statusMessages[quote.status] || 'Seuls les brouillons peuvent être soumis.',
      };
    }

    // 5. Vérifier les permissions : le propriétaire ou le client peut soumettre
    // - userId correspond à l'utilisateur connecté
    // - OU clientId correspond au client de l'utilisateur connecté
    // - OU createdById correspond à l'utilisateur connecté (il a créé le devis)
    // - OU l'utilisateur est ADMIN (accès complet)
    const isOwner = quote.userId === userId;
    const isSameClient = quote.clientId && quote.clientId === userClientId;
    const isCreator = quote.createdById === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isSameClient && !isCreator && !isAdmin) {
      return {
        success: false,
        error: 'Vous n\'êtes pas autorisé à soumettre ce devis.',
      };
    }

    // 6. Mettre à jour le statut et la date de soumission
    const now = new Date();
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: now,
      },
    });

    // 7. Enregistrer l'événement dans l'historique (QuoteLog)
    await logQuoteSubmittedByClient({
      quoteId: quote.id,
      changedById: userId,
      notes: `Devis ${quote.quoteNumber} soumis par ${session.user.email}`,
    });

    console.log(
      `📤 [Quote] Devis ${quote.quoteNumber} soumis par ${session.user.email} (DRAFT → SUBMITTED)`
    );

    // 8. Revalider les caches
    revalidatePath('/dashboard/quotes');
    revalidatePath(`/dashboard/quotes/${id}`);

    return {
      success: true,
      data: {
        id: updatedQuote.id,
        quoteNumber: updatedQuote.quoteNumber,
      },
    };
  } catch (error) {
    console.error('Erreur lors de la soumission du devis:', error);

    return {
      success: false,
      error: 'Une erreur est survenue lors de la soumission du devis',
    };
  }
}
