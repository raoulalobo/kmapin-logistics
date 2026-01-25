/**
 * Utilitaires pour récupérer la configuration système de la plateforme
 *
 * Fournit une fonction cachée pour récupérer la configuration avec fallback
 * aux valeurs par défaut. Utilise le cache Next.js pour optimiser les performances.
 *
 * Pattern identique à getPricingConfig pour cohérence du codebase.
 *
 * @example
 * // Dans un Server Component ou Server Action
 * const config = await getSystemConfig();
 * console.log(config.platformName); // "Faso Fret"
 */

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db/client';
import type { SystemConfigData } from '../schemas/system-config.schema';

/**
 * Valeurs par défaut pour la configuration système
 * Utilisées si aucune configuration n'existe en base de données
 *
 * Ces valeurs correspondent aux @default() définis dans schema.zmodel
 * et permettent à l'application de fonctionner sans configuration initiale
 */
export const DEFAULT_SYSTEM_CONFIG: Omit<SystemConfigData, 'id' | 'updatedById' | 'createdAt' | 'updatedAt'> = {
  // Identité
  platformName: 'Faso Fret',
  platformFullName: 'Faso Fret Logistics',
  platformSlogan: 'Transport multi-modal international',

  // Contact
  contactEmail: 'support@kmapin.com',
  contactPhone: null,

  // Branding
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#003D82',
  secondaryColor: '#10B981',

  // Adresse
  companyAddress: null,
  companyCity: null,
  companyCountry: 'Burkina Faso',
  companyPostalCode: null,

  // Réseaux sociaux
  facebookUrl: null,
  linkedinUrl: null,
  twitterUrl: null,
  instagramUrl: null,

  // Mentions légales
  companyLegalName: 'Faso Fret Logistics SAS',
  companyRegistration: null,
  vatNumber: null,
  copyrightYear: new Date().getFullYear(),
} as const;

/**
 * Type pour la configuration publique (sans métadonnées sensibles)
 * Utilisé dans les composants côté client
 */
export type PublicSystemConfig = Omit<SystemConfigData, 'id' | 'updatedById' | 'createdAt' | 'updatedAt'>;

/**
 * Récupère la configuration système depuis la base de données
 * Utilise un cache Next.js avec revalidation toutes les heures
 * Fallback aux valeurs par défaut si aucune configuration n'existe
 *
 * Le cache utilise le tag 'system-config' pour permettre l'invalidation
 * manuelle via revalidateTag('system-config') après modification
 *
 * @returns La configuration système (depuis DB ou valeurs par défaut)
 *
 * @example
 * // Récupérer la config dans un Server Component
 * const config = await getSystemConfig();
 *
 * // Utiliser dans le JSX
 * <h1>{config.platformName}</h1>
 */
export const getSystemConfig = unstable_cache(
  async (): Promise<PublicSystemConfig> => {
    try {
      // Récupérer la première (et unique) configuration (singleton)
      // On utilise le client Prisma standard car c'est une lecture publique
      const config = await prisma.systemConfig.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!config) {
        // Aucune configuration en base → utiliser les valeurs par défaut
        console.log('[getSystemConfig] Aucune configuration trouvée, utilisation des valeurs par défaut');
        return DEFAULT_SYSTEM_CONFIG;
      }

      // Retourner la configuration sans les métadonnées sensibles
      return {
        platformName: config.platformName,
        platformFullName: config.platformFullName,
        platformSlogan: config.platformSlogan,

        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,

        logoUrl: config.logoUrl,
        faviconUrl: config.faviconUrl,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,

        companyAddress: config.companyAddress,
        companyCity: config.companyCity,
        companyCountry: config.companyCountry,
        companyPostalCode: config.companyPostalCode,

        facebookUrl: config.facebookUrl,
        linkedinUrl: config.linkedinUrl,
        twitterUrl: config.twitterUrl,
        instagramUrl: config.instagramUrl,

        companyLegalName: config.companyLegalName,
        companyRegistration: config.companyRegistration,
        vatNumber: config.vatNumber,
        copyrightYear: config.copyrightYear,
      };
    } catch (error) {
      // En cas d'erreur de connexion ou autre, utiliser les valeurs par défaut
      // Cela permet à l'application de continuer à fonctionner
      console.error('[getSystemConfig] Erreur lors de la récupération de la configuration:', error);
      return DEFAULT_SYSTEM_CONFIG;
    }
  },
  ['system-config'], // Clé de cache unique
  {
    revalidate: 3600, // Cache pendant 1 heure (3600 secondes)
    tags: ['system-config'], // Tag pour invalidation manuelle via revalidateTag()
  }
);

/**
 * Récupère la configuration complète avec métadonnées (admin uniquement)
 * Cette fonction n'est PAS cachée car elle contient des données sensibles
 * et n'est utilisée que dans le back-office admin
 *
 * @returns La configuration complète avec ID et métadonnées, ou null
 */
export async function getFullSystemConfig(): Promise<SystemConfigData | null> {
  try {
    const config = await prisma.systemConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!config) {
      return null;
    }

    return config as SystemConfigData;
  } catch (error) {
    console.error('[getFullSystemConfig] Erreur:', error);
    return null;
  }
}
