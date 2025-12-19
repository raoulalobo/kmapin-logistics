/**
 * Schémas de validation Zod pour le module Pricing
 *
 * @module modules/pricing/schemas
 */

import { z } from 'zod';
import { TransportMode } from '@/generated/prisma';

/**
 * Schéma pour les filtres de tarifs standards
 */
export const pricingFiltersSchema = z.object({
  /** Recherche textuelle (destination) */
  search: z.string().optional(),

  /** Filtrer par mode de transport */
  transportMode: z.nativeEnum(TransportMode).optional(),

  /** Filtrer par code pays de destination */
  destinationCode: z.string().length(2).optional(),
});

/**
 * Types TypeScript inférés
 */
export type PricingFiltersData = z.infer<typeof pricingFiltersSchema>;
