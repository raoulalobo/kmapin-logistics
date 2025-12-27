/**
 * Schémas de validation pour les pays
 *
 * Définit les schémas Zod pour la validation des formulaires de gestion des pays
 */
import { z } from 'zod';

/**
 * Schéma de création d'un pays
 *
 * Valide les données lors de l'ajout d'un nouveau pays dans le système
 *
 * @example
 * ```ts
 * const data = createCountrySchema.parse({
 *   code: "FR",
 *   name: "France",
 *   isActive: true
 * });
 * ```
 */
export const createCountrySchema = z.object({
  code: z
    .string()
    .min(2, 'Le code pays doit contenir au moins 2 caractères')
    .max(2, 'Le code pays doit contenir exactement 2 caractères')
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Le code pays doit être au format ISO 3166-1 alpha-2 (ex: FR, DE, US)'),
  name: z
    .string()
    .min(2, 'Le nom du pays doit contenir au moins 2 caractères')
    .max(100, 'Le nom du pays ne peut pas dépasser 100 caractères'),
  isActive: z.boolean().default(true),
});

/**
 * Schéma de mise à jour d'un pays
 *
 * Tous les champs sont optionnels pour permettre une mise à jour partielle
 *
 * @example
 * ```ts
 * const data = updateCountrySchema.parse({
 *   name: "République Française",
 *   isActive: false
 * });
 * ```
 */
export const updateCountrySchema = z.object({
  code: z
    .string()
    .min(2)
    .max(2)
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  name: z
    .string()
    .min(2)
    .max(100)
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * Type TypeScript inféré pour la création d'un pays
 */
export type CreateCountryInput = z.infer<typeof createCountrySchema>;

/**
 * Type TypeScript inféré pour la mise à jour d'un pays
 */
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>;
