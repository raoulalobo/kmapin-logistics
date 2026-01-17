/**
 * Schémas de Validation : Module Users
 *
 * Schémas Zod pour la validation des données utilisateurs
 * dans toutes les opérations CRUD (création, modification, recherche)
 *
 * @module modules/users/schemas
 */

import { z } from 'zod';

/**
 * Enum des rôles utilisateur (synchronisé avec Prisma)
 */
export const UserRoleEnum = z.enum([
  'ADMIN',
  'OPERATIONS_MANAGER',
  'FINANCE_MANAGER',
  'CLIENT',
  'VIEWER',
]);

/**
 * Type TypeScript pour les rôles
 */
export type UserRole = z.infer<typeof UserRoleEnum>;

/**
 * Schéma : Création d'un utilisateur
 *
 * Utilisé dans createUserAction pour valider les données
 * lors de la création d'un nouvel utilisateur par un admin
 *
 * Champs :
 * - email* : Adresse email unique (validée)
 * - name* : Nom complet (2-100 caractères)
 * - phone : Téléphone optionnel (format international)
 * - role* : Rôle de l'utilisateur (défaut: CLIENT)
 * - clientId : ID de l'entreprise associée (optionnel)
 * - sendInvitation : Envoyer email d'invitation (défaut: true)
 */
export const userCreateSchema = z.object({
  email: z
    .string({ required_error: 'L\'email est requis' })
    .email('Email invalide')
    .min(5, 'L\'email doit contenir au moins 5 caractères')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères')
    .toLowerCase()
    .trim(),

  name: z
    .string({ required_error: 'Le nom est requis' })
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),

  phone: z
    .string()
    .regex(
      /^[\d\s\+\-\(\)]+$/,
      'Le téléphone ne peut contenir que des chiffres et symboles (+, -, (, ), espaces)'
    )
    .min(10, 'Le téléphone doit contenir au moins 10 caractères')
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .optional()
    .nullable()
    .or(z.literal('')),

  role: UserRoleEnum.default('CLIENT'),

  clientId: z
    .string()
    .cuid('ID d\'entreprise invalide')
    .optional()
    .nullable()
    .or(z.literal('')),

  sendInvitation: z.boolean().default(true),
});

/**
 * Type TypeScript pour les données de création
 */
export type UserCreateData = z.infer<typeof userCreateSchema>;

/**
 * Schéma : Modification du rôle d'un utilisateur
 *
 * Utilisé dans updateUserRoleAction pour valider
 * le nouveau rôle attribué à un utilisateur
 */
export const userRoleUpdateSchema = z.object({
  role: UserRoleEnum,
});

/**
 * Type TypeScript pour la modification de rôle
 */
export type UserRoleUpdateData = z.infer<typeof userRoleUpdateSchema>;

/**
 * Schéma : Gestion des permissions personnalisées
 *
 * Utilisé dans updateUserPermissionsAction pour valider
 * les permissions custom ajoutées/retirées à un utilisateur
 *
 * Format :
 * - Array de strings au format "resource:action" ou "resource:action:scope"
 * - Exemples : ["clients:read", "shipments:create", "invoices:read:own"]
 */
export const userPermissionsSchema = z.object({
  permissions: z
    .array(
      z
        .string()
        .regex(
          /^[a-z]+:[a-z]+(:own)?$/,
          'Permission invalide. Format attendu: "resource:action" ou "resource:action:scope"'
        )
    )
    .default([]),
});

/**
 * Type TypeScript pour les permissions
 */
export type UserPermissionsData = z.infer<typeof userPermissionsSchema>;

/**
 * Schéma : Activation/Désactivation d'un compte utilisateur
 *
 * Utilisé dans toggleUserStatusAction pour activer/désactiver
 * un compte utilisateur (modifie le champ emailVerified)
 *
 * Champs :
 * - active : true = actif, false = désactivé
 * - reason : Raison optionnelle de la désactivation
 */
export const userStatusSchema = z.object({
  active: z.boolean(),

  reason: z
    .string()
    .min(10, 'La raison doit contenir au moins 10 caractères')
    .max(500, 'La raison ne peut pas dépasser 500 caractères')
    .optional()
    .nullable(),
});

/**
 * Type TypeScript pour le statut
 */
export type UserStatusData = z.infer<typeof userStatusSchema>;

/**
 * Schéma : Assignation d'un utilisateur à une entreprise
 *
 * Utilisé dans assignUserCompanyAction pour associer
 * ou dissocier un utilisateur d'une entreprise
 */
export const userCompanySchema = z.object({
  clientId: z
    .string()
    .cuid('ID d\'entreprise invalide')
    .nullable()
    .or(z.literal('')),
});

/**
 * Type TypeScript pour l'assignation entreprise
 */
export type UserCompanyData = z.infer<typeof userCompanySchema>;

/**
 * Schéma : Recherche et filtrage d'utilisateurs
 *
 * Utilisé dans getUsersAction pour valider les paramètres
 * de pagination, recherche et filtrage
 *
 * Champs :
 * - page : Numéro de page (défaut: 1)
 * - limit : Nombre de résultats par page (défaut: 10, max: 100)
 * - search : Terme de recherche (nom ou email)
 * - role : Filtre par rôle
 * - status : Filtre par statut (all, active, inactive)
 * - clientId : Filtre par entreprise
 */
export const userSearchSchema = z.object({
  page: z
    .number()
    .int('La page doit être un nombre entier')
    .min(1, 'La page doit être au moins 1')
    .default(1),

  limit: z
    .number()
    .int('La limite doit être un nombre entier')
    .min(1, 'La limite doit être au moins 1')
    .max(100, 'La limite ne peut pas dépasser 100')
    .default(10),

  search: z.string().max(100).optional().nullable(),

  role: UserRoleEnum.optional().nullable(),

  status: z.enum(['all', 'active', 'inactive']).default('all'),

  clientId: z.string().cuid().optional().nullable(),
});

/**
 * Type TypeScript pour les paramètres de recherche
 */
export type UserSearchParams = z.infer<typeof userSearchSchema>;
