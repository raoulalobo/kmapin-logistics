/**
 * Schémas Zod pour la validation des données de demandes d'enlèvement
 *
 * Organisation :
 * - Schémas de base : Validation des champs individuels
 * - Schémas de création : US-1.1 (guest) et US-1.4 (connecté)
 * - Schémas de mise à jour : US-3.2 (statut) et US-3.3 (annulation)
 * - Schémas de suivi : US-1.2 (tracking par token)
 */

import { z } from 'zod';
import { PickupStatus, PickupTimeSlot } from '@/lib/db/enums';

// ============================================
// CONSTANTES DE VALIDATION
// ============================================

/**
 * Messages d'erreur personnalisés en français
 */
const MESSAGES = {
  required: 'Ce champ est obligatoire',
  email: 'Email invalide',
  phone: 'Numéro de téléphone invalide (format: +33XXXXXXXXX ou 0XXXXXXXXX)',
  postalCode: 'Code postal invalide',
  positiveNumber: 'Le nombre doit être positif',
  minDate: 'La date doit être dans le futur',
  minWeight: 'Le poids doit être supérieur à 0',
  minVolume: 'Le volume doit être supérieur à 0',
  minPackages: 'Le nombre de colis doit être au moins 1',
  maxLength: (max: number) => `Maximum ${max} caractères`,
};

// ============================================
// SCHÉMAS DE BASE
// ============================================

/**
 * Validation d'email français
 */
const emailSchema = z
  .string({ required_error: MESSAGES.required })
  .email(MESSAGES.email)
  .toLowerCase()
  .trim();

/**
 * Validation de téléphone français
 * Accepte : +33XXXXXXXXX, 0XXXXXXXXX, +33 X XX XX XX XX
 */
const phoneSchema = z
  .string({ required_error: MESSAGES.required })
  .regex(
    /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
    MESSAGES.phone
  )
  .transform((val) => val.replace(/[\s.-]/g, '')); // Nettoyer les espaces et tirets

/**
 * Validation de code postal français
 * Format: 5 chiffres
 */
const postalCodeSchema = z
  .string({ required_error: MESSAGES.required })
  .regex(/^\d{5}$/, MESSAGES.postalCode);

/**
 * Validation de date future (pour requestedDate)
 */
const futureDateSchema = z
  .string({ required_error: MESSAGES.required })
  .or(z.date())
  .pipe(
    z.coerce.date().refine(
      (date) => date > new Date(),
      { message: MESSAGES.minDate }
    )
  );

// ============================================
// SCHÉMA DE CRÉATION SANS COMPTE (US-1.1)
// ============================================

/**
 * Schéma pour créer une demande d'enlèvement SANS compte
 *
 * User Story US-1.1 :
 * En tant qu'utilisateur non connecté, je veux créer une demande
 * d'enlèvement complète sans créer de compte
 *
 * Workflow :
 * 1. Formulaire public accessible à tous
 * 2. Génération automatique de trackingNumber et trackingToken
 * 3. Email de confirmation avec lien de suivi (72h)
 * 4. Proposition de création de compte
 */
