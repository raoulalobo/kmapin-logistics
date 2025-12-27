/**
 * Server Actions : Transport Rates (Tarifs de Transport)
 *
 * Actions serveur pour gérer les tarifs de transport par route.
 * CRUD complet avec access control (ADMIN uniquement).
 *
 * @module modules/transport-rates/actions
 */

'use server';

import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth/config';
import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client';
import {
  createTransportRateSchema,
  updateTransportRateSchema,
  filterTransportRatesSchema,
  type CreateTransportRateInput,
  type UpdateTransportRateInput,
  type FilterTransportRatesInput,
} from '../schemas/transport-rate.schema';

/**
 * Type de retour standard pour les actions
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Créer un nouveau tarif de transport
 *
 * Crée une nouvelle route tarifaire avec ses tarifs €/kg et €/m³.
 * Vérifie que la route n'existe pas déjà.
 *
 * @param data - Données du tarif à créer
 * @returns Tarif créé ou erreur
 *
 * @example
 * ```typescript
 * const result = await createTransportRate({
 *   originCountryCode: 'FR',
 *   destinationCountryCode: 'BF',
 *   transportMode: 'SEA',
 *   ratePerKg: 0.8,
 *   ratePerM3: 150.0,
 * });
 * ```
 *
 * **Access** : ADMIN uniquement
 */
