/**
 * Schémas de validation : Devis (Quotes)
 *
 * Définition des schémas Zod pour valider les données
 * des devis (création, modification, recherche, acceptation/rejet)
 *
 * Note : Les validations téléphone sont internationales
 * et supportent les formats de plusieurs pays (France, Burkina Faso,
 * Côte d'Ivoire, Sénégal, Mali, etc.).
 *
 * @module modules/quotes/schemas
 */

import { z } from 'zod';
import { QuoteStatus, CargoType, TransportMode } from '@/lib/db/enums';
import {
  emailSchema,
  phoneSchemaOptional,
  VALIDATION_MESSAGES,
} from '@/lib/validators';

// ════════════════════════════════════════════════════════════════════════════
// SCHÉMA PACKAGE (COLIS INDIVIDUEL)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Schéma de validation pour un colis individuel (QuotePackage / ShipmentPackage)
 *
 * Représente UNE ligne de colis dans un devis ou une expédition.
 * Le champ `quantity` permet de regrouper des colis identiques sur une même ligne.
 *
 * @example
 * // 3 cartons identiques de 15 kg chacun, 60×40×40 cm
 * {
 *   description: "Cartons vêtements",
 *   quantity: 3,
 *   cargoType: "GENERAL",
 *   weight: 15,       // poids UNITAIRE (pas total)
 *   length: 60,       // dimensions UNITAIRES en cm
 *   width: 40,
 *   height: 40,
 * }
 *
 * @example
 * // 1 tablette fragile de 2 kg
 * {
 *   description: "Tablette Samsung",
 *   quantity: 1,
 *   cargoType: "FRAGILE",
 *   weight: 2,
 *   length: 30,
 *   width: 20,
 *   height: 5,
 * }
 */
export const packageSchema = z.object({
  /** Description libre du colis (ex: "Tablette Samsung", "Cartons vêtements") */
  description: z
    .string()
    .max(200, 'La description ne peut pas dépasser 200 caractères')
    .optional(),

  /**
   * Nombre de colis IDENTIQUES dans cette ligne
   * Ex: quantity=3 signifie "3 colis identiques avec les mêmes caractéristiques"
   */
  quantity: z
    .number({
      required_error: 'La quantité est requise',
      invalid_type_error: 'La quantité doit être un nombre',
    })
    .int('La quantité doit être un nombre entier')
    .positive('La quantité doit être au moins 1')
    .max(1000, 'La quantité ne peut pas dépasser 1000')
    .default(1),

  /** Type de marchandise spécifique à CE colis (GENERAL, FRAGILE, DANGEROUS, etc.) */
  cargoType: z.nativeEnum(CargoType, {
    required_error: 'Le type de marchandise est requis',
    errorMap: () => ({ message: 'Type de marchandise invalide' }),
  }),

  /**
   * Poids UNITAIRE en kg (pas le poids total de la ligne)
   * Le poids total de la ligne = weight × quantity
   */
  weight: z
    .number({
      required_error: 'Le poids est requis',
      invalid_type_error: 'Le poids doit être un nombre',
    })
    .positive('Le poids doit être positif')
    .max(100000, 'Le poids ne peut pas dépasser 100 tonnes'),

  /**
   * Dimensions UNITAIRES en centimètres (cm)
   * Préprocesseur pour gérer les champs vides, NaN, null → converti en undefined
   */
  length: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return Number(val);
    },
    z
      .number()
      .nonnegative('La longueur doit être positive ou nulle')
      .max(10000, 'La longueur ne peut pas dépasser 10000 cm (100 m)')
      .optional()
  ),

  width: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return Number(val);
    },
    z
      .number()
      .nonnegative('La largeur doit être positive ou nulle')
      .max(10000, 'La largeur ne peut pas dépasser 10000 cm (100 m)')
      .optional()
  ),

  height: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return Number(val);
    },
    z
      .number()
      .nonnegative('La hauteur doit être positive ou nulle')
      .max(10000, 'La hauteur ne peut pas dépasser 10000 cm (100 m)')
      .optional()
  ),
});

/**
 * Type TypeScript inféré du schéma de colis
 * Utilisé dans les formulaires dynamiques (useFieldArray) et les server actions
 */
export type PackageFormData = z.infer<typeof packageSchema>;

/**
 * Schéma pour un tableau de colis avec validation globale
 *
 * Contraintes :
 * - Minimum 1 colis requis
 * - Maximum 50 colis par devis/expédition
 */
