/**
 * Schémas de validation : Demandes d'Enlèvement (PickupRequests)
 *
 * Définition des schémas Zod pour valider les données
 * des demandes d'enlèvement (création, modification, recherche)
 *
 * @module modules/pickups/schemas
 */

import { z } from 'zod';
import { PickupStatus, PickupTimeSlot } from '@/generated/prisma';

/**
 * Schéma de validation pour la création d'une demande d'enlèvement
 *
 * Valide toutes les informations d'une demande :
 * - Lien avec l'expédition
 * - Informations de collecte (adresse, contact)
 * - Planification (date, créneau horaire)
 * - Instructions spéciales
 */
export const pickupRequestSchema = z.object({
  // === Expédition liée ===
  shipmentId: z
    .string()
    .cuid('ID d\'expédition invalide'),

  // === Informations de collecte ===
  pickupAddress: z
    .string()
    .min(5, 'L\'adresse de collecte doit contenir au moins 5 caractères')
    .max(200, 'L\'adresse de collecte ne peut pas dépasser 200 caractères'),

  pickupCity: z
    .string()
    .min(2, 'La ville de collecte doit contenir au moins 2 caractères')
    .max(100, 'La ville de collecte ne peut pas dépasser 100 caractères'),

  pickupPostalCode: z
    .string()
    .regex(/^[\d\w\s\-]+$/, 'Code postal de collecte invalide')
    .min(2, 'Le code postal de collecte doit contenir au moins 2 caractères')
    .max(20, 'Le code postal de collecte ne peut pas dépasser 20 caractères'),

  pickupCountry: z
    .string()
    .length(2, 'Le code pays doit être au format ISO (2 lettres)')
    .regex(/^[A-Z]{2}$/, 'Le code pays doit être en majuscules (ex: FR, US)'),

  pickupContact: z
    .string()
    .min(2, 'Le nom du contact doit contenir au moins 2 caractères')
    .max(100, 'Le nom du contact ne peut pas dépasser 100 caractères')
    .optional()
    .nullable(),

  pickupPhone: z
    .string()
    .regex(
      /^[\d\s\+\-\(\)]+$/,
      'Le numéro de téléphone contient des caractères invalides'
    )
    .min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres')
    .max(20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères')
    .optional()
    .nullable(),

  // === Planification ===
  requestedDate: z
    .string()
    .datetime('Date de collecte invalide')
    .or(z.date())
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),

  timeSlot: z
    .nativeEnum(PickupTimeSlot, {
      errorMap: () => ({ message: 'Créneau horaire invalide' }),
    })
    .default('FLEXIBLE'),

  pickupTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:MM attendu)')
    .optional()
    .nullable()
    .refine((val, ctx) => {
      // Si timeSlot est SPECIFIC_TIME, pickupTime est obligatoire
      const timeSlot = ctx.path[0] === 'timeSlot' ? ctx.parent.timeSlot : undefined;
      if (timeSlot === 'SPECIFIC_TIME' && !val) {
        return false;
      }
      return true;
    }, 'L\'heure est obligatoire pour un créneau SPECIFIC_TIME'),

  // === Instructions ===
  specialInstructions: z
    .string()
    .max(500, 'Les instructions spéciales ne peuvent pas dépasser 500 caractères')
    .optional()
    .nullable(),

  accessInstructions: z
    .string()
    .max(500, 'Les instructions d\'accès ne peuvent pas dépasser 500 caractères')
    .optional()
    .nullable(),

  internalNotes: z
    .string()
    .max(1000, 'Les notes internes ne peuvent pas dépasser 1000 caractères')
    .optional()
    .nullable(),

  // === Company (dénormalisé depuis shipment) ===
  companyId: z
    .string()
    .cuid('ID de company invalide'),
});

/**
 * Type TypeScript inféré du schéma de création
 * Utilisé pour le typage dans les composants et actions
 */
export type PickupRequestFormData = z.infer<typeof pickupRequestSchema>;

/**
 * Schéma pour la mise à jour d'une demande d'enlèvement
 * Tous les champs sont optionnels sauf le statut pour respecter les transitions
 */
