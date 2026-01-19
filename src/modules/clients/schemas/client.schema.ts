/**
 * Schémas de validation : Clients
 *
 * Définition des schémas Zod pour valider les données
 * des clients (création, modification)
 *
 * Note : Les validations téléphone et code postal sont internationales
 * et supportent les formats de plusieurs pays (France, Burkina Faso,
 * Côte d'Ivoire, Sénégal, Mali, etc.).
 */

import { z } from 'zod';
import {
  emailSchema,
  phoneSchemaOptional,
  postalCodeSchemaOptional,
  countryCodeSchema,
  VALIDATION_MESSAGES,
} from '@/lib/validators';

/**
 * Schéma de validation pour la création/modification d'un client
 *
 * Valide toutes les informations d'une entreprise cliente :
 * - Informations légales (nom, raison sociale, SIRET)
 * - Coordonnées (email, téléphone, adresse)
 * - Informations complémentaires (site web)
 */
export const clientSchema = z.object({
  // Informations de l'entreprise
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),

  legalName: z
    .string()
    .min(2, 'La raison sociale doit contenir au moins 2 caractères')
    .max(200, 'La raison sociale ne peut pas dépasser 200 caractères')
    .optional()
    .nullable(),

  taxId: z
    .string()
    .min(9, 'Le numéro SIRET/TVA doit contenir au moins 9 caractères')
    .max(50, 'Le numéro SIRET/TVA ne peut pas dépasser 50 caractères')
    .optional()
    .nullable(),

  // ============================================
  // COORDONNÉES
  // ============================================
  email: emailSchema
    .pipe(z.string().max(100, VALIDATION_MESSAGES.maxLength(100))),

  phone: phoneSchemaOptional.nullable(),

  // ============================================
  // ADRESSE
  // ============================================
  address: z
    .string()
    .min(5, "L'adresse doit contenir au moins 5 caractères")
    .max(200, "L'adresse ne peut pas dépasser 200 caractères"),

  city: z
    .string()
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, 'La ville ne peut pas dépasser 100 caractères'),

  postalCode: postalCodeSchemaOptional.nullable(),

  country: countryCodeSchema,

  // Informations complémentaires
  website: z
    .string()
    .url('URL du site web invalide')
    .max(200, "L'URL ne peut pas dépasser 200 caractères")
    .optional()
    .nullable(),
});

/**
 * Type TypeScript inféré du schéma
 * Utilisé pour le typage dans les composants et actions
 */
export type ClientFormData = z.infer<typeof clientSchema>;

/**
 * Schéma partiel pour les mises à jour
 * Tous les champs sont optionnels
 */
export const clientUpdateSchema = clientSchema.partial();

/**
 * Type pour les mises à jour partielles
 */
export type ClientUpdateData = z.infer<typeof clientUpdateSchema>;

/**
 * Schéma pour la recherche/filtrage de clients
 */
export const clientSearchSchema = z.object({
  query: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

/**
 * Type pour les paramètres de recherche
 */
export type ClientSearchParams = z.infer<typeof clientSearchSchema>;
