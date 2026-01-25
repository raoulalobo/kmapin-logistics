/**
 * Server Actions pour la gestion de la configuration système
 *
 * Permet aux administrateurs de gérer la configuration de la plateforme :
 * - Identité (nom, slogan)
 * - Contact (email, téléphone)
 * - Branding (logo, couleurs)
 * - Adresse du siège
 * - Réseaux sociaux
 * - Mentions légales
 *
 * Toutes les actions de modification nécessitent le rôle ADMIN
 * La lecture publique est assurée par getSystemConfig() dans lib/
 *
 * @module system-config/actions
 */

'use server';

import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth/config';
import { getEnhancedPrismaFromSession } from '@/lib/db/enhanced-client';
import { prisma } from '@/lib/db/client';
import {
  systemConfigSchema,
  updateSystemConfigSchema,
  type SystemConfigInput,
  type UpdateSystemConfigInput,
  type SystemConfigData,
} from '../schemas/system-config.schema';
import { DEFAULT_SYSTEM_CONFIG } from '../lib/get-system-config';

/**
 * Type de résultat standardisé pour les Server Actions
 * Permet une gestion uniforme des succès et erreurs côté client
 *
 * @example
 * // Côté client
 * const result = await updateSystemConfig(data);
 * if (result.success) {
 *   console.log('Config mise à jour:', result.data);
 * } else {
 *   console.error('Erreur:', result.error);
 * }
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Récupère la configuration système actuelle (admin only)
 * Retourne la configuration complète avec toutes les métadonnées
 *
 * Cette action est réservée aux admins car elle retourne des données
 * sensibles (id, updatedById, etc.) pour le back-office
 *
 * Pour la lecture publique, utiliser getSystemConfig() depuis lib/
 *
 * @returns Configuration complète ou null si non existante
 *
 * @example
 * const result = await getSystemConfigAction();
 * if (result.success && result.data) {
 *   // Configuration existe
 *   setFormData(result.data);
 * } else if (result.success && !result.data) {
 *   // Aucune configuration, utiliser les valeurs par défaut
 *   setFormData(DEFAULT_SYSTEM_CONFIG);
 * }
 */
export async function getSystemConfigAction(): Promise<
  ActionResult<SystemConfigData | null>
> {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Récupérer la configuration (singleton - une seule entrée)
    const config = await db.systemConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: config as SystemConfigData | null };
  } catch (error) {
    console.error('[getSystemConfigAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération de la configuration',
    };
  }
}

/**
 * Met à jour la configuration système existante
 * Si aucune configuration n'existe, en crée une nouvelle (upsert)
 *
 * Cette action :
 * 1. Vérifie les droits admin
 * 2. Valide les données avec Zod
 * 3. Crée ou met à jour la configuration
 * 4. Invalide le cache pour propagation immédiate
 *
 * @param data - Données de configuration (partielles ou complètes)
 * @returns La configuration mise à jour avec horodatage
 *
 * @example
 * // Mise à jour partielle (uniquement le nom)
 * await updateSystemConfigAction({ platformName: 'Nouveau Nom' });
 *
 * // Mise à jour complète
 * await updateSystemConfigAction({
 *   platformName: 'Faso Fret',
 *   platformFullName: 'Faso Fret Logistics',
 *   contactEmail: 'contact@fasofret.com',
 *   primaryColor: '#003D82',
 *   copyrightYear: 2025,
 * });
 */