export const createGuestPickupSchema = z.object({
  // ============================================
  // CONTACT (obligatoire pour matching US-1.3)
  // ============================================
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  contactName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, MESSAGES.maxLength(100))
    .optional(),

  // ============================================
  // ADRESSE D'ENLÈVEMENT (obligatoire)
  // ============================================
  pickupAddress: z
    .string({ required_error: MESSAGES.required })
    .min(5, 'L\'adresse doit contenir au moins 5 caractères')
    .max(200, MESSAGES.maxLength(200)),

  pickupCity: z
    .string({ required_error: MESSAGES.required })
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, MESSAGES.maxLength(100)),

  pickupPostalCode: postalCodeSchema,

  pickupCountry: z
    .string()
    .length(2, 'Code pays ISO à 2 lettres (ex: FR)')
    .toUpperCase()
    .default('FR'),

  // ============================================
  // PLANIFICATION (obligatoire)
  // ============================================
  requestedDate: futureDateSchema,

  timeSlot: z
    .nativeEnum(PickupTimeSlot, {
      required_error: 'Veuillez sélectionner un créneau horaire',
    })
    .default(PickupTimeSlot.FLEXIBLE),

  pickupTime: z
    .string()
    .transform((val) => val === '' ? undefined : val)
    .optional()
    .refine(
      (val) => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val),
      { message: 'Format HH:MM requis (ex: 14:30)' }
    ),

  // ============================================
  // DÉTAILS MARCHANDISE (optionnel)
  // ============================================
  cargoType: z
    .string()
    .max(100, MESSAGES.maxLength(100))
    .optional(),

  estimatedWeight: z
    .number({ invalid_type_error: 'Le poids doit être un nombre' })
    .positive(MESSAGES.minWeight)
    .max(100000, 'Le poids ne peut pas dépasser 100 000 kg')
    .optional(),

  estimatedVolume: z
    .number({ invalid_type_error: 'Le volume doit être un nombre' })
    .positive(MESSAGES.minVolume)
    .max(1000, 'Le volume ne peut pas dépasser 1000 m³')
    .optional(),

  packageCount: z
    .number({ invalid_type_error: 'Le nombre de colis doit être un nombre' })
    .int('Le nombre de colis doit être un entier')
    .min(1, MESSAGES.minPackages)
    .max(10000, 'Le nombre de colis ne peut pas dépasser 10 000')
    .optional(),

  description: z
    .string()
    .max(2000, MESSAGES.maxLength(2000))
    .optional(),

  // ============================================
  // INSTRUCTIONS (optionnel)
  // ============================================
  specialInstructions: z
    .string()
    .max(1000, MESSAGES.maxLength(1000))
    .optional(),

  accessInstructions: z
    .string()
    .max(1000, MESSAGES.maxLength(1000))
    .optional(),
}).refine(
  // Validation croisée : pickupTime obligatoire si timeSlot = SPECIFIC_TIME
  (data) => {
    if (data.timeSlot === PickupTimeSlot.SPECIFIC_TIME) {
      return !!data.pickupTime;
    }
    return true;
  },
  {
    message: 'L\'heure précise est obligatoire pour le créneau "Heure précise"',
    path: ['pickupTime'],
  }
);

/**
 * Type TypeScript inféré du schéma
 */
export type CreateGuestPickupInput = z.infer<typeof createGuestPickupSchema>;

// ============================================
// SCHÉMA DE CRÉATION AVEC COMPTE (US-1.4)
// ============================================

/**
 * Schéma pour créer une demande d'enlèvement AVEC compte
 *
 * User Story US-1.4 :
 * En tant qu'utilisateur connecté, je veux créer une demande
 * d'enlèvement liée à mon compte
 *
 * Différences avec guest :
 * - userId automatiquement rempli depuis la session
 * - clientId déduit de la session
 * - isAttachedToAccount = true dès la création
 * - Pré-remplissage possible depuis le profil
 */
export const createPickupSchema = createGuestPickupSchema.merge(
  z.object({
    // Champs additionnels optionnels pour les utilisateurs connectés
    shipmentId: z
      .string()
      .cuid('ID d\'expédition invalide')
      .optional(),

    // Notes internes (visibles uniquement par l'équipe)
    internalNotes: z
      .string()
      .max(2000, MESSAGES.maxLength(2000))
      .optional(),
  })
);

/**
 * Type TypeScript inféré du schéma
 */
export type CreatePickupInput = z.infer<typeof createPickupSchema>;

// ============================================
// SCHÉMA DE MISE À JOUR DE STATUT (US-3.2)
// ============================================

/**
 * Schéma pour changer le statut d'une demande
 *
 * User Story US-3.2 :
 * En tant qu'agent, je veux changer le statut d'une demande
 * selon le workflow défini
 *
 * Workflow autorisé :
 * - NOUVEAU → PRISE_EN_CHARGE
 * - PRISE_EN_CHARGE → EFFECTUE
 * - * → ANNULE (avec raison obligatoire, voir US-3.3)
 */
