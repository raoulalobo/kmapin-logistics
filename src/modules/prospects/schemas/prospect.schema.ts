/**
 * Schémas de validation Zod pour le module Prospects
 *
 * @module modules/prospects/schemas
 */

import { z } from 'zod';
import { CargoType, TransportMode } from '@/generated/prisma';

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
 */
export const prospectSchema = z.object({
  /** Email du prospect (obligatoire) */
  email: z.string().email('Email invalide').max(100, 'Email trop long'),

  /** Téléphone du prospect (obligatoire) */
  phone: z.string().min(10, 'Numéro de téléphone invalide').max(20, 'Numéro trop long'),

  /** Nom du prospect (optionnel) */
  name: z.string().min(2, 'Nom trop court').max(100, 'Nom trop long').optional().nullable(),

  /** Entreprise du prospect (optionnel) */
  company: z.string().min(2, 'Nom d\'entreprise trop court').max(200, 'Nom trop long').optional().nullable(),

  /** Données du devis */
  quoteData: quoteDataSchema,
});

/**
 * Schéma pour la finalisation d'inscription d'un prospect
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

  /** Téléphone */
  phone: z.string().min(10, 'Numéro de téléphone invalide').max(20, 'Numéro trop long'),

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
 * Types TypeScript inférés des schémas
 */
export type ProspectFormData = z.infer<typeof prospectSchema>;
export type CompleteRegistrationFormData = z.infer<typeof completeRegistrationSchema>;
export type AttachToAccountFormData = z.infer<typeof attachToAccountSchema>;
export type QuoteDataFormData = z.infer<typeof quoteDataSchema>;