export const packagesArraySchema = z
  .array(packageSchema)
  .min(1, 'Au moins un colis est requis')
  .max(50, 'Maximum 50 lignes de colis par devis');

// ════════════════════════════════════════════════════════════════════════════
// SCHÉMA QUOTE (DEVIS)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Schéma de validation pour la création d'un devis
 *
 * Valide toutes les informations d'un devis :
 * - Informations du client
 * - Route (origine → destination)
 * - Détails de la marchandise (type, poids, volume) — agrégats calculés depuis packages
 * - Colis détaillés (packages)
 * - Modes de transport
 * - Coût estimé et validité
 */
export const quoteSchema = z.object({
  // === Informations du client ===
  clientId: z
    .string()
    .cuid('ID de compagnie invalide'),

  // === Route ===
  originCountry: z
    .string()
    .length(2, "Le code pays d'origine doit être au format ISO (2 lettres)")
    .regex(/^[A-Z]{2}$/, "Le code pays d'origine doit être en majuscules (ex: FR, US)"),

  destinationCountry: z
    .string()
    .length(2, 'Le code pays de destination doit être au format ISO (2 lettres)')
    .regex(/^[A-Z]{2}$/, 'Le code pays de destination doit être en majuscules (ex: FR, US)'),

  // === Informations de la marchandise ===
  cargoType: z.nativeEnum(CargoType, {
    errorMap: () => ({ message: 'Type de marchandise invalide' }),
  }),

  weight: z
    .number()
    .positive('Le poids doit être positif')
    .max(100000, 'Le poids ne peut pas dépasser 100 tonnes'),

  // === Dimensions (optionnelles) - Volume = L × W × H ===
  // ⚠️ ATTENTION : Les dimensions sont en CENTIMÈTRES (cm)
  // Note : Ces champs sont des AGRÉGATS conservés pour rétrocompatibilité (listes, filtres, tri)
  // La source de vérité est dans packages[]
  length: z.number().nonnegative('La longueur doit être positive ou nulle').max(10000, 'La longueur ne peut pas dépasser 10000 centimètres (100 mètres)').optional(),
  width: z.number().nonnegative('La largeur doit être positive ou nulle').max(10000, 'La largeur ne peut pas dépasser 10000 centimètres (100 mètres)').optional(),
  height: z.number().nonnegative('La hauteur doit être positive ou nulle').max(10000, 'La hauteur ne peut pas dépasser 10000 centimètres (100 mètres)').optional(),

  // === Colis détaillés (source de vérité pour la marchandise) ===
  // Chaque ligne représente un type de colis avec sa quantité, son poids unitaire et ses dimensions
  // Le prix est calculé par colis puis sommé pour obtenir le total du devis
  packages: packagesArraySchema.optional(),

  // === Snapshot Adresses (Pattern Immutable Data) - Optionnelles ===
  // Suivant le pattern utilisé par Magento, Shopify et autres leaders e-commerce

  // Adresse expéditeur (origine)
  originAddress: z
    .string()
    .min(5, 'L\'adresse d\'origine doit contenir au moins 5 caractères')
    .max(500, 'L\'adresse d\'origine ne peut pas dépasser 500 caractères')
    .optional(),

  originCity: z
    .string()
    .min(2, 'La ville d\'origine doit contenir au moins 2 caractères')
    .max(100, 'La ville d\'origine ne peut pas dépasser 100 caractères')
    .optional(),

  originPostalCode: z
    .string()
    .max(20, 'Le code postal ne peut pas dépasser 20 caractères')
    .optional(),

  originContactName: z
    .string()
    .max(100, 'Le nom du contact ne peut pas dépasser 100 caractères')
    .optional(),

  originContactPhone: z
    .string()
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .optional(),

  originContactEmail: z
    .string()
    .email('Email du contact expéditeur invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères')
    .optional(),

  // Adresse destinataire (destination)
  destinationAddress: z
    .string()
    .min(5, 'L\'adresse de destination doit contenir au moins 5 caractères')
    .max(500, 'L\'adresse de destination ne peut pas dépasser 500 caractères')
    .optional(),

  destinationCity: z
    .string()
    .min(2, 'La ville de destination doit contenir au moins 2 caractères')
    .max(100, 'La ville de destination ne peut pas dépasser 100 caractères')
    .optional(),

  destinationPostalCode: z
    .string()
    .max(20, 'Le code postal ne peut pas dépasser 20 caractères')
    .optional(),

  destinationContactName: z
    .string()
    .max(100, 'Le nom du contact ne peut pas dépasser 100 caractères')
    .optional(),

  destinationContactPhone: z
    .string()
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .optional(),

  destinationContactEmail: z
    .string()
    .email('Email du contact destinataire invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères')
    .optional(),

  // === Transport ===
  transportMode: z
    .array(z.nativeEnum(TransportMode))
    .min(1, 'Au moins un mode de transport est requis')
    .max(4, 'Maximum 4 modes de transport'),

  // === Priorité de livraison (optionnelle) ===
  // Affecte le prix et le délai estimé
  // - STANDARD : Livraison normale (0%)
  // - NORMAL   : Livraison accélérée (+10%)
  // - EXPRESS  : Livraison rapide (+50%)
  // - URGENT   : Livraison prioritaire (+30%)
  priority: z
    .enum(['STANDARD', 'NORMAL', 'EXPRESS', 'URGENT'])
    .default('STANDARD')
    .optional(),

  // === Coût et validité ===
  estimatedCost: z
    .number()
    .positive('Le coût estimé doit être positif')
    .max(10000000, 'Le coût estimé ne peut pas dépasser 10 millions'),

  currency: z
    .string()
    .length(3, 'Le code devise doit être au format ISO (3 lettres)')
    .regex(/^[A-Z]{3}$/, 'Le code devise doit être en majuscules (ex: EUR, USD)')
    .default('EUR'),

  validUntil: z
    .string()
    .datetime('Date de validité invalide'),

  // === Statut (pour la création, toujours DRAFT) ===
  status: z
    .nativeEnum(QuoteStatus, {
      errorMap: () => ({ message: 'Statut invalide' }),
    })
    .default('DRAFT')
    .optional(),
});

