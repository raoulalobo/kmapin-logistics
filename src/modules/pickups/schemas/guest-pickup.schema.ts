/**
 * Schémas de validation pour les demandes d'enlèvement guest (non connecté)
 *
 * Ce schéma définit la structure de données pour le formulaire public de demande d'enlèvement.
 * Il est utilisé à la fois côté client (React Hook Form) et côté serveur (validation Server Action).
 *
 * Pattern: Prospect + GuestPickupRequest
 * - Le formulaire collecte les coordonnées du prospect (email, téléphone, nom)
 * - Les données d'enlèvement sont stockées dans GuestPickupRequest
 * - Lors de l'inscription, les données sont converties en PickupRequest authentifié
 *
 * Note : Les validations téléphone et code postal sont internationales
 * et supportent les formats de plusieurs pays (France, Burkina Faso,
 * Côte d'Ivoire, Sénégal, Mali, etc.).
 */

import { z } from 'zod';
import { PickupTimeSlot } from '@/lib/db/enums';
import {
  emailSchema,
  phoneSchema,
  phoneSchemaOptional,
  postalCodeSchema,
  countryCodeSchema,
} from '@/lib/validators';

/**
 * Schéma pour création de GuestPickupRequest
 * Utilisé par le formulaire public
 *
 * Validations principales:
 * - Email valide requis
 * - Téléphone minimum 10 caractères
 * - Adresse complète (adresse, ville, code postal, pays)
 * - Date/créneau horaire requis
 * - Type de marchandise requis
 */
export const guestPickupRequestSchema = z.object({
  // ============================================
  // INFORMATIONS PROSPECT
  // ============================================
  prospectEmail: emailSchema,
  prospectPhone: phoneSchema,
  prospectName: z.string().min(2, 'Nom requis').optional(),

  // ============================================
  // ADRESSE D'ENLÈVEMENT
  // ============================================
  pickupAddress: z.string().min(5, 'Adresse complète requise'),
  pickupCity: z.string().min(2, 'Ville requise'),
  pickupPostalCode: postalCodeSchema,
  pickupCountry: countryCodeSchema.default('FR'),

  // ============================================
  // CONTACT SUR PLACE (optionnel)
  // ============================================
  pickupContact: z.string().optional().nullable(),
  pickupPhone: phoneSchemaOptional.nullable(),

  // Planification
  requestedDate: z.string().datetime('Date invalide'),
  timeSlot: z.nativeEnum(PickupTimeSlot).default(PickupTimeSlot.FLEXIBLE),
  pickupTime: z.string().optional().nullable(), // Format HH:mm si SPECIFIC_TIME

  // Détails marchandise
  cargoType: z.string().min(2, 'Type de marchandise requis'),
  estimatedWeight: z.number().positive('Poids doit être positif').optional().nullable(),
  estimatedVolume: z.number().positive('Volume doit être positif').optional().nullable(),
  description: z.string().max(2000, 'Description trop longue').optional().nullable(),

  // Instructions (optionnel)
  specialInstructions: z.string().max(1000).optional().nullable(),
  accessInstructions: z.string().max(1000).optional().nullable(),
});

/**
 * Type TypeScript inféré du schéma Zod
 * Utilisé pour typer les formulaires React Hook Form
 */
export type GuestPickupRequestFormData = z.infer<typeof guestPickupRequestSchema>;