export async function createTransportRate(
  data: unknown
): Promise<ActionResult<any>> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les données
    const validatedData = createTransportRateSchema.parse(data);

    // Vérifier si la route existe déjà
    const existing = await db.transportRate.findUnique({
      where: {
        originCountryCode_destinationCountryCode_transportMode: {
          originCountryCode: validatedData.originCountryCode,
          destinationCountryCode: validatedData.destinationCountryCode,
          transportMode: validatedData.transportMode,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Un tarif existe déjà pour cette route (${validatedData.originCountryCode} → ${validatedData.destinationCountryCode}, ${validatedData.transportMode})`,
      };
    }

    // Créer le tarif
    const rate = await db.transportRate.create({
      data: validatedData,
    });

    // Invalider le cache
    revalidateTag('transport-rates');

    return {
      success: true,
      data: rate,
    };
  } catch (error) {
    console.error('[createTransportRate] Erreur:', error);

    // Gestion des erreurs d'autorisation Zenstack
    if (error instanceof Error) {
      // Erreur Zenstack : accès refusé par les policies
      if (error.message.includes('denied by policy')) {
        return {
          success: false,
          error: '🚫 Accès refusé : Vous devez être administrateur pour créer des tarifs de transport. Veuillez vérifier que vous êtes bien connecté avec un compte ayant le rôle ADMIN.',
        };
      }

      // Erreur Better Auth : pas authentifié
      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: '🔒 Non authentifié : Veuillez vous connecter pour accéder à cette fonctionnalité.',
        };
      }

      // Erreur Better Auth : pas admin
      if (error.message.includes('Forbidden') || error.message.includes('Admin access required')) {
        return {
          success: false,
          error: '🚫 Accès interdit : Seuls les administrateurs peuvent créer des tarifs de transport. Votre rôle actuel ne vous autorise pas à effectuer cette action.',
        };
      }

      // Erreur Zod : validation
      if (error.name === 'ZodError') {
        return {
          success: false,
          error: '❌ Données invalides : Veuillez vérifier tous les champs du formulaire.',
        };
      }
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la création du tarif. Veuillez réessayer.',
    };
  }
}

/**
 * Mettre à jour un tarif de transport existant
 *
 * Modifie les tarifs et/ou surcharges d'une route existante.
 *
 * @param id - ID du tarif à modifier
 * @param data - Données à mettre à jour
 * @returns Tarif mis à jour ou erreur
 *
 * **Access** : ADMIN uniquement
 */
export async function updateTransportRate(
  id: string,
  data: unknown
): Promise<ActionResult<any>> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les données
    const validatedData = updateTransportRateSchema.parse(data);

    // Vérifier que le tarif existe
    const existing = await db.transportRate.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Tarif introuvable',
      };
    }

    // Mettre à jour
    const rate = await db.transportRate.update({
      where: { id },
      data: validatedData,
    });

    // Invalider le cache
    revalidateTag('transport-rates');

    return {
      success: true,
      data: rate,
    };
  } catch (error) {
    console.error('[updateTransportRate] Erreur:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        error: 'Données invalides. Veuillez vérifier tous les champs.',
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour du tarif',
    };
  }
}

/**
 * Supprimer un tarif de transport
 *
 * Supprime définitivement une route tarifaire.
 *
 * @param id - ID du tarif à supprimer
 * @returns Succès ou erreur
 *
 * **Access** : ADMIN uniquement
 */
export async function deleteTransportRate(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Vérifier que le tarif existe
    const existing = await db.transportRate.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Tarif introuvable',
      };
    }

    // Supprimer
    await db.transportRate.delete({
      where: { id },
    });

    // Invalider le cache
    revalidateTag('transport-rates');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('[deleteTransportRate] Erreur:', error);

    return {
      success: false,
      error: 'Une erreur est survenue lors de la suppression du tarif',
    };
  }
}

/**
 * Récupérer un tarif par son ID
 *
 * Récupère les détails complets d'un tarif.
 *
 * @param id - ID du tarif
 * @returns Tarif ou erreur
 *
 * **Access** : ADMIN uniquement
 */
export async function getTransportRateById(
  id: string
): Promise<ActionResult<any>> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    const rate = await db.transportRate.findUnique({
      where: { id },
    });

    if (!rate) {
      return {
        success: false,
        error: 'Tarif introuvable',
      };
    }

    return {
      success: true,
      data: rate,
    };
  } catch (error) {
    console.error('[getTransportRateById] Erreur:', error);

    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération du tarif',
    };
  }
}

/**
 * Lister les tarifs de transport avec filtres
 *
 * Récupère une liste de tarifs avec filtres optionnels.
 * Inclut les tarifs actifs et inactifs.
 *
 * @param filters - Filtres optionnels (origine, destination, mode, statut)
 * @returns Liste des tarifs ou erreur
 *
 * **Access** : ADMIN uniquement
 */
export async function getTransportRates(
  filters: unknown = {}
): Promise<ActionResult<any[]>> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les filtres
    const validatedFilters = filterTransportRatesSchema.parse(filters) as FilterTransportRatesInput;

    // Construire la condition where
    const where: any = {};
    if (validatedFilters.originCountryCode) {
      where.originCountryCode = validatedFilters.originCountryCode;
    }
    if (validatedFilters.destinationCountryCode) {
      where.destinationCountryCode = validatedFilters.destinationCountryCode;
    }
    if (validatedFilters.transportMode) {
      where.transportMode = validatedFilters.transportMode;
    }
    if (validatedFilters.isActive !== undefined) {
      where.isActive = validatedFilters.isActive;
    }

    // Récupérer les tarifs
    const rates = await db.transportRate.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [
        { originCountryCode: 'asc' },
        { destinationCountryCode: 'asc' },
        { transportMode: 'asc' },
      ],
    });

    return {
      success: true,
      data: rates,
    };
  } catch (error) {
    console.error('[getTransportRates] Erreur:', error);

    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération des tarifs',
    };
  }
}

/**
 * Activer/Désactiver un tarif de transport
 *
 * Permet de désactiver temporairement une route sans la supprimer.
 *
 * @param id - ID du tarif
 * @param isActive - Nouveau statut
 * @returns Tarif mis à jour ou erreur
 *
 * **Access** : ADMIN uniquement
 */
export async function toggleTransportRateStatus(
  id: string,
  isActive: boolean
): Promise<ActionResult<any>> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Mettre à jour
    const rate = await db.transportRate.update({
      where: { id },
      data: { isActive },
    });

    // Invalider le cache
    revalidateTag('transport-rates');

    return {
      success: true,
      data: rate,
    };
  } catch (error) {
    console.error('[toggleTransportRateStatus] Erreur:', error);

    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour du statut',
    };
  }
}

/**
 * Import en masse de tarifs
 *
 * Crée ou met à jour plusieurs tarifs en une seule opération.
 * Utile pour l'import CSV.
 *
 * @param rates - Tableau de tarifs à importer
 * @returns Résultat de l'import ou erreur
 *
 * **Access** : ADMIN uniquement
 */
export async function bulkImportTransportRates(
  rates: unknown[]
): Promise<ActionResult<{ created: number; updated: number; errors: number }>> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const rate of rates) {
      try {
        // Valider
        const validatedRate = createTransportRateSchema.parse(rate);

        // Upsert
        await db.transportRate.upsert({
          where: {
            originCountryCode_destinationCountryCode_transportMode: {
              originCountryCode: validatedRate.originCountryCode,
              destinationCountryCode: validatedRate.destinationCountryCode,
              transportMode: validatedRate.transportMode,
            },
          },
          create: validatedRate,
          update: {
            ratePerKg: validatedRate.ratePerKg,
            ratePerM3: validatedRate.ratePerM3,
            cargoTypeSurcharges: validatedRate.cargoTypeSurcharges,
            prioritySurcharges: validatedRate.prioritySurcharges,
            isActive: validatedRate.isActive,
            notes: validatedRate.notes,
          },
        });

        // Déterminer si création ou update
        const existing = await db.transportRate.findUnique({
          where: {
            originCountryCode_destinationCountryCode_transportMode: {
              originCountryCode: validatedRate.originCountryCode,
              destinationCountryCode: validatedRate.destinationCountryCode,
              transportMode: validatedRate.transportMode,
            },
          },
        });

        if (existing) {
          updated++;
        } else {
          created++;
        }
      } catch (error) {
        console.error('[bulkImportTransportRates] Erreur ligne:', error);
        errors++;
      }
    }

    // Invalider le cache
    revalidateTag('transport-rates');

    return {
      success: true,
      data: { created, updated, errors },
    };
  } catch (error) {
    console.error('[bulkImportTransportRates] Erreur:', error);

    return {
      success: false,
      error: "Une erreur est survenue lors de l'import en masse",
    };
  }
}
