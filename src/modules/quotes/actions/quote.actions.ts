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
import { UserRole } from '@/generated/prisma';
import {
  quoteSchema,
  quoteUpdateSchema,
  quoteAcceptSchema,
  quoteRejectSchema,
  type QuoteFormData,
  type QuoteUpdateData,
  type QuoteAcceptData,
  type QuoteRejectData,
} from '../schemas/quote.schema';

/**
 * Type pour les résultats d'actions avec erreur ou succès
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

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

    // Extraire et valider les données
    const rawData = {
      companyId: formData.get('companyId'),
      originCountry: formData.get('originCountry'),
      destinationCountry: formData.get('destinationCountry'),
      cargoType: formData.get('cargoType'),
      weight: Number(formData.get('weight')),
      volume: formData.get('volume') ? Number(formData.get('volume')) : null,
      transportMode: formData.getAll('transportMode'),
      estimatedCost: Number(formData.get('estimatedCost')),
      currency: formData.get('currency') || 'EUR',
      validUntil: formData.get('validUntil'),
      status: formData.get('status') || 'DRAFT',
    };

    const validatedData = quoteSchema.parse(rawData);

    // Si l'utilisateur est CLIENT, vérifier qu'il crée un devis pour sa propre compagnie
    if (canCreateOwn && !canCreateAll) {
      if (!session.user.companyId) {
        return {
          success: false,
          error: 'Votre compte n\'est pas associé à une compagnie',
        };
      }

      if (validatedData.companyId !== session.user.companyId) {
        return {
          success: false,
          error: 'Vous ne pouvez créer des devis que pour votre propre compagnie',
        };
      }
    }

    // Vérifier que la compagnie existe
    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId },
    });

    if (!company) {
      return {
        success: false,
        error: 'Compagnie introuvable',
        field: 'companyId',
      };
    }

    // Générer un numéro de devis unique
    const quoteNumber = await generateQuoteNumber();

    // Créer le devis
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        companyId: validatedData.companyId,
        originCountry: validatedData.originCountry,
        destinationCountry: validatedData.destinationCountry,
        cargoType: validatedData.cargoType,
        weight: validatedData.weight,
        volume: validatedData.volume,
        transportMode: validatedData.transportMode,
        estimatedCost: validatedData.estimatedCost,
        currency: validatedData.currency,
        validUntil: new Date(validatedData.validUntil),
        status: validatedData.status || 'DRAFT',
      },
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
 * @param companyId - Filtrer par compagnie (optionnel)
 * @param status - Filtrer par statut (optionnel)
 * @param search - Terme de recherche (numéro devis, client, destination) (optionnel)
 * @returns Liste des devis
 *
 * @permissions 'quotes:read' ou 'quotes:read:own' - Tous les rôles
 */