export async function updateSystemConfigAction(
  data: UpdateSystemConfigInput
): Promise<ActionResult<{ id: string; updatedAt: Date }>> {
  try {
    // Vérifier les droits admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Valider les données avec le schéma partiel
    const validated = updateSystemConfigSchema.parse(data);

    // Récupérer la configuration existante
    const existingConfig = await db.systemConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    let config;

    if (existingConfig) {
      // Mettre à jour la configuration existante
      config = await db.systemConfig.update({
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
      // Créer une nouvelle configuration avec valeurs par défaut + données fournies
      // On fusionne les valeurs par défaut avec les données validées
      const fullData = {
        ...DEFAULT_SYSTEM_CONFIG,
        ...validated,
        updatedById: session.user.id,
      };

      config = await db.systemConfig.create({
        data: fullData,
        select: {
          id: true,
          updatedAt: true,
        },
      });
    }

    // Invalider le cache pour que les changements soient visibles immédiatement
    // Tous les appels à getSystemConfig() récupéreront les nouvelles valeurs
    revalidateTag('system-config');

    return { success: true, data: config };
  } catch (error) {
    console.error('[updateSystemConfigAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la configuration',
    };
  }
}

/**
 * Initialise la configuration système avec les valeurs par défaut
 * Utilisé lors du premier démarrage ou pour réinitialiser
 *
 * Cette action crée une nouvelle configuration UNIQUEMENT si aucune n'existe
 * Pour réinitialiser une configuration existante, utiliser resetSystemConfigAction()
 *
 * @returns La configuration créée ou existante
 *
 * @example
 * // Au premier lancement de l'application
 * const result = await initSystemConfigAction();
 * if (result.success) {
 *   console.log('Configuration initialisée');
 * }
 */
export async function initSystemConfigAction(): Promise<
  ActionResult<{ id: string; isNew: boolean }>
> {
  try {
    // Vérifier les droits admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Vérifier si une configuration existe déjà
    const existingConfig = await db.systemConfig.findFirst();

    if (existingConfig) {
      // Configuration déjà existante, ne rien faire
      return {
        success: true,
        data: { id: existingConfig.id, isNew: false },
      };
    }

    // Créer la configuration avec les valeurs par défaut
    const config = await db.systemConfig.create({
      data: {
        ...DEFAULT_SYSTEM_CONFIG,
        updatedById: session.user.id,
      },
      select: {
        id: true,
      },
    });

    // Invalider le cache
    revalidateTag('system-config');

    return {
      success: true,
      data: { id: config.id, isNew: true },
    };
  } catch (error) {
    console.error('[initSystemConfigAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de l\'initialisation de la configuration',
    };
  }
}

/**
 * Réinitialise la configuration système aux valeurs par défaut
 * ATTENTION : Cette action écrase toutes les personnalisations
 *
 * @returns La configuration réinitialisée
 */
export async function resetSystemConfigAction(): Promise<
  ActionResult<{ id: string; updatedAt: Date }>
> {
  try {
    // Vérifier les droits admin
    const session = await requireAdmin();
    const db = getEnhancedPrismaFromSession(session);

    // Récupérer la configuration existante
    const existingConfig = await db.systemConfig.findFirst();

    let config;

    if (existingConfig) {
      // Réinitialiser la configuration existante
      config = await db.systemConfig.update({
        where: { id: existingConfig.id },
        data: {
          ...DEFAULT_SYSTEM_CONFIG,
          updatedById: session.user.id,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });
    } else {
      // Créer une nouvelle configuration avec les valeurs par défaut
      config = await db.systemConfig.create({
        data: {
          ...DEFAULT_SYSTEM_CONFIG,
          updatedById: session.user.id,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });
    }

    // Invalider le cache
    revalidateTag('system-config');

    return { success: true, data: config };
  } catch (error) {
    console.error('[resetSystemConfigAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la réinitialisation de la configuration',
    };
  }
}

/**
 * Met à jour uniquement le logo de la plateforme
 * Utilisé après l'upload d'un fichier sur Backblaze B2
 *
 * @param logoUrl - URL du nouveau logo (null pour supprimer)
 * @returns Succès de la mise à jour
 */
export async function updateLogoAction(
  logoUrl: string | null
): Promise<ActionResult<{ updatedAt: Date }>> {
  return updateSystemConfigAction({ logoUrl });
}

/**
 * Met à jour uniquement le favicon de la plateforme
 * Utilisé après l'upload d'un fichier sur Backblaze B2
 *
 * @param faviconUrl - URL du nouveau favicon (null pour supprimer)
 * @returns Succès de la mise à jour
 */
export async function updateFaviconAction(
  faviconUrl: string | null
): Promise<ActionResult<{ updatedAt: Date }>> {
  return updateSystemConfigAction({ faviconUrl });
}

/**
 * Met à jour les couleurs de la marque
 *
 * @param colors - Couleurs primaire et/ou secondaire
 * @returns Succès de la mise à jour
 */
export async function updateBrandColorsAction(
  colors: { primaryColor?: string; secondaryColor?: string | null }
): Promise<ActionResult<{ updatedAt: Date }>> {
  return updateSystemConfigAction(colors);
}

/**
 * Met à jour les informations de contact
 *
 * @param contact - Email et/ou téléphone de contact
 * @returns Succès de la mise à jour
 */
export async function updateContactAction(
  contact: { contactEmail?: string; contactPhone?: string | null }
): Promise<ActionResult<{ updatedAt: Date }>> {
  return updateSystemConfigAction(contact);
}

/**
 * Met à jour les URLs des réseaux sociaux
 *
 * @param social - URLs des réseaux sociaux
 * @returns Succès de la mise à jour
 */
export async function updateSocialLinksAction(
  social: {
    facebookUrl?: string | null;
    linkedinUrl?: string | null;
    twitterUrl?: string | null;
    instagramUrl?: string | null;
  }
): Promise<ActionResult<{ updatedAt: Date }>> {
  return updateSystemConfigAction(social);
}

/**
 * Met à jour les mentions légales
 *
 * @param legal - Informations légales
 * @returns Succès de la mise à jour
 */
export async function updateLegalInfoAction(
  legal: {
    companyLegalName?: string | null;
    companyRegistration?: string | null;
    vatNumber?: string | null;
    copyrightYear?: number;
  }
): Promise<ActionResult<{ updatedAt: Date }>> {
  return updateSystemConfigAction(legal);
}

/**
 * Met à jour l'adresse du siège social
 *
 * @param address - Informations d'adresse
 * @returns Succès de la mise à jour
 */
export async function updateCompanyAddressAction(
  address: {
    companyAddress?: string | null;
    companyCity?: string | null;
    companyCountry?: string | null;
    companyPostalCode?: string | null;
  }
): Promise<ActionResult<{ updatedAt: Date }>> {
  return updateSystemConfigAction(address);
}
