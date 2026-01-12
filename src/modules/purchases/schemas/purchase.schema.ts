/**
 * Schémas Zod pour la validation des données de demandes d'achat délégué
 *
 * Organisation :
 * - Schémas de base : Validation des champs individuels
 * - Schémas de création : Guest (sans compte) et connecté
 * - Schémas de mise à jour : Changement de statut et annulation
 * - Schémas de suivi : Tracking par token
 */

import { z } from 'zod';
import { PurchaseStatus, DeliveryMode } from '@/lib/db/enums';

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
  minPrice: 'Le prix doit être supérieur à 0',
  minBudget: 'Le budget doit être supérieur à 0',
  minQuantity: 'La quantité doit être au moins 1',
  maxLength: (max: number) => `Maximum ${max} caractères`,
  url: 'URL invalide',
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

/**
 * Validation d'URL de produit
 */
const productUrlSchema = z
  .string()
  .url(MESSAGES.url)
  .optional()
  .or(z.literal(''));

// ============================================
// SCHÉMA DE CRÉATION SANS COMPTE (GUEST)
// ============================================

/**
 * Schéma pour créer une demande d'achat SANS compte
 *
 * En tant qu'utilisateur non connecté, je veux déléguer un achat
 * à Faso Fret sans créer de compte
 *
 * Workflow :
 * 1. Formulaire public accessible à tous
 * 2. Génération automatique de trackingNumber et trackingToken
 * 3. Email de confirmation avec lien de suivi (72h)
 * 4. Proposition de création de compte
 */
export const createGuestPurchaseSchema = z.object({
  // ============================================
  // CONTACT (obligatoire pour matching)
  // ============================================
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  contactName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, MESSAGES.maxLength(100))
    .optional(),

  // ============================================
  // INFORMATIONS PRODUIT (obligatoire)
  // ============================================
  productName: z
    .string({ required_error: MESSAGES.required })
    .min(3, 'Le nom du produit doit contenir au moins 3 caractères')
    .max(200, MESSAGES.maxLength(200)),

  productUrl: productUrlSchema,

  quantity: z
    .number()
    .int('La quantité doit être un nombre entier')
    .positive(MESSAGES.minQuantity)
    .default(1),

  estimatedPrice: z
    .number()
    .positive(MESSAGES.minPrice)
    .optional(),

  maxBudget: z
    .number()
    .positive(MESSAGES.minBudget)
    .optional(),

  productDescription: z
    .string()
    .max(1000, MESSAGES.maxLength(1000))
    .optional(),

  // ============================================
  // ADRESSE DE LIVRAISON (obligatoire)
  // ============================================
  deliveryAddress: z
    .string({ required_error: MESSAGES.required })
    .min(5, 'L\'adresse doit contenir au moins 5 caractères')
    .max(200, MESSAGES.maxLength(200)),

  deliveryCity: z
    .string({ required_error: MESSAGES.required })
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, MESSAGES.maxLength(100)),

  deliveryPostalCode: postalCodeSchema,

  deliveryCountry: z
    .string()
    .length(2, 'Code pays ISO à 2 lettres (ex: FR)')
    .toUpperCase()
    .default('FR'),

  // ============================================
  // PLANIFICATION (obligatoire)
  // ============================================
  requestedDate: futureDateSchema,

  deliveryMode: z
    .nativeEnum(DeliveryMode, {
      required_error: 'Veuillez sélectionner un mode de livraison',
    })
    .default(DeliveryMode.STANDARD),

  // ============================================
  // INSTRUCTIONS (optionnel)
  // ============================================
  specialInstructions: z
    .string()
    .max(500, MESSAGES.maxLength(500))
    .optional(),

  // ============================================
  // CONDITIONS ACCEPTÉES (obligatoire)
  // ============================================
  acceptedTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Vous devez accepter les conditions générales',
    }),

  acceptedUrgentFee: z.boolean().default(false),

  acceptedPricing: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Vous devez accepter la structure de prix (produit + livraison + frais de service 15%)',
    }),
});

export type CreateGuestPurchaseInput = z.infer<typeof createGuestPurchaseSchema>;

// ============================================
// SCHÉMA DE CRÉATION AVEC COMPTE
// ============================================

/**
 * Schéma pour créer une demande d'achat AVEC compte
 *
 * En tant qu'utilisateur connecté, je veux déléguer un achat
 * lié à mon compte
 *
 * Différences avec createGuestPurchaseSchema :
 * - userId rempli depuis la session
 * - companyId déduit de la session
 * - isAttachedToAccount = true dès la création
 */
