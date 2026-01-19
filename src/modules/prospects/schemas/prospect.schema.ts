/**
 * Schémas de validation Zod pour le module Prospects
 *
 * Note : Les validations téléphone sont internationales
 * et supportent les formats de plusieurs pays (France, Burkina Faso,
 * Côte d'Ivoire, Sénégal, Mali, etc.).
 *
 * @module modules/prospects/schemas
 */

import { z } from 'zod';
import { CargoType, TransportMode } from '@/lib/db/enums';
import { emailSchema, phoneSchema } from '@/lib/validators';

/**
 * Schéma pour les données de devis dans la création de prospect
 */
export const quoteDataSchema = z.object({
  /** Pays d'origine (code ou nom) */
  originCountry: z.string().min(2, 'Pays d\'origine requis'),

  /** Pays de destination (code ou nom) */
  destinationCountry: z.string().min(2, 'Pays de destination requis'),

  /** Type de marchandise */
  cargoType: z.nativeEnum(CargoType, {
    errorMap: () => ({ message: 'Type de marchandise invalide' })
  }),

  /** Poids en kg */
  weight: z.number().positive('Le poids doit être positif').max(100000, 'Poids maximum: 100 000 kg'),

  /** Volume en m³ (optionnel) */
  volume: z.number().positive('Le volume doit être positif').max(10000, 'Volume maximum: 10 000 m³').optional().nullable(),

  /** Modes de transport (1 à 4) */
  transportMode: z.array(z.nativeEnum(TransportMode)).min(1, 'Au moins un mode de transport requis').max(4, 'Maximum 4 modes de transport'),

  /** Coût estimé calculé */
  estimatedCost: z.number().positive('Le coût estimé doit être positif'),

  /** Devise (par défaut EUR) */
  currency: z.string().length(3, 'Code devise ISO 4217').default('EUR').optional(),
});

/**
 * Schéma pour la création d'un prospect avec devis
 *
 * Les validations téléphone supportent les formats internationaux :
 * - France : +33 6 12 34 56 78, 06 12 34 56 78
 * - Burkina Faso : +226 70 12 34 56
 * - Côte d'Ivoire : +225 07 12 34 56 78
 * - Sénégal : +221 77 123 45 67
 */
export const prospectSchema = z.object({
  /** Email du prospect (obligatoire, normalisé en minuscules) */
  email: emailSchema,

  /** Téléphone du prospect (obligatoire, format international) */
  phone: phoneSchema,

  /** Nom du prospect (optionnel) */
  name: z.string().min(2, 'Nom trop court').max(100, 'Nom trop long').optional().nullable(),

  /** Entreprise du prospect (optionnel) */
  company: z.string().min(2, 'Nom d\'entreprise trop court').max(200, 'Nom trop long').optional().nullable(),

  /** Données du devis */
  quoteData: quoteDataSchema,
});

/**
 * Schéma pour la finalisation d'inscription d'un prospect
 *
 * Validation téléphone internationale supportée.
 */
export const completeRegistrationSchema = z.object({
  /** Mot de passe (min 8 caractères avec majuscule, minuscule et chiffre) */
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    ),

  /** Nom complet */
  name: z.string().min(2, 'Nom trop court').max(100, 'Nom trop long'),

  /** Téléphone (format international) */
  phone: phoneSchema,

  /** Pays de résidence */
  country: z.string().min(2, 'Pays requis').max(100, 'Nom de pays trop long'),
});

/**
 * Schéma pour le rattachement à un compte existant
 */
export const attachToAccountSchema = z.object({
  /** Mot de passe du compte existant */
  password: z.string().min(1, 'Mot de passe requis'),
});

/**
 * Schéma pour le formulaire de contact simple (modal)
 *
 * Validations internationales pour email et téléphone.
 */
export const contactFormSchema = z.object({
  /** Nom du contact (obligatoire) */
  name: z.string().min(2, 'Nom trop court').max(100, 'Nom trop long'),

  /** Email du contact (obligatoire, normalisé) */
  email: emailSchema,

  /** Téléphone du contact (obligatoire, format international) */
  phone: phoneSchema,

  /** Objet de la demande (obligatoire) */
  subject: z.string().min(5, 'Objet trop court').max(200, 'Objet trop long'),
});

/**
 * Types TypeScript inférés des schémas
 */
export type ProspectFormData = z.infer<typeof prospectSchema>;
export type CompleteRegistrationFormData = z.infer<typeof completeRegistrationSchema>;
export type AttachToAccountFormData = z.infer<typeof attachToAccountSchema>;
export type QuoteDataFormData = z.infer<typeof quoteDataSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