export async function getQuotesAction(
  page = 1,
  limit = 10,
  companyId?: string,
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
    const where: any = {};

    // Si l'utilisateur est CLIENT, il ne voit que ses propres devis
    if (canReadOwn && !canReadAll) {
      if (!session.user.companyId) {
        return {
          success: false,
          error: 'Votre compte n\'est pas associé à une compagnie',
        };
      }
      where.companyId = session.user.companyId;
    } else if (companyId) {
      // Sinon, filtrer par companyId si fourni
      where.companyId = companyId;
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
        { company: { name: { contains: search, mode: 'insensitive' } } },
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
          company: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              invoices: true,
            },
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
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        company: true,
        invoices: true,
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
      if (session.user.companyId !== quote.companyId) {
        return {
          success: false,
          error: 'Vous n\'avez pas accès à ce devis',
        };
      }
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
 */
export async function updateQuoteAction(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Seuls les ADMIN, OPERATIONS_MANAGER et FINANCE_MANAGER peuvent modifier des devis
     * Permission requise: 'quotes:update'
     */
    await requirePermission('quotes:update');

    // Vérifier que le devis existe
    const existingQuote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!existingQuote) {
      return { success: false, error: 'Devis introuvable' };
    }

    // Empêcher la modification si le devis est accepté ou expiré
    if (existingQuote.status === 'ACCEPTED' || existingQuote.status === 'EXPIRED') {
      return {
        success: false,
        error: 'Un devis accepté ou expiré ne peut pas être modifié',
      };
    }

    // Extraire et valider les données
    const rawData: any = {};
    const simpleFields = [
      'companyId',
      'originCountry',
      'destinationCountry',
      'cargoType',
      'currency',
      'status',
      'validUntil',
      'acceptedAt',
      'rejectedAt',
    ];

    simpleFields.forEach((field) => {
      const value = formData.get(field);
      if (value !== null) {
        rawData[field] = value || null;
      }
    });

    // Champs numériques
    ['weight', 'volume', 'estimatedCost'].forEach((field) => {
      const value = formData.get(field);
      if (value !== null && value !== '') {
        rawData[field] = Number(value);
      }
    });

    // Champs array
    const transportMode = formData.getAll('transportMode');
    if (transportMode.length > 0) {
      rawData.transportMode = transportMode;
    }

    const validatedData = quoteUpdateSchema.parse(rawData);

    // Mettre à jour le devis
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        ...validatedData,
        validUntil: validatedData.validUntil
          ? new Date(validatedData.validUntil)
          : undefined,
        acceptedAt: validatedData.acceptedAt
          ? new Date(validatedData.acceptedAt)
          : undefined,
        rejectedAt: validatedData.rejectedAt
          ? new Date(validatedData.rejectedAt)
          : undefined,
      },
    });

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
 * Action : Supprimer un devis
 *
 * Supprime un devis de la base de données
 * Seuls les devis en DRAFT peuvent être supprimés
 *
 * @param id - ID du devis à supprimer
 * @returns Résultat de la suppression
 *
 * @permissions 'quotes:delete' - ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER
 */