export const pickupRequestUpdateSchema = pickupRequestSchema
  .partial()
  .extend({
    // Planification confirmée (remplie par l'opérateur)
    scheduledDate: z
      .string()
      .datetime('Date planifiée invalide')
      .optional()
      .nullable(),

    // Date réelle de l'enlèvement
    actualPickupDate: z
      .string()
      .datetime('Date réelle d\'enlèvement invalide')
      .optional()
      .nullable(),

    // Transporteur assigné
    transporterId: z.string().cuid('ID de transporteur invalide').optional().nullable(),
    driverName: z.string().max(100).optional().nullable(),
    driverPhone: z.string().regex(/^[\d\s\+\-\(\)]+$/).max(20).optional().nullable(),
    vehiclePlate: z.string().max(20).optional().nullable(),

    // Notes après enlèvement
    completionNotes: z.string().max(1000).optional().nullable(),

    // Notifications
    notificationSent: z.boolean().optional(),
    reminderSent: z.boolean().optional(),
    confirmationSent: z.boolean().optional(),
  });

/**
 * Type pour les mises à jour partielles
 */
export type PickupRequestUpdateData = z.infer<typeof pickupRequestUpdateSchema>;

/**
 * Schéma pour la mise à jour du statut d'une demande d'enlèvement
 * Gère les transitions de workflow : REQUESTED → SCHEDULED → IN_PROGRESS → COMPLETED
 */
export const pickupStatusUpdateSchema = z.object({
  status: z.nativeEnum(PickupStatus, {
    errorMap: () => ({ message: 'Statut invalide' }),
  }),
  notes: z
    .string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .optional(),

  // Champs obligatoires selon le statut
  scheduledDate: z
    .string()
    .datetime()
    .optional()
    .refine((val, ctx) => {
      const status = ctx.parent.status;
      // Si status = SCHEDULED, scheduledDate est obligatoire
      if (status === 'SCHEDULED' && !val) {
        return false;
      }
      return true;
    }, 'La date planifiée est obligatoire pour le statut SCHEDULED'),

  actualPickupDate: z
    .string()
    .datetime()
    .optional()
    .refine((val, ctx) => {
      const status = ctx.parent.status;
      // Si status = COMPLETED, actualPickupDate est obligatoire
      if (status === 'COMPLETED' && !val) {
        return false;
      }
      return true;
    }, 'La date réelle d\'enlèvement est obligatoire pour le statut COMPLETED'),
});

/**
 * Type pour la mise à jour du statut
 */
export type PickupStatusUpdate = z.infer<typeof pickupStatusUpdateSchema>;

/**
 * Schéma pour la recherche/filtrage de demandes d'enlèvement
 */
export const pickupSearchSchema = z.object({
  // Recherche textuelle
  query: z.string().max(100).optional(),

  // Filtres par statut
  status: z.nativeEnum(PickupStatus).optional(),

  // Filtres par company
  companyId: z.string().cuid().optional(),

  // Filtres par transporteur
  transporterId: z.string().cuid().optional(),

  // Filtres par dates
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  // Filtre par créneau horaire
  timeSlot: z.nativeEnum(PickupTimeSlot).optional(),

  // Filtres par pays
  pickupCountry: z.string().length(2).optional(),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),

  // Tri
  sortBy: z.enum(['createdAt', 'requestedDate', 'scheduledDate', 'status']).default('requestedDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Type pour les paramètres de recherche
 */
export type PickupSearchParams = z.infer<typeof pickupSearchSchema>;

/**
 * Schéma pour assigner un transporteur
 */
export const assignTransporterSchema = z.object({
  transporterId: z.string().cuid('ID de transporteur invalide'),
  driverName: z.string().min(2).max(100).optional().nullable(),
  driverPhone: z.string().regex(/^[\d\s\+\-\(\)]+$/).max(20).optional().nullable(),
  vehiclePlate: z.string().max(20).optional().nullable(),
  scheduledDate: z.string().datetime('Date planifiée invalide').optional().nullable(),
});

/**
 * Type pour l'assignation de transporteur
 */
export type AssignTransporterData = z.infer<typeof assignTransporterSchema>;