export const createPurchaseSchema = createGuestPurchaseSchema.extend({
  // Permet de lier à une expédition existante (optionnel)
  shipmentId: z.string().cuid().optional(),

  // Notes internes (visibles uniquement par agents)
  internalNotes: z
    .string()
    .max(1000, MESSAGES.maxLength(1000))
    .optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

// ============================================
// SCHÉMA DE SUIVI PAR TOKEN (PUBLIC)
// ============================================

/**
 * Schéma pour suivre une demande via son token
 *
 * En tant qu'utilisateur avec token, je veux suivre l'état
 * de ma demande sans compte
 *
 * Workflow :
 * 1. Saisir le token reçu par email
 * 2. Afficher l'état en temps réel
 * 3. Voir l'historique complet des événements
 */
export const trackPurchaseByTokenSchema = z.object({
  trackingToken: z
    .string({ required_error: 'Le token de suivi est obligatoire' })
    .cuid('Token de suivi invalide'),
});

export type TrackPurchaseByTokenInput = z.infer<typeof trackPurchaseByTokenSchema>;

// ============================================
// SCHÉMA DE CHANGEMENT DE STATUT
// ============================================

/**
 * Schéma pour changer le statut d'une demande
 *
 * En tant qu'agent, je veux changer le statut d'une demande
 * selon le workflow défini
 *
 * Workflow autorisé :
 * - NOUVEAU → EN_COURS
 * - EN_COURS → LIVRE
 * - * → ANNULE (via cancelPurchase)
 */
export const updatePurchaseStatusSchema = z.object({
  purchaseId: z
    .string({ required_error: MESSAGES.required })
    .cuid('ID de demande invalide'),

  newStatus: z.nativeEnum(PurchaseStatus, {
    required_error: 'Le nouveau statut est obligatoire',
  }),

  // Date de livraison réelle (si LIVRE)
  actualDeliveryDate: z.coerce.date().optional(),

  // Coûts réels (remplis par agent)
  actualProductCost: z.number().positive().optional(),
  deliveryCost: z.number().positive().optional(),
  serviceFee: z.number().positive().optional(),

  // Notes après livraison (optionnel)
  completionNotes: z
    .string()
    .max(1000, MESSAGES.maxLength(1000))
    .optional(),

  // Notes générales (optionnel)
  notes: z
    .string()
    .max(500, MESSAGES.maxLength(500))
    .optional(),
});

export type UpdatePurchaseStatusInput = z.infer<typeof updatePurchaseStatusSchema>;

// ============================================
// SCHÉMA D'ANNULATION
// ============================================

/**
 * Schéma pour annuler une demande avec raison obligatoire
 *
 * En tant qu'agent, je veux pouvoir annuler une demande
 * avec justification obligatoire
 */
export const cancelPurchaseSchema = z.object({
  purchaseId: z
    .string({ required_error: MESSAGES.required })
    .cuid('ID de demande invalide'),

  cancellationReason: z
    .string({ required_error: 'La raison d\'annulation est obligatoire' })
    .min(10, 'La raison doit contenir au moins 10 caractères')
    .max(1000, MESSAGES.maxLength(1000)),
});

export type CancelPurchaseInput = z.infer<typeof cancelPurchaseSchema>;

// ============================================
// SCHÉMA DE MISE À JOUR DES COÛTS
// ============================================

/**
 * Schéma pour mettre à jour les coûts réels d'un achat
 *
 * En tant qu'agent, je veux enregistrer les coûts réels
 * après avoir effectué l'achat
 */
export const updatePurchaseCostsSchema = z.object({
  purchaseId: z
    .string({ required_error: MESSAGES.required })
    .cuid('ID de demande invalide'),

  actualProductCost: z
    .number({ required_error: 'Le coût réel du produit est obligatoire' })
    .positive(MESSAGES.minPrice),

  deliveryCost: z
    .number({ required_error: 'Les frais de livraison sont obligatoires' })
    .positive(MESSAGES.minPrice),

  serviceFee: z
    .number()
    .positive()
    .optional(), // Calculé automatiquement si non fourni (15% min 10€)

  purchaseProof: z
    .string()
    .url('URL de preuve d\'achat invalide')
    .optional(),

  notes: z
    .string()
    .max(500, MESSAGES.maxLength(500))
    .optional(),
});

export type UpdatePurchaseCostsInput = z.infer<typeof updatePurchaseCostsSchema>;
