/**
 * Schémas de validation : Factures (Invoices)
 *
 * Définition des schémas Zod pour valider les données
 * des factures et de leurs lignes (création, modification, recherche)
 *
 * @module modules/invoices/schemas
 */

import { z } from 'zod';
import { InvoiceStatus } from '@/generated/prisma';

/**
 * Schéma pour une ligne de facture (InvoiceItem)
 *
 * Représente un article ou service facturé avec :
 * - Description du produit/service
 * - Quantité
 * - Prix unitaire
 * - Montant total (quantité × prix unitaire)
 */
export const invoiceItemSchema = z.object({
  description: z
    .string()
    .min(3, 'La description doit contenir au moins 3 caractères')
    .max(500, 'La description ne peut pas dépasser 500 caractères'),

  quantity: z
    .number()
    .positive('La quantité doit être positive')
    .max(1000000, 'La quantité ne peut pas dépasser 1 million'),

  unitPrice: z
    .number()
    .nonnegative('Le prix unitaire ne peut pas être négatif')
    .max(1000000, 'Le prix unitaire ne peut pas dépasser 1 million'),

  // Le montant est calculé automatiquement (quantity × unitPrice)
  amount: z
    .number()
    .nonnegative('Le montant ne peut pas être négatif')
    .max(10000000, 'Le montant ne peut pas dépasser 10 millions'),
});

/**
 * Type pour une ligne de facture
 */
export type InvoiceItemData = z.infer<typeof invoiceItemSchema>;

/**
 * Schéma de validation pour la création d'une facture
 *
 * Valide toutes les informations d'une facture :
 * - Informations de base (client, dates)
 * - Montants (sous-total, taxes, remise, total)
 * - Lignes de facture
 * - Relations (expédition, devis)
 */
export const invoiceSchema = z.object({
  // === Informations du client ===
  companyId: z
    .string()
    .cuid('ID de compagnie invalide'),

  // === Dates ===
  issueDate: z
    .string()
    .datetime('Date d\'émission invalide')
    .optional(), // Optionnel car par défaut = now()

  dueDate: z
    .string()
    .datetime('Date d\'échéance invalide'),

  // === Montants ===
  subtotal: z
    .number()
    .nonnegative('Le sous-total ne peut pas être négatif')
    .max(10000000, 'Le sous-total ne peut pas dépasser 10 millions'),

  taxRate: z
    .number()
    .min(0, 'Le taux de taxe ne peut pas être négatif')
    .max(1, 'Le taux de taxe ne peut pas dépasser 100%')
    .default(0),

  taxAmount: z
    .number()
    .nonnegative('Le montant de taxe ne peut pas être négatif')
    .max(10000000, 'Le montant de taxe ne peut pas dépasser 10 millions'),

  discount: z
    .number()
    .min(0, 'La remise ne peut pas être négative')
    .max(10000000, 'La remise ne peut pas dépasser 10 millions')
    .default(0),

  total: z
    .number()
    .nonnegative('Le total ne peut pas être négatif')
    .max(10000000, 'Le total ne peut pas dépasser 10 millions'),

  currency: z
    .string()
    .length(3, 'Le code devise doit être au format ISO (3 lettres)')
    .regex(/^[A-Z]{3}$/, 'Le code devise doit être en majuscules (ex: EUR, USD)')
    .default('EUR'),

  // === Statut ===
  status: z
    .nativeEnum(InvoiceStatus, {
      errorMap: () => ({ message: 'Statut invalide' }),
    })
    .default('DRAFT')
    .optional(),

  // === Paiement ===
  paymentMethod: z
    .string()
    .max(100, 'La méthode de paiement ne peut pas dépasser 100 caractères')
    .optional()
    .nullable(),

  paidDate: z
    .string()
    .datetime('Date de paiement invalide')
    .optional()
    .nullable(),

  // === Relations ===
  quoteId: z
    .string()
    .cuid('ID de devis invalide')
    .optional()
    .nullable(),

  // === Notes ===
  notes: z
    .string()
    .max(1000, 'Les notes ne peuvent pas dépasser 1000 caractères')
    .optional()
    .nullable(),

  // === Lignes de facture ===
  items: z
    .array(invoiceItemSchema)
    .min(1, 'Au moins une ligne de facture est requise')
    .max(100, 'Maximum 100 lignes de facture'),
});

/**
 * Type TypeScript inféré du schéma de création
 */
export type InvoiceFormData = z.infer<typeof invoiceSchema>;

/**
 * Schéma pour la mise à jour d'une facture
 * Tous les champs sont optionnels sauf les lignes de facture
 */
export const invoiceUpdateSchema = invoiceSchema
  .partial()
  .extend({
    // Lors d'une mise à jour, on peut modifier le statut
    status: z.nativeEnum(InvoiceStatus).optional(),

    // Date de paiement (peut être définie lors du paiement)
    paidDate: z.string().datetime().optional().nullable(),

    // Méthode de paiement
    paymentMethod: z.string().max(100).optional().nullable(),
  });

/**
 * Type pour les mises à jour partielles
 */
export type InvoiceUpdateData = z.infer<typeof invoiceUpdateSchema>;

/**
 * Schéma pour la recherche/filtrage de factures
 */
export const invoiceSearchSchema = z.object({
  // Recherche textuelle (numéro de facture, notes)
  query: z.string().max(100).optional(),

  // Filtres par statut
  status: z.nativeEnum(InvoiceStatus).optional(),

  // Filtres par compagnie
  companyId: z.string().cuid().optional(),

  // Filtres par dates
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  // Filtrer les factures en retard
  overdue: z.boolean().optional(),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10),

  // Tri
  sortBy: z
    .enum(['createdAt', 'issueDate', 'dueDate', 'total', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Type pour les paramètres de recherche
 */
export type InvoiceSearchParams = z.infer<typeof invoiceSearchSchema>;

/**
 * Schéma pour marquer une facture comme payée
 */
export const invoicePaymentSchema = z.object({
  paymentMethod: z
    .string()
    .min(2, 'La méthode de paiement doit contenir au moins 2 caractères')
    .max(100, 'La méthode de paiement ne peut pas dépasser 100 caractères'),

  paidDate: z
    .string()
    .datetime('Date de paiement invalide')
    .optional(), // Si non fourni, utiliser la date actuelle

  notes: z
    .string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .optional()
    .nullable(),
});

/**
 * Type pour le paiement d'une facture
 */
export type InvoicePaymentData = z.infer<typeof invoicePaymentSchema>;

/**
 * Schéma pour envoyer une facture à un client
 */
export const invoiceSendSchema = z.object({
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
 * Type pour l'envoi d'une facture
 */
export type InvoiceSendData = z.infer<typeof invoiceSendSchema>;

/**
 * Helper pour calculer le montant d'une ligne de facture
 */
export function calculateItemAmount(quantity: number, unitPrice: number): number {
  return Number((quantity * unitPrice).toFixed(2));
}

/**
 * Helper pour calculer le sous-total d'une facture
 */
export function calculateSubtotal(items: InvoiceItemData[]): number {
  return Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
}

/**
 * Helper pour calculer le montant de taxe
 */
export function calculateTaxAmount(subtotal: number, taxRate: number): number {
  return Number((subtotal * taxRate).toFixed(2));
}

/**
 * Helper pour calculer le total d'une facture
 */
export function calculateTotal(
  subtotal: number,
  taxAmount: number,
  discount: number
): number {
  return Number((subtotal + taxAmount - discount).toFixed(2));
}