/**
 * Type TypeScript inféré du schéma de création
 * Utilisé pour le typage dans les composants et actions
 */
export type QuoteFormData = z.infer<typeof quoteSchema>;

/**
 * Schéma pour la mise à jour d'un devis
 * Tous les champs sont optionnels
 */
export const quoteUpdateSchema = quoteSchema
  .partial()
  .extend({
    // Lors d'une mise à jour, on peut modifier le statut
    status: z.nativeEnum(QuoteStatus).optional(),

    // Dates d'acceptation/rejet (peuvent être définies lors de la mise à jour)
    acceptedAt: z.string().datetime().optional().nullable(),
    rejectedAt: z.string().datetime().optional().nullable(),
  });

/**
 * Type pour les mises à jour partielles
 */
export type QuoteUpdateData = z.infer<typeof quoteUpdateSchema>;

/**
 * Schéma pour la recherche/filtrage de devis
 */
export const quoteSearchSchema = z.object({
  // Recherche textuelle (numéro de devis)
  query: z.string().max(100).optional(),

  // Filtres par statut
  status: z.nativeEnum(QuoteStatus).optional(),

  // Filtres par compagnie
  clientId: z.string().cuid().optional(),

  // Filtres par dates
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  // Filtres par pays
  originCountry: z.string().length(2).optional(),
  destinationCountry: z.string().length(2).optional(),

  // Filtres par transport
  transportMode: z.nativeEnum(TransportMode).optional(),
  cargoType: z.nativeEnum(CargoType).optional(),

  // Filtrer les devis expirés
  expired: z.boolean().optional(),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),

  // Tri
  sortBy: z.enum(['createdAt', 'validUntil', 'estimatedCost', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Type pour les paramètres de recherche
 */
export type QuoteSearchParams = z.infer<typeof quoteSearchSchema>;

/**
 * Schéma pour accepter un devis
 *
 * Le client doit choisir sa méthode de paiement préférée lors de l'acceptation.
 * Cette information sera utilisée par l'agent lors du traitement.
 */
export const quoteAcceptSchema = z.object({
  /**
   * Méthode de paiement choisie par le client
   * - CASH : Paiement comptant
   * - ON_DELIVERY : Paiement à la livraison
   * - BANK_TRANSFER : Virement bancaire
   */
  paymentMethod: z.enum(['CASH', 'ON_DELIVERY', 'BANK_TRANSFER'], {
    errorMap: () => ({ message: 'Veuillez sélectionner une méthode de paiement' }),
  }),
  notes: z
    .string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .optional()
    .nullable(),
});

/**
 * Type pour l'acceptation d'un devis
 */
export type QuoteAcceptData = z.infer<typeof quoteAcceptSchema>;

/**
 * Schéma pour rejeter un devis
 */
export const quoteRejectSchema = z.object({
  reason: z
    .string()
    .min(10, 'La raison du rejet doit contenir au moins 10 caractères')
    .max(500, 'La raison du rejet ne peut pas dépasser 500 caractères'),
});

/**
 * Type pour le rejet d'un devis
 */
export type QuoteRejectData = z.infer<typeof quoteRejectSchema>;

/**
 * Schéma pour envoyer un devis à un client
 */
export const quoteSendSchema = z.object({
  email: z
    .string()
    .email('Email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères')
    .optional(), // Si non fourni, utiliser l'email de la compagnie

  message: z
    .string()
    .max(1000, 'Le message ne peut pas dépasser 1000 caractères')
    .optional()
    .nullable(),
});

/**
 * Type pour l'envoi d'un devis
 */
export type QuoteSendData = z.infer<typeof quoteSendSchema>;

/**
 * Helper pour vérifier si un devis est expiré
 */
export function isQuoteExpired(validUntil: Date): boolean {
  return new Date() > validUntil;
}

/**
 * Helper pour calculer le nombre de jours restants avant expiration
 */
export function daysUntilExpiration(validUntil: Date): number {
  const now = new Date();
  const diff = validUntil.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Schéma de validation pour l'estimation de devis publique
 *
 * Version simplifiée du schéma de devis pour le calculateur public
 * sur la page d'accueil. Ne nécessite pas d'authentification.
 *
 * Champs requis :
 * - Route (pays origine et destination)
 * - Type de marchandise
 * - Poids et volume (optionnel)
 * - Mode(s) de transport
 * - Priorité (optionnelle)
 */
export const quoteEstimateSchema = z.object({
  // === Route ===
  originCountry: z
    .string()
    .min(2, "Le pays d'origine est requis")
    .max(100, "Le pays d'origine est trop long"),

  destinationCountry: z
    .string()
    .min(2, 'Le pays de destination est requis')
    .max(100, 'Le pays de destination est trop long'),

  // === Informations de la marchandise ===
  cargoType: z.nativeEnum(CargoType, {
    errorMap: () => ({ message: 'Type de marchandise invalide' }),
  }),

  weight: z
    .number({
      required_error: 'Le poids est requis',
      invalid_type_error: 'Le poids doit être un nombre',
    })
    .positive('Le poids doit être positif')
    .max(100000, 'Le poids ne peut pas dépasser 100 tonnes'),

  // === Dimensions (optionnelles) - Volume = L × W × H ===
  // ⚠️ ATTENTION : Les dimensions sont en CENTIMÈTRES (cm)
  // Utilisation d'un préprocesseur pour gérer les champs vides et NaN
  // Convertit automatiquement : NaN, undefined, null, '' → 0
  // Accepte 0 comme valeur par défaut (= "non renseigné" dans le formulaire)
  length: z.preprocess(
    (val) => {
      // Si la valeur est NaN, undefined, null, ou chaîne vide, retourner 0
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        return 0;
      }
      return Number(val);
    },
    z
      .number()
      .nonnegative('La longueur doit être positive ou nulle')
      .max(10000, 'La longueur ne peut pas dépasser 10000 centimètres (100 mètres)')
  ),

  width: z.preprocess(
    (val) => {
      // Si la valeur est NaN, undefined, null, ou chaîne vide, retourner 0
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        return 0;
      }
      return Number(val);
    },
    z
      .number()
      .nonnegative('La largeur doit être positive ou nulle')
      .max(10000, 'La largeur ne peut pas dépasser 10000 centimètres (100 mètres)')
  ),

  height: z.preprocess(
    (val) => {
      // Si la valeur est NaN, undefined, null, ou chaîne vide, retourner 0
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        return 0;
      }
      return Number(val);
    },
    z
      .number()
      .nonnegative('La hauteur doit être positive ou nulle')
      .max(10000, 'La hauteur ne peut pas dépasser 10000 centimètres (100 mètres)')
  ),

  // === Transport ===
  transportMode: z
    .array(z.nativeEnum(TransportMode))
    .min(1, 'Au moins un mode de transport est requis')
    .max(4, 'Maximum 4 modes de transport'),

  // === Priorité (optionnelle) ===
  // STANDARD : Livraison normale (0%)
  // NORMAL   : Livraison accélérée (+10%)
  // EXPRESS  : Livraison rapide (+50%)
  // URGENT   : Livraison express (+30%)
  priority: z
    .enum(['STANDARD', 'NORMAL', 'EXPRESS', 'URGENT'])
    .default('STANDARD')
    .optional(),
});

/**
 * Type TypeScript inféré du schéma d'estimation
 * Utilisé pour le calculateur de devis public
 */
export type QuoteEstimateData = z.infer<typeof quoteEstimateSchema>;

/**
 * Type pour le résultat du calcul d'estimation
 *
 * Breakdown :
 * - baseCost : Coût de base = Masse Taxable × Tarif (avant surcharges)
 * - cargoTypeSurcharge : Supplément type de marchandise (ex: +50% pour DANGEROUS)
 * - prioritySurcharge : Supplément priorité (ex: +30% pour URGENT)
 *
 * Note : Le prix final (estimatedCost) = baseCost + cargoTypeSurcharge + prioritySurcharge
 */
export type QuoteEstimateResult = {
  /** Prix final estimé en devise locale */
  estimatedCost: number;
  /** Code devise ISO (EUR, USD, etc.) */
  currency: string;
  /** Détail du calcul pour transparence */
  breakdown: {
    /** Coût de base (Masse Taxable × Tarif) */
    baseCost: number;
    /** Supplément type de marchandise (DANGEROUS, FRAGILE, etc.) */
    cargoTypeSurcharge: number;
    /** Supplément priorité (NORMAL, EXPRESS, URGENT) */
    prioritySurcharge: number;
  };
  /** Délai de livraison estimé en jours */
  estimatedDeliveryDays: number;
};

// ════════════════════════════════════════════════════════════════════════════
// SCHÉMAS WORKFLOW AGENT - Traitement des devis
// ════════════════════════════════════════════════════════════════════════════

/**
 * Méthodes de paiement disponibles pour le traitement des devis
 * Correspond à l'enum QuotePaymentMethod dans schema.zmodel
 */
export const QuotePaymentMethod = {
  CASH: 'CASH',           // Comptant - paiement immédiat
  ON_DELIVERY: 'ON_DELIVERY', // À la livraison - paiement à la réception
  BANK_TRANSFER: 'BANK_TRANSFER', // Virement bancaire - envoi du RIB au client
} as const;

export type QuotePaymentMethodType = keyof typeof QuotePaymentMethod;

/**
 * Schéma pour démarrer le traitement d'un devis par un agent
 *
 * Workflow :
 * 1. L'agent clique sur "Traiter devis"
 * 2. Il choisit la méthode de paiement
 * 3. Il peut ajouter un commentaire optionnel
 * 4. Le statut passe à IN_TREATMENT
 * 5. Si virement → envoi email RIB au client
 *
 * @permissions ADMIN, OPERATIONS_MANAGER
 */
export const quoteStartTreatmentSchema = z.object({
  // Commentaire optionnel de l'agent lors du démarrage du traitement
  // NOTE : La méthode de paiement est définie par le client lors de l'acceptation
  // et ne peut être modifiée que par le client (owner) ou un ADMIN
  comment: z
    .string()
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères')
    .optional()
    .nullable(),
});

/**
 * Type pour démarrer le traitement
 */
export type QuoteStartTreatmentData = z.infer<typeof quoteStartTreatmentSchema>;

/**
 * Schéma pour valider le traitement d'un devis par un agent
 *
 * Workflow :
 * 1. L'agent clique sur "Valider"
 * 2. Le statut passe à VALIDATED
 * 3. Une expédition (Shipment) est créée automatiquement
 * 4. Le devis est lié à l'expédition
 *
 * @permissions ADMIN, OPERATIONS_MANAGER
 */
export const quoteValidateTreatmentSchema = z.object({
  // Commentaire optionnel lors de la validation
  comment: z
    .string()
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères')
    .optional()
    .nullable(),

  // Adresse de livraison pour la création de l'expédition
  // Si non fournie, on utilise les infos du client
  destinationAddress: z
    .string()
    .min(5, 'L\'adresse de destination doit contenir au moins 5 caractères')
    .max(500, 'L\'adresse de destination ne peut pas dépasser 500 caractères')
    .optional(),

  destinationCity: z
    .string()
    .max(100, 'La ville de destination ne peut pas dépasser 100 caractères')
    .optional(),

  destinationPostalCode: z
    .string()
    .max(20, 'Le code postal ne peut pas dépasser 20 caractères')
    .optional(),

  destinationContact: z
    .string()
    .max(100, 'Le nom du contact ne peut pas dépasser 100 caractères')
    .optional(),

  destinationEmail: z
    .string()
    .email("L'email du destinataire n'est pas valide")
    .max(255, "L'email ne peut pas dépasser 255 caractères")
    .optional(),

  destinationPhone: z
    .string()
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .optional(),

  // Informations origine (si différentes du client)
  originAddress: z
    .string()
    .min(5, 'L\'adresse d\'origine doit contenir au moins 5 caractères')
    .max(500, 'L\'adresse d\'origine ne peut pas dépasser 500 caractères')
    .optional(),

  originCity: z
    .string()
    .max(100, 'La ville d\'origine ne peut pas dépasser 100 caractères')
    .optional(),

  originPostalCode: z
    .string()
    .max(20, 'Le code postal ne peut pas dépasser 20 caractères')
    .optional(),

  originContact: z
    .string()
    .max(100, 'Le nom du contact ne peut pas dépasser 100 caractères')
    .optional(),

  originPhone: z
    .string()
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .optional(),

  // Description de la marchandise
  // Validation : minimum 5 caractères si renseigné, maximum 1000 caractères
  cargoDescription: z
    .string()
    .min(5, 'Veuillez saisir une description de la marchandise (minimum 5 caractères) ou laisser le champ vide')
    .max(1000, 'La description ne peut pas dépasser 1000 caractères')
    .optional(),

  // Nombre de colis (optionnel - calculé automatiquement depuis les QuotePackage)
  // Conservé en fallback pour les anciens devis qui n'ont pas encore de packages
  packageCount: z
    .number()
    .int('Le nombre de colis doit être un entier')
    .positive('Le nombre de colis doit être positif')
    .optional(),

  // Instructions spéciales
  specialInstructions: z
    .string()
    .max(1000, 'Les instructions ne peuvent pas dépasser 1000 caractères')
    .optional()
    .nullable(),
});

/**
 * Type pour valider le traitement
 */
export type QuoteValidateTreatmentData = z.infer<typeof quoteValidateTreatmentSchema>;

/**
 * Schéma pour annuler un devis par un agent
 *
 * Workflow :
 * 1. L'agent clique sur "Annuler"
 * 2. Il doit fournir une raison d'annulation
 * 3. Le statut passe à CANCELLED
 *
 * @permissions ADMIN, OPERATIONS_MANAGER
 */
export const quoteCancelSchema = z.object({
  // Raison de l'annulation (obligatoire)
  reason: z
    .string()
    .min(10, 'La raison d\'annulation doit contenir au moins 10 caractères')
    .max(500, 'La raison d\'annulation ne peut pas dépasser 500 caractères'),
});

/**
 * Type pour l'annulation d'un devis
 */
export type QuoteCancelData = z.infer<typeof quoteCancelSchema>;

// ════════════════════════════════════════════════════════════════════════════
// SCHÉMAS CRÉATION SANS COMPTE (GUEST QUOTE)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Schéma pour créer un devis SANS compte (visiteur)
 *
 * User Story :
 * En tant que visiteur, je veux demander un devis sans créer de compte
 *
 * Workflow :
 * 1. Calculateur public sur la homepage (/#calculateur) + envoi par email
 * 2. Génération automatique de trackingToken (72h validité)
 * 3. Email de confirmation avec lien de suivi
 * 4. Si inscription ultérieure → rattachement automatique par email/phone
 *
 * Champs requis :
 * - contactEmail : Email pour matching lors de l'inscription
 * - Informations de la marchandise (origine, destination, poids, type)
 * - Mode de transport
 *
 * Champs optionnels :
 * - contactName, contactPhone : Infos de contact supplémentaires
 * - Dimensions (length, width, height)
 * - Description additionnelle
 *
 * Note : Les validations téléphone supportent les formats internationaux
 * (France, Burkina Faso, Côte d'Ivoire, Sénégal, Mali, etc.)
 */
export const createGuestQuoteSchema = z.object({
  // ============================================
  // CONTACT (obligatoire pour matching futur)
  // ============================================

  /**
   * Email du demandeur - OBLIGATOIRE
   * Utilisé pour :
   * - Envoi de l'email de confirmation
   * - Matching lors de la création de compte (US-1.3)
   * - Communications futures
   */
  contactEmail: emailSchema,

  /**
   * Téléphone du demandeur - OPTIONNEL
   * Utilisé comme critère de matching alternatif
   * Format international accepté (8-15 chiffres)
   */
  contactPhone: phoneSchemaOptional,

  /**
   * Nom du demandeur - OPTIONNEL
   * Affiché dans le dashboard des agents
   */
  contactName: z
    .string()
    .min(2, VALIDATION_MESSAGES.minLength(2))
    .max(100, VALIDATION_MESSAGES.maxLength(100))
    .optional(),

  // ============================================
  // ROUTE (ORIGINE → DESTINATION)
  // ============================================

  /**
   * Pays d'origine (code ISO 2 lettres)
   * Exemple : "FR", "BF", "US"
   */
  originCountry: z
    .string({ required_error: VALIDATION_MESSAGES.required })
    .min(2, "Le pays d'origine est requis")
    .max(100, "Le pays d'origine est trop long"),

  /**
   * Pays de destination (code ISO 2 lettres)
   * Exemple : "FR", "BF", "US"
   */
  destinationCountry: z
    .string({ required_error: VALIDATION_MESSAGES.required })
    .min(2, 'Le pays de destination est requis')
    .max(100, 'Le pays de destination est trop long'),

  // ============================================
  // INFORMATIONS MARCHANDISE
  // ============================================

  /**
   * Type de marchandise (enum CargoType)
   * GENERAL, FRAGILE, DANGEROUS, PERISHABLE, VALUABLE
   */
  cargoType: z.nativeEnum(CargoType, {
    required_error: 'Veuillez sélectionner un type de marchandise',
    errorMap: () => ({ message: 'Type de marchandise invalide' }),
  }),

  /**
   * Poids total en kg
   * Min: 0.1 kg, Max: 100 tonnes
   */
  weight: z
    .number({
      required_error: 'Le poids est requis',
      invalid_type_error: 'Le poids doit être un nombre',
    })
    .positive('Le poids doit être positif')
    .max(100000, 'Le poids ne peut pas dépasser 100 tonnes'),

  /**
   * Dimensions en centimètres (optionnelles)
   * Préprocesseur pour gérer les champs vides et NaN
   */
  length: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        return 0;
      }
      return Number(val);
    },
    z
      .number()
      .nonnegative('La longueur doit être positive ou nulle')
      .max(10000, 'La longueur ne peut pas dépasser 10000 cm (100 m)')
  ),

  width: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        return 0;
      }
      return Number(val);
    },
    z
      .number()
      .nonnegative('La largeur doit être positive ou nulle')
      .max(10000, 'La largeur ne peut pas dépasser 10000 cm (100 m)')
  ),

  height: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        return 0;
      }
      return Number(val);
    },
    z
      .number()
      .nonnegative('La hauteur doit être positive ou nulle')
      .max(10000, 'La hauteur ne peut pas dépasser 10000 cm (100 m)')
  ),

  // ============================================
  // SNAPSHOT ADRESSES (Optionnelles)
  // ============================================

  /**
   * Adresse expéditeur (origine) - Optionnelle
   * Permet au client de fournir l'adresse complète dès la demande
   */
  originAddress: z
    .string()
    .min(5, VALIDATION_MESSAGES.minLength(5))
    .max(500, VALIDATION_MESSAGES.maxLength(500))
    .optional(),

  originCity: z
    .string()
    .min(2, VALIDATION_MESSAGES.minLength(2))
    .max(100, VALIDATION_MESSAGES.maxLength(100))
    .optional(),

  originPostalCode: z
    .string()
    .max(20, VALIDATION_MESSAGES.maxLength(20))
    .optional(),

  originContactName: z
    .string()
    .min(2, VALIDATION_MESSAGES.minLength(2))
    .max(100, VALIDATION_MESSAGES.maxLength(100))
    .optional(),

  originContactPhone: phoneSchemaOptional,

  originContactEmail: z
    .string()
    .email('Email du contact expéditeur invalide')
    .max(255, VALIDATION_MESSAGES.maxLength(255))
    .optional(),

  /**
   * Adresse destinataire (destination) - Optionnelle
   * Permet au client de fournir l'adresse de livraison dès la demande
   */
  destinationAddress: z
    .string()
    .min(5, VALIDATION_MESSAGES.minLength(5))
    .max(500, VALIDATION_MESSAGES.maxLength(500))
    .optional(),

  destinationCity: z
    .string()
    .min(2, VALIDATION_MESSAGES.minLength(2))
    .max(100, VALIDATION_MESSAGES.maxLength(100))
    .optional(),

  destinationPostalCode: z
    .string()
    .max(20, VALIDATION_MESSAGES.maxLength(20))
    .optional(),

  destinationContactName: z
    .string()
    .min(2, VALIDATION_MESSAGES.minLength(2))
    .max(100, VALIDATION_MESSAGES.maxLength(100))
    .optional(),

  destinationContactPhone: phoneSchemaOptional,

  destinationContactEmail: z
    .string()
    .email('Email du contact destinataire invalide')
    .max(255, VALIDATION_MESSAGES.maxLength(255))
    .optional(),

  // ============================================
  // MODE DE TRANSPORT
  // ============================================

  /**
   * Mode(s) de transport souhaité(s)
   * ROAD, RAIL, SEA, AIR (au moins 1, max 4)
   */
  transportMode: z
    .array(z.nativeEnum(TransportMode))
    .min(1, 'Au moins un mode de transport est requis')
    .max(4, 'Maximum 4 modes de transport'),

  // ============================================
  // OPTIONS SUPPLÉMENTAIRES
  // ============================================

  /**
   * Priorité de livraison
   * Affecte le coût estimé (+0%, +10%, +30%, +50%)
   */
  priority: z
    .enum(['STANDARD', 'NORMAL', 'EXPRESS', 'URGENT'])
    .default('STANDARD')
    .optional(),

  /**
   * Description additionnelle de la marchandise
   * Instructions spéciales, contraintes, etc.
   */
  description: z
    .string()
    .max(2000, VALIDATION_MESSAGES.maxLength(2000))
    .optional(),

  /**
   * Instructions spéciales pour le transport
   * Manutention, stockage, etc.
   */
  specialInstructions: z
    .string()
    .max(1000, VALIDATION_MESSAGES.maxLength(1000))
    .optional(),
});

