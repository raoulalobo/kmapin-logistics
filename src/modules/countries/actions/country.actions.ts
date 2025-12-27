/**
 * Server Actions pour la gestion des pays
 *
 * Contient toutes les actions serveur pour le CRUD des pays (Create, Read, Update, Delete)
 * Utilise Zenstack pour l'access control automatique (ADMIN uniquement pour CUD, lecture publique)
 */
'use server';

import { requireAdmin } from '@/lib/auth/config';
import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client';
import { prisma } from '@/lib/db/client';
import {
  createCountrySchema,
  updateCountrySchema,
  type CreateCountryInput,
  type UpdateCountryInput,
} from '../schemas/country.schema';
import { revalidatePath } from 'next/cache';

/**
 * Liste tous les pays
 *
 * Cette action ne nécessite pas d'authentification car la lecture est publique
 * (nécessaire pour les formulaires de devis publics)
 *
 * @param onlyActive - Si true, retourne uniquement les pays actifs
 * @returns Liste des pays triés par nom
 *
 * @example
 * ```ts
 * const countries = await listCountries();
 * const activeCountries = await listCountries(true);
 * ```
 */
export async function listCountries(onlyActive = false) {
  'use server';

  // Utiliser le client standard car lecture publique (pas d'access control nécessaire)
  const countries = await prisma.country.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  });

  return countries;
}

/**
 * Récupère un pays par son ID
 *
 * @param id - ID du pays
 * @returns Le pays ou null si non trouvé
 *
 * @example
 * ```ts
 * const country = await getCountry('clxxxxx');
 * if (country) {
 *   console.log(country.name);
 * }
 * ```
 */
export async function getCountry(id: string) {
  'use server';

  const country = await prisma.country.findUnique({
    where: { id },
  });

  return country;
}

/**
 * Récupère un pays par son code ISO
 *
 * @param code - Code ISO 3166-1 alpha-2 du pays (ex: "FR", "DE")
 * @returns Le pays ou null si non trouvé
 *
 * @example
 * ```ts
 * const france = await getCountryByCode('FR');
 * ```
 */
export async function getCountryByCode(code: string) {
  'use server';

  const country = await prisma.country.findUnique({
    where: { code: code.toUpperCase() },
  });

  return country;
}

/**
 * Crée un nouveau pays
 *
 * Nécessite le rôle ADMIN. Valide les données avec Zod avant création.
 * Zenstack applique automatiquement l'access control.
 *
 * @param data - Données du pays à créer
 * @returns Le pays créé
 * @throws Error si validation échoue ou si le code pays existe déjà
 *
 * @example
 * ```ts
 * const country = await createCountry({
 *   code: "FR",
 *   name: "France",
 *   isActive: true
 * });
 * ```
 */
export async function createCountry(data: CreateCountryInput) {
  'use server';

  // Vérifier que l'utilisateur est admin
  const session = await requireAdmin();

  // Valider les données avec Zod
  const validated = createCountrySchema.parse(data);

  // Vérifier si le code pays existe déjà
  const existing = await prisma.country.findUnique({
    where: { code: validated.code },
  });

  if (existing) {
    throw new Error(`Un pays avec le code ${validated.code} existe déjà`);
  }

  // Créer le pays avec access control automatique
  const db = getEnhancedPrismaFromSession(session);
  const country = await db.country.create({
    data: validated,
  });

  // Revalider le cache des pages concernées
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/countries');

  return country;
}

/**
 * Met à jour un pays existant
 *
 * Nécessite le rôle ADMIN. Valide les données avec Zod avant mise à jour.
 * Zenstack applique automatiquement l'access control.
 *
 * @param id - ID du pays à mettre à jour
 * @param data - Données à mettre à jour (partielles)
 * @returns Le pays mis à jour
 * @throws Error si validation échoue ou si le pays n'existe pas
 *
 * @example
 * ```ts
 * const updated = await updateCountry('clxxxxx', {
 *   name: "République Française",
 *   isActive: false
 * });
 * ```
 */
export async function updateCountry(id: string, data: UpdateCountryInput) {
  'use server';

  // Vérifier que l'utilisateur est admin
  const session = await requireAdmin();

  // Valider les données avec Zod
  const validated = updateCountrySchema.parse(data);

  // Si on change le code, vérifier qu'il n'existe pas déjà
  if (validated.code) {
    const existing = await prisma.country.findFirst({
      where: {
        code: validated.code,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error(`Un pays avec le code ${validated.code} existe déjà`);
    }
  }

  // Mettre à jour le pays avec access control automatique
  const db = getEnhancedPrismaFromSession(session);
  const country = await db.country.update({
    where: { id },
    data: validated,
  });

  // Revalider le cache des pages concernées
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/countries');

  return country;
}

/**
 * Supprime un pays
 *
 * Nécessite le rôle ADMIN. Zenstack applique automatiquement l'access control.
 *
 * @param id - ID du pays à supprimer
 * @returns Le pays supprimé
 * @throws Error si le pays n'existe pas ou est utilisé dans des expéditions/devis
 *
 * @example
 * ```ts
 * await deleteCountry('clxxxxx');
 * ```
 */
export async function deleteCountry(id: string) {
  'use server';

  // Vérifier que l'utilisateur est admin
  const session = await requireAdmin();

  // TODO: Vérifier si le pays est utilisé dans des shipments/quotes/distances
  // avant de permettre la suppression

  // Supprimer le pays avec access control automatique
  const db = getEnhancedPrismaFromSession(session);
  const country = await db.country.delete({
    where: { id },
  });

  // Revalider le cache des pages concernées
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/countries');

  return country;
}

/**
 * Bascule l'état actif/inactif d'un pays
 *
 * Nécessite le rôle ADMIN. Pratique pour désactiver temporairement un pays
 * sans le supprimer.
 *
 * @param id - ID du pays
 * @returns Le pays mis à jour
 *
 * @example
 * ```ts
 * await toggleCountryStatus('clxxxxx');
 * ```
 */
export async function toggleCountryStatus(id: string) {
  'use server';

  // Vérifier que l'utilisateur est admin
  const session = await requireAdmin();

  // Récupérer l'état actuel
  const country = await prisma.country.findUnique({
    where: { id },
  });

  if (!country) {
    throw new Error('Pays non trouvé');
  }

  // Basculer l'état avec access control automatique
  const db = getEnhancedPrismaFromSession(session);
  const updated = await db.country.update({
    where: { id },
    data: { isActive: !country.isActive },
  });

  // Revalider le cache des pages concernées
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/countries');

  return updated;
}
