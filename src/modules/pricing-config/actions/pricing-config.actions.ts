/**
 * Server Actions pour la gestion de la configuration des prix
 *
 * Permet aux administrateurs de gérer:
 * - La configuration globale des prix (PricingConfig)
 * - Les distances entre pays (CountryDistance)
 *
 * Toutes les actions nécessitent le rôle ADMIN
 */

'use server';

import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth/config';
import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client';
import {
  pricingConfigSchema,
  updatePricingConfigSchema,
  countryDistanceSchema,
  updateCountryDistanceSchema,
  type PricingConfigInput,
  type UpdatePricingConfigInput,
  type CountryDistanceInput,
  type UpdateCountryDistanceInput,
} from '../schemas/pricing-config.schema';

/**
 * Type de résultat pour les Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Récupère la configuration actuelle des prix
 * Accessible uniquement aux ADMIN
 *
 * @returns La configuration actuelle ou null si elle n'existe pas
 */
export async function getCurrentPricingConfig(): Promise<
  ActionResult<{
    id: string;
    baseRatePerKg: number;
    transportMultipliers: any;
    cargoTypeSurcharges: any;
    prioritySurcharges: any;
    deliverySpeedsPerMode: any;
    updatedById: string;
    createdAt: Date;
    updatedAt: Date;
  } | null>
> {
  try {
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    const config = await db.pricingConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: config };
  } catch (error) {
    console.error('[getCurrentPricingConfig] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération de la configuration',
    };
  }
}

/**
 * Met à jour la configuration des prix
 * Si aucune configuration n'existe, en crée une nouvelle
 *
 * @param data - Données de configuration (partielles ou complètes)
 * @returns La configuration mise à jour
 */
export async function updatePricingConfig(
  data: UpdatePricingConfigInput
): Promise<ActionResult<{ id: string; updatedAt: Date }>> {
  try {
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les données
    const validated = updatePricingConfigSchema.parse(data);

    // Récupérer la configuration existante
    const existingConfig = await db.pricingConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    let config;

    if (existingConfig) {
      // Mettre à jour la configuration existante
      config = await db.pricingConfig.update({
        where: { id: existingConfig.id },
        data: {
          ...validated,
          updatedById: session.user.id,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });
    } else {
      // Créer une nouvelle configuration si elle n'existe pas
      // Valider avec le schéma complet
      const fullValidated = pricingConfigSchema.parse(data);

      config = await db.pricingConfig.create({
        data: {
          ...fullValidated,
          updatedById: session.user.id,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });
    }

    // Invalider le cache
    revalidateTag('pricing-config');

    return { success: true, data: config };
  } catch (error) {
    console.error('[updatePricingConfig] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la configuration',
    };
  }
}

/**
 * Récupère toutes les distances entre pays
 *
 * @returns Liste de toutes les distances configurées
 */
export async function getAllCountryDistances(): Promise<
  ActionResult<
    Array<{
      id: string;
      originCountry: string;
      destinationCountry: string;
      distanceKm: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  >
> {
  try {
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    const distances = await db.countryDistance.findMany({
      orderBy: [{ originCountry: 'asc' }, { destinationCountry: 'asc' }],
    });

    return { success: true, data: distances };
  } catch (error) {
    console.error('[getAllCountryDistances] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération des distances',
    };
  }
}

/**
 * Crée ou met à jour une distance entre deux pays
 *
 * @param data - Données de la distance (origin, destination, distanceKm)
 * @returns La distance créée ou mise à jour
 */
export async function upsertCountryDistance(
  data: CountryDistanceInput
): Promise<ActionResult<{ id: string; distanceKm: number }>> {
  try {
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les données
    const validated = countryDistanceSchema.parse(data);

    // Upsert (create or update)
    const distance = await db.countryDistance.upsert({
      where: {
        originCountry_destinationCountry: {
          originCountry: validated.originCountry,
          destinationCountry: validated.destinationCountry,
        },
      },
      create: {
        originCountry: validated.originCountry,
        destinationCountry: validated.destinationCountry,
        distanceKm: validated.distanceKm,
      },
      update: {
        distanceKm: validated.distanceKm,
      },
      select: {
        id: true,
        distanceKm: true,
      },
    });

    // Invalider le cache
    revalidateTag('country-distances');

    return { success: true, data: distance };
  } catch (error) {
    console.error('[upsertCountryDistance] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création/mise à jour de la distance',
    };
  }
}

/**
 * Supprime une distance entre deux pays
 *
 * @param originCountry - Code pays origine
 * @param destinationCountry - Code pays destination
 * @returns Succès de la suppression
 */
export async function deleteCountryDistance(
  originCountry: string,
  destinationCountry: string
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    await db.countryDistance.delete({
      where: {
        originCountry_destinationCountry: {
          originCountry: originCountry.toUpperCase(),
          destinationCountry: destinationCountry.toUpperCase(),
        },
      },
    });

    // Invalider le cache
    revalidateTag('country-distances');

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error('[deleteCountryDistance] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression de la distance',
    };
  }
}

/**
 * Importe un lot de distances entre pays
 * Utile pour l'initialisation ou la mise à jour en masse
 *
 * @param distances - Tableau de distances à importer
 * @returns Nombre de distances importées
 */
export async function bulkImportCountryDistances(
  distances: CountryDistanceInput[]
): Promise<ActionResult<{ imported: number }>> {
  try {
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Valider toutes les distances
    const validated = distances.map((d) => countryDistanceSchema.parse(d));

    // Insérer toutes les distances
    let imported = 0;
    for (const distance of validated) {
      await db.countryDistance.upsert({
        where: {
          originCountry_destinationCountry: {
            originCountry: distance.originCountry,
            destinationCountry: distance.destinationCountry,
          },
        },
        create: distance,
        update: { distanceKm: distance.distanceKm },
      });
      imported++;
    }

    // Invalider le cache
    revalidateTag('country-distances');

    return { success: true, data: { imported } };
  } catch (error) {
    console.error('[bulkImportCountryDistances] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de l\'importation des distances',
    };
  }
}