/**
 * Type TypeScript inféré pour la création de devis guest
 * @example
 * const data: CreateGuestQuoteInput = {
 *   contactEmail: 'client@example.com',
 *   originCountry: 'FR',
 *   destinationCountry: 'BF',
 *   cargoType: 'GENERAL',
 *   weight: 500,
 *   transportMode: ['SEA', 'ROAD'],
 * };
 */
export type CreateGuestQuoteInput = z.infer<typeof createGuestQuoteSchema>;

// ============================================
// SCHÉMA DE SUIVI PAR TOKEN (GUEST)
// ============================================

/**
 * Schéma pour suivre un devis via token public
 *
 * User Story :
 * En tant qu'utilisateur ayant demandé un devis sans compte,
 * je veux suivre l'état de mon devis via le lien reçu par email
 *
 * URL : /quotes/track/[token]
 * Validité : 72h après création
 */
export const trackQuoteByTokenSchema = z.object({
  /**
   * Token de suivi unique (CUID)
   * Généré automatiquement à la création du devis
   * Envoyé par email au demandeur
   */
  trackingToken: z
    .string({ required_error: VALIDATION_MESSAGES.required })
    .cuid('Token de suivi invalide'),
});

/**
 * Type TypeScript inféré pour le suivi par token
 */
export type TrackQuoteByTokenInput = z.infer<typeof trackQuoteByTokenSchema>;