export const updatePickupStatusSchema = z.object({
  pickupId: z
    .string({ required_error: MESSAGES.required })
    .cuid('ID de demande invalide'),

  newStatus: z.nativeEnum(PickupStatus, {
    required_error: 'Statut invalide',
  }),

  notes: z
    .string()
    .max(2000, MESSAGES.maxLength(2000))
    .optional(),

  // Champs optionnels pour EFFECTUE
  actualPickupDate: z
    .string()
    .or(z.date())
    .pipe(z.coerce.date())
    .optional(),

  completionNotes: z
    .string()
    .max(2000, MESSAGES.maxLength(2000))
    .optional(),
});

/**
 * Type TypeScript inféré du schéma
 */
export type UpdatePickupStatusInput = z.infer<typeof updatePickupStatusSchema>;

// ============================================
// SCHÉMA D'ANNULATION (US-3.3)
// ============================================

/**
 * Schéma pour annuler une demande avec raison obligatoire
 *
 * User Story US-3.3 :
 * En tant qu'agent, je veux pouvoir annuler une demande
 * avec justification obligatoire
 */
export const cancelPickupSchema = z.object({
  pickupId: z
    .string({ required_error: MESSAGES.required })
    .cuid('ID de demande invalide'),

  cancellationReason: z
    .string({ required_error: 'La raison d\'annulation est obligatoire' })
    .min(10, 'La raison doit contenir au moins 10 caractères')
    .max(2000, MESSAGES.maxLength(2000)),
});

/**
 * Type TypeScript inféré du schéma
 */
export type CancelPickupInput = z.infer<typeof cancelPickupSchema>;

// ============================================
// SCHÉMA DE SUIVI PAR TOKEN (US-1.2)
// ============================================

/**
 * Schéma pour suivre une demande via token public
 *
 * User Story US-1.2 :
 * En tant qu'utilisateur avec token, je veux suivre
 * l'état de ma demande sans compte
 */
export const trackPickupByTokenSchema = z.object({
  trackingToken: z
    .string({ required_error: MESSAGES.required })
    .cuid('Token de suivi invalide'),
});

/**
 * Type TypeScript inféré du schéma
 */
export type TrackPickupByTokenInput = z.infer<typeof trackPickupByTokenSchema>;

// ============================================
// SCHÉMA D'ASSIGNATION DE TRANSPORTEUR
// ============================================

/**
 * Schéma pour assigner un transporteur à une demande
 */
export const assignDriverSchema = z.object({
  pickupId: z
    .string({ required_error: MESSAGES.required })
    .cuid('ID de demande invalide'),

  transporterId: z
    .string()
    .cuid('ID de transporteur invalide')
    .optional(),

  driverName: z
    .string()
    .min(2, 'Le nom du chauffeur doit contenir au moins 2 caractères')
    .max(100, MESSAGES.maxLength(100))
    .optional(),

  driverPhone: phoneSchema.optional(),

  vehiclePlate: z
    .string()
    .max(20, MESSAGES.maxLength(20))
    .optional(),
});

/**
 * Type TypeScript inféré du schéma
 */
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;

// ============================================
// SCHÉMA DE PLANIFICATION
// ============================================

/**
 * Schéma pour planifier/replanifier une demande
 */
export const schedulePickupSchema = z.object({
  pickupId: z
    .string({ required_error: MESSAGES.required })
    .cuid('ID de demande invalide'),

  scheduledDate: futureDateSchema,

  timeSlot: z
    .nativeEnum(PickupTimeSlot, {
      required_error: 'Veuillez sélectionner un créneau horaire',
    }),

  pickupTime: z
    .string()
    .transform((val) => val === '' ? undefined : val)
    .optional()
    .refine(
      (val) => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val),
      { message: 'Format HH:MM requis (ex: 14:30)' }
    ),

  notes: z
    .string()
    .max(1000, MESSAGES.maxLength(1000))
    .optional(),
}).refine(
  (data) => {
    if (data.timeSlot === PickupTimeSlot.SPECIFIC_TIME) {
      return !!data.pickupTime;
    }
    return true;
  },
  {
    message: 'L\'heure précise est obligatoire pour le créneau "Heure précise"',
    path: ['pickupTime'],
  }
);

/**
 * Type TypeScript inféré du schéma
 */
export type SchedulePickupInput = z.infer<typeof schedulePickupSchema>;