export async function deleteQuoteAction(id: string): Promise<ActionResult> {
  try {
    /**
     * Vérifier l'authentification et les permissions
     * Permission requise: 'quotes:delete' (implique ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER)
     */
    await requirePermission('quotes:update'); // Utiliser update car delete n'est pas défini dans les permissions

    // Vérifier que le devis existe
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!quote) {
      return { success: false, error: 'Devis introuvable' };
    }

    // Empêcher la suppression si le devis n'est pas en DRAFT
    if (quote.status !== 'DRAFT') {
      return {
        success: false,
        error: 'Seuls les devis en brouillon peuvent être supprimés',
      };
    }

    // Empêcher la suppression si des factures sont associées
    if (quote._count.invoices > 0) {
      return {
        success: false,
        error: 'Impossible de supprimer un devis associé à des factures',
      };
    }

    // Supprimer le devis
    await prisma.quote.delete({
      where: { id },
    });

    // Revalider la liste des devis
    revalidatePath('/dashboard/quotes');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting quote:', error);

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
    const canUpdate = hasPermission(userRole, 'quotes:update');
    const isOwner =
      session.user.companyId && session.user.companyId === quote.companyId;

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

    // Mettre à jour le devis
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
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
    const canUpdate = hasPermission(userRole, 'quotes:update');
    const isOwner =
      session.user.companyId && session.user.companyId === quote.companyId;

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
 *    - RAIL (Ferroviaire) : x0.8 (économique)
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
 *    - EXPRESS : +50%
 *    - URGENT : +100%
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
    const { TransportMode, CargoType } = await import('@/generated/prisma');
    const { getPricingConfig } = await import('@/modules/pricing-config');

    // Récupérer la configuration dynamique des prix
    const config = await getPricingConfig();

    // Valider les données
    const validatedData = quoteEstimateSchema.parse(data);

    // === 1. Calculer le poids effectif (réel vs volumétrique) ===
    let effectiveWeight = validatedData.weight;

    // Si un volume est fourni, calculer le poids volumétrique
    // Formule standard : volume_m3 * 200 kg/m3
    if (validatedData.volume && validatedData.volume > 0) {
      const volumetricWeight = validatedData.volume * 200;
      // Prendre le maximum entre poids réel et poids volumétrique
      effectiveWeight = Math.max(effectiveWeight, volumetricWeight);
    }

    // === 2. Calculer la distance ===
    const distance = await getDistance(
      validatedData.originCountry,
      validatedData.destinationCountry
    );

    // === 3. Coût de base (depuis la configuration) ===
    const baseCost = effectiveWeight * config.baseRatePerKg;

    // === 4. Facteur de distance (distance / 1000 * baseCost) ===
    const distanceFactor = (distance / 1000) * baseCost;

    // === 5. Multiplicateur par mode de transport ===
    // Prendre le mode de transport principal (premier de la liste)
    const primaryTransportMode = validatedData.transportMode[0];

    const transportMultiplier = config.transportMultipliers[primaryTransportMode] || 1.0;
    const transportModeCost = (baseCost + distanceFactor) * transportMultiplier;

    // === 6. Supplément type de marchandise ===
    const cargoSurchargeRate = config.cargoTypeSurcharges[validatedData.cargoType] || 0;
    const cargoTypeSurcharge = transportModeCost * cargoSurchargeRate;

    // === 7. Supplément priorité ===
    const priority = validatedData.priority || 'STANDARD';
    const prioritySurchargeRate = config.prioritySurcharges[priority] || 0;
    const prioritySurcharge = transportModeCost * prioritySurchargeRate;

    // === 8. Coût total estimé ===
    const estimatedCost = Math.round(
      transportModeCost + cargoTypeSurcharge + prioritySurcharge
    );

    // === 9. Estimation du délai de livraison (en jours) ===
    // Basé sur le mode de transport et les délais configurés
    const deliverySpeed = config.deliverySpeedsPerMode[primaryTransportMode];

    // Calculer un délai basé sur la distance et les limites configurées
    // Plus la distance est grande, plus on tend vers le délai max
    const distanceRatio = Math.min(distance / 10000, 1); // Normaliser sur 10000 km max
    let estimatedDeliveryDays = Math.round(
      deliverySpeed.min + (deliverySpeed.max - deliverySpeed.min) * distanceRatio
    );

    // Ajuster selon la priorité
    if (priority === 'EXPRESS') {
      estimatedDeliveryDays = Math.ceil(estimatedDeliveryDays * 0.7); // -30%
    } else if (priority === 'URGENT') {
      estimatedDeliveryDays = Math.ceil(estimatedDeliveryDays * 0.5); // -50%
    }

    // Minimum 1 jour
    if (estimatedDeliveryDays < 1) estimatedDeliveryDays = 1;

    // === 10. Retourner le résultat ===
    return {
      success: true,
      data: {
        estimatedCost,
        currency: 'EUR',
        breakdown: {
          baseCost: Math.round(baseCost),
          transportModeCost: Math.round(transportModeCost),
          cargoTypeSurcharge: Math.round(cargoTypeSurcharge),
          prioritySurcharge: Math.round(prioritySurcharge),
          distanceFactor: Math.round(distanceFactor),
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

    // Vérifier que l'utilisateur a une company
    if (!session.user.companyId) {
      return {
        success: false,
        error: 'Votre compte n\'est pas associé à une compagnie',
      };
    }

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

    // Créer le devis en DRAFT
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        companyId: session.user.companyId,
        originCountry: validatedData.originCountry,
        destinationCountry: validatedData.destinationCountry,
        cargoType: validatedData.cargoType,
        weight: validatedData.weight,
        volume: validatedData.volume,
        transportMode: validatedData.transportMode,
        estimatedCost: estimation.data.estimatedCost,
        currency: 'EUR',
        validUntil,
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
    console.error('Error saving quote from calculator:', error);

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