// ============================================
// SCHÉMA DE RATTACHEMENT AU COMPTE
// ============================================

/**
 * Schéma pour rattacher un devis orphelin à un compte utilisateur
 *
 * User Story US-1.3 :
 * En tant qu'utilisateur qui vient de créer un compte,
 * mes devis précédents (créés sans compte) sont automatiquement
 * rattachés à mon compte si l'email ou le téléphone correspondent
 *
 * Workflow :
 * 1. Utilisateur crée un compte avec email@example.com
 * 2. Recherche des devis où contactEmail = email@example.com ET userId = NULL
 * 3. Pour chaque devis trouvé :
 *    - userId = nouvel utilisateur
 *    - isAttachedToAccount = true
 * 4. Notification (optionnelle) des devis rattachés
 */
export const attachQuoteToAccountSchema = z.object({
  /**
   * ID du devis à rattacher
   */
  quoteId: z
    .string({ required_error: 'ID du devis requis' })
    .cuid('ID de devis invalide'),

  /**
   * ID de l'utilisateur à qui rattacher le devis
   */
  userId: z
    .string({ required_error: 'ID utilisateur requis' })
    .cuid('ID utilisateur invalide'),
});

/**
 * Type TypeScript inféré pour le rattachement
 */
export type AttachQuoteToAccountInput = z.infer<typeof attachQuoteToAccountSchema>;
