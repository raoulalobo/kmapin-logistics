/**
 * Schemas Zod : Dépôts (Depots)
 *
 * Validation des données pour la création et modification de dépôts
 * et de leurs contacts. Utilisés côté client (React Hook Form) et serveur (Server Actions).
 *
 * @module modules/depots/schemas
 */

import { z } from 'zod';

// ════════════════════════════════════════════
// SCHEMAS DÉPÔT
// ════════════════════════════════════════════

/**
 * Schema de création d'un dépôt
 *
 * - `code` : alphanumérique + tirets, 2-20 caractères, ex: "OUA-01"
 * - `name` : nom descriptif du dépôt, 2-100 caractères
 * - `address`, `city`, `country` : obligatoires
 * - `isDefault` : si true, les autres dépôts perdent leur flag default (géré côté action)
 */
export const createDepotSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  code: z
    .string()
    .min(2, 'Le code doit contenir au moins 2 caractères')
    .max(20, 'Le code ne peut pas dépasser 20 caractères')
    .regex(
      /^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$|^[A-Z0-9]{1,2}$/,
      'Le code doit être en majuscules, chiffres et tirets (ex: OUA-01)'
    )
    .transform((val) => val.toUpperCase()),
  description: z.string().max(500, 'La description ne peut pas dépasser 500 caractères').optional(),

  // Adresse
  address: z.string().min(2, "L'adresse est requise"),
  city: z.string().min(2, 'La ville est requise'),
  country: z.string().min(2, 'Le pays est requis').default('Burkina Faso'),
  postalCode: z.string().max(20).optional(),

  // Contact rapide (dénormalisé)
  phone: z.string().max(30).optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),

  // Flags
  isDefault: z.boolean().default(false),
});

/**
 * Schema de mise à jour d'un dépôt (tous les champs sont optionnels)
 */
export const updateDepotSchema = createDepotSchema.partial();

// ════════════════════════════════════════════
// SCHEMAS CONTACT
// ════════════════════════════════════════════

/**
 * Schema d'un contact de dépôt
 *
 * - `name` : nom complet obligatoire
 * - `role` : fonction dans le dépôt (optionnel)
 * - `isPrimary` : si true, les autres contacts du même dépôt perdent leur flag (géré côté action)
 */
export const depotContactSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  role: z.string().max(100, 'Le rôle ne peut pas dépasser 100 caractères').optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  isPrimary: z.boolean().default(false),
});

// ════════════════════════════════════════════
// TYPES INFÉRÉS
// ════════════════════════════════════════════

/** Données pour créer un dépôt */
export type CreateDepotData = z.infer<typeof createDepotSchema>;

/** Données pour mettre à jour un dépôt */
export type UpdateDepotData = z.infer<typeof updateDepotSchema>;

/** Données pour un contact de dépôt */
export type DepotContactData = z.infer<typeof depotContactSchema>;
