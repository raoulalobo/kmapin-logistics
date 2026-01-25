/**
 * Module de configuration système (SystemConfig)
 *
 * Ce module gère la configuration globale de la plateforme :
 * - Identité (nom, slogan)
 * - Contact (email, téléphone)
 * - Branding (logo, couleurs)
 * - Adresse du siège
 * - Réseaux sociaux
 * - Mentions légales
 *
 * @module system-config
 *
 * @example
 * // Lecture publique (dans un Server Component)
 * import { getSystemConfig } from '@/modules/system-config';
 * const config = await getSystemConfig();
 *
 * // Mise à jour admin (dans une Server Action)
 * import { updateSystemConfigAction } from '@/modules/system-config';
 * await updateSystemConfigAction({ platformName: 'Nouveau Nom' });
 */

// ════════════════════════════════════════════
// SCHÉMAS ZOD & TYPES
// ════════════════════════════════════════════

export {
  // Schémas de validation
  systemConfigSchema,
  updateSystemConfigSchema,
  configTabSchema,

  // Types TypeScript
  type SystemConfigInput,
  type UpdateSystemConfigInput,
  type SystemConfigData,
  type ConfigTab,
} from './schemas/system-config.schema';

// ════════════════════════════════════════════
// FONCTIONS UTILITAIRES (LECTURE)
// ════════════════════════════════════════════

export {
  // Fonction principale de lecture (cachée)
  getSystemConfig,

  // Lecture complète pour admin
  getFullSystemConfig,

  // Valeurs par défaut
  DEFAULT_SYSTEM_CONFIG,

  // Type public (sans métadonnées)
  type PublicSystemConfig,
} from './lib/get-system-config';

// ════════════════════════════════════════════
// SERVER ACTIONS (MODIFICATION)
// ════════════════════════════════════════════

export {
  // Actions principales
  getSystemConfigAction,
  updateSystemConfigAction,
  initSystemConfigAction,
  resetSystemConfigAction,

  // Actions spécialisées
  updateLogoAction,
  updateFaviconAction,
  updateBrandColorsAction,
  updateContactAction,
  updateSocialLinksAction,
  updateLegalInfoAction,
  updateCompanyAddressAction,
} from './actions/system-config.actions';
