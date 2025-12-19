/**
 * Schémas de validation Zod pour le module Guest Quotes
 *
 * @module modules/guest-quotes/schemas
 */

import { z } from 'zod';
import { CargoType, TransportMode } from '@prisma/client';

/**
 * Schéma pour la création d'un GuestQuote
 */
export const guestQuoteSchema = z.object({
  /** ID du prospect */
  prospectId: z.string().cuid('ID prospect invalide'),

  /** Pays d'origine */
  originCountry: z.string().min(2, 'Pays d\'origine requis'),

  /** Pays de destination */
  destinationCountry: z.string().min(2, 'Pays de destination requis'),

  /** Type de marchandise */
  cargoType: z.nativeEnum(CargoType),

  /** Poids en kg */
  weight: z.number().positive('Le poids doit être positif').max(100000, 'Poids maximum: 100 000 kg'),

  /** Volume en m³ (optionnel) */
  volume: z.number().positive('Le volume doit être positif').max(10000, 'Volume maximum: 10 000 m³').optional().nullable(),

  /** Modes de transport */
  transportMode: z.array(z.nativeEnum(TransportMode)).min(1, 'Au moins un mode de transport requis'),

  /** Coût estimé */
  estimatedCost: z.number().positive('Le coût estimé doit être positif'),

  /** Devise */
  currency: z.string().length(3, 'Code devise ISO 4217').default('EUR'),

  /** Date de validité */
  validUntil: z.date().or(z.string().datetime()),
});

/**
 * Types TypeScript inférés
 */
export type GuestQuoteFormData = z.infer<typeof guestQuoteSchema>;
