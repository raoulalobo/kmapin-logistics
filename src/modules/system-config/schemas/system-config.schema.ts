/**
 * Schémas Zod pour la configuration système (SystemConfig)
 *
 * Ces schémas définissent la structure et les validations pour :
 * - La configuration complète de la plateforme
 * - Les mises à jour partielles (partial update)
 *
 * Utilisés à la fois côté client (formulaires) et côté serveur (actions)
 */

import { z } from 'zod';

/**
 * Expression régulière pour valider les couleurs hexadécimales
 * Accepte les formats : #RGB, #RRGGBB (avec ou sans #)
 */
const hexColorRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Expression régulière pour valider les URLs
 * Accepte http:// et https://
 */
const urlRegex = /^https?:\/\/.+/;

/**
 * Schéma complet pour la configuration système
 * Utilisé lors de la création initiale de la configuration
 *
 * Champs requis :
 * - platformName : Nom court de la plateforme
 * - platformFullName : Nom complet de la plateforme
 * - contactEmail : Email de contact principal
 * - primaryColor : Couleur primaire de la marque
 * - copyrightYear : Année de copyright
 */
export const systemConfigSchema = z.object({
  // ════════════════════════════════════════════
  // IDENTITÉ DE LA PLATEFORME
  // ════════════════════════════════════════════

  platformName: z
    .string()
    .min(1, 'Le nom de la plateforme est requis')
    .max(50, 'Le nom ne doit pas dépasser 50 caractères'),

  platformFullName: z
    .string()
    .min(1, 'Le nom complet est requis')
    .max(100, 'Le nom complet ne doit pas dépasser 100 caractères'),

  platformSlogan: z
    .string()
    .max(200, 'Le slogan ne doit pas dépasser 200 caractères')
    .nullable()
    .optional(),

  // ════════════════════════════════════════════
  // COORDONNÉES DE CONTACT
  // ════════════════════════════════════════════

  contactEmail: z
    .string()
    .email('Adresse email invalide')
    .max(100, 'L\'email ne doit pas dépasser 100 caractères'),

  contactPhone: z
    .string()
    .max(30, 'Le téléphone ne doit pas dépasser 30 caractères')
    .nullable()
    .optional(),

  // ════════════════════════════════════════════
  // BRANDING & IDENTITÉ VISUELLE
  // ════════════════════════════════════════════

  logoUrl: z
    .string()
    .regex(urlRegex, 'URL du logo invalide')
    .nullable()
    .optional(),

  faviconUrl: z
    .string()
    .regex(urlRegex, 'URL du favicon invalide')
    .nullable()
    .optional(),

  primaryColor: z
    .string()
    .regex(hexColorRegex, 'Couleur primaire invalide (format: #RRGGBB)')
    .transform((val) => (val.startsWith('#') ? val : `#${val}`)),

  secondaryColor: z
    .string()
    .regex(hexColorRegex, 'Couleur secondaire invalide (format: #RRGGBB)')
    .transform((val) => (val.startsWith('#') ? val : `#${val}`))
    .nullable()
    .optional(),

  // ════════════════════════════════════════════
  // ADRESSE DU SIÈGE SOCIAL
  // ════════════════════════════════════════════

  companyAddress: z
    .string()
    .max(200, 'L\'adresse ne doit pas dépasser 200 caractères')
    .nullable()
    .optional(),

  companyCity: z
    .string()
    .max(100, 'La ville ne doit pas dépasser 100 caractères')
    .nullable()
    .optional(),

  companyCountry: z
    .string()
    .max(100, 'Le pays ne doit pas dépasser 100 caractères')
    .nullable()
    .optional(),

  companyPostalCode: z
    .string()
    .max(20, 'Le code postal ne doit pas dépasser 20 caractères')
    .nullable()
    .optional(),

  // ════════════════════════════════════════════
  // RÉSEAUX SOCIAUX
  // ════════════════════════════════════════════

  facebookUrl: z
    .string()
    .regex(urlRegex, 'URL Facebook invalide')
    .nullable()
    .optional(),

  linkedinUrl: z
    .string()
    .regex(urlRegex, 'URL LinkedIn invalide')
    .nullable()
    .optional(),

  twitterUrl: z
    .string()
    .regex(urlRegex, 'URL Twitter invalide')
    .nullable()
    .optional(),

  instagramUrl: z
    .string()
    .regex(urlRegex, 'URL Instagram invalide')
    .nullable()
    .optional(),

  // ════════════════════════════════════════════
  // MENTIONS LÉGALES
  // ════════════════════════════════════════════

  companyLegalName: z
    .string()
    .max(150, 'La raison sociale ne doit pas dépasser 150 caractères')
    .nullable()
    .optional(),

  companyRegistration: z
    .string()
    .max(50, 'Le numéro d\'immatriculation ne doit pas dépasser 50 caractères')
    .nullable()
    .optional(),

  vatNumber: z
    .string()
    .max(30, 'Le numéro de TVA ne doit pas dépasser 30 caractères')
    .nullable()
    .optional(),

  copyrightYear: z
    .number()
    .int()
    .min(2000, 'L\'année doit être supérieure à 2000')
    .max(2100, 'L\'année doit être inférieure à 2100'),
});

/**
 * Type TypeScript généré depuis le schéma complet
 */
export type SystemConfigInput = z.infer<typeof systemConfigSchema>;

/**
 * Schéma pour les mises à jour partielles de la configuration
 * Tous les champs sont optionnels (partial update)
 *
 * Utilisé par updateSystemConfig() pour permettre de ne modifier
 * que certains champs sans avoir à fournir toute la configuration
 */
export const updateSystemConfigSchema = systemConfigSchema.partial();

/**
 * Type TypeScript pour les mises à jour partielles
 */
export type UpdateSystemConfigInput = z.infer<typeof updateSystemConfigSchema>;

/**
 * Interface pour la configuration système complète (avec métadonnées)
 * Représente les données telles qu'elles sont stockées en base
 *
 * Utilisé pour typer le retour des fonctions de récupération
 */
export interface SystemConfigData {
  id: string;

  // Identité
  platformName: string;
  platformFullName: string;
  platformSlogan: string | null;

  // Contact
  contactEmail: string;
  contactPhone: string | null;

  // Branding
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;

  // Adresse
  companyAddress: string | null;
  companyCity: string | null;
  companyCountry: string | null;
  companyPostalCode: string | null;

  // Réseaux sociaux
  facebookUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;

  // Mentions légales
  companyLegalName: string | null;
  companyRegistration: string | null;
  vatNumber: string | null;
  copyrightYear: number;

  // Métadonnées
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schéma pour valider un onglet de configuration
 * Utilisé pour la navigation dans l'interface admin
 */
export const configTabSchema = z.enum([
  'identity',
  'contact',
  'branding',
  'address',
  'social',
  'legal',
]);

export type ConfigTab = z.infer<typeof configTabSchema>;
