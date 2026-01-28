/**
 * Schémas de validation : Événements de Tracking
 *
 * Définition des schémas Zod pour valider les données
 * des événements de tracking (création, mise à jour GPS, etc.)
 *
 * Les coordonnées GPS sont validées avec les plages standard :
 * - Latitude : -90 à +90 (pôle Sud à pôle Nord)
 * - Longitude : -180 à +180 (ligne de changement de date)
 *
 * @module modules/tracking/schemas
 */

import { z } from 'zod';
import { ShipmentStatus } from '@/lib/db/enums';

/**
 * Schéma de validation pour les coordonnées GPS
 *
 * Valide que les coordonnées sont dans les plages valides :
 * - Latitude : entre -90 et +90 degrés
 * - Longitude : entre -180 et +180 degrés
 */
export const gpsCoordinatesSchema = z.object({
  // Latitude : position Nord/Sud par rapport à l'équateur
  // -90 (pôle Sud) à +90 (pôle Nord)
  latitude: z
    .number()
    .min(-90, 'La latitude doit être entre -90 et 90')
    .max(90, 'La latitude doit être entre -90 et 90'),

  // Longitude : position Est/Ouest par rapport au méridien de Greenwich
  // -180 à +180 (ligne de changement de date)
  longitude: z
    .number()
    .min(-180, 'La longitude doit être entre -180 et 180')
    .max(180, 'La longitude doit être entre -180 et 180'),
});

/**
 * Schéma de validation pour la création d'un événement de tracking
 *
 * Valide les informations suivantes :
 * - shipmentId : Identifiant de l'expédition (obligatoire)
 * - status : Nouveau statut de l'expédition (enum ShipmentStatus)
 * - location : Nom de la localisation textuelle (ville, adresse, etc.)
 * - latitude/longitude : Coordonnées GPS optionnelles
 * - description : Note ou commentaire sur l'événement (optionnel)
 *
 * Exemple d'utilisation :
 * ```typescript
 * const data = addTrackingEventSchema.parse({
 *   shipmentId: 'clxyz123...',
 *   status: 'IN_TRANSIT',
 *   location: 'Ouagadougou, Burkina Faso',
 *   latitude: 12.3714,
 *   longitude: -1.5197,
 *   description: 'Colis arrivé au hub de distribution',
 * });
 * ```
 */
export const addTrackingEventSchema = z.object({
  // ════════════════════════════════════════════
  // IDENTIFIANT DE L'EXPÉDITION
  // ════════════════════════════════════════════
  shipmentId: z
    .string()
    .min(1, "L'identifiant de l'expédition est requis")
    .cuid("L'identifiant de l'expédition n'est pas valide"),

  // ════════════════════════════════════════════
  // NOUVEAU STATUT
  // ════════════════════════════════════════════
  // Le statut sera appliqué à l'expédition si différent du statut actuel
  status: z.nativeEnum(ShipmentStatus, {
    message: 'Statut invalide',
  }),

  // ════════════════════════════════════════════
  // LOCALISATION TEXTUELLE (obligatoire)
  // ════════════════════════════════════════════
  // Nom lisible de la localisation (ex: "Ouagadougou, Burkina Faso")
  // Utilisé pour l'affichage dans la timeline
  location: z
    .string()
    .min(2, 'La localisation doit contenir au moins 2 caractères')
    .max(200, 'La localisation ne peut pas dépasser 200 caractères'),

  // ════════════════════════════════════════════
  // COORDONNÉES GPS (optionnelles)
  // ════════════════════════════════════════════
  // Latitude : position Nord/Sud (-90 à +90)
  latitude: z
    .number()
    .min(-90, 'La latitude doit être entre -90 et 90')
    .max(90, 'La latitude doit être entre -90 et 90')
    .optional()
    .nullable(),

  // Longitude : position Est/Ouest (-180 à +180)
  longitude: z
    .number()
    .min(-180, 'La longitude doit être entre -180 et 180')
    .max(180, 'La longitude doit être entre -180 et 180')
    .optional()
    .nullable(),

  // ════════════════════════════════════════════
  // DESCRIPTION / NOTE (optionnelle)
  // ════════════════════════════════════════════
  // Commentaire ou détail supplémentaire sur l'événement
  // Ex: "Colis en attente de dédouanement - document manquant"
  description: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional()
    .nullable(),

  // ════════════════════════════════════════════
  // MÉTADONNÉES (optionnelles)
  // ════════════════════════════════════════════
  // Données supplémentaires au format JSON (photos, signatures, etc.)
  metadata: z.any().optional().nullable(),
});

/**
 * Type TypeScript dérivé du schéma addTrackingEventSchema
 * Utilisable pour typer les formulaires et les Server Actions
 */
export type AddTrackingEventInput = z.infer<typeof addTrackingEventSchema>;

/**
 * Schéma partiel pour la mise à jour de position GPS uniquement
 *
 * Utilisé pour des mises à jour légères (tracking temps réel)
 * où seules les coordonnées changent
 */
export const updateGpsPositionSchema = z.object({
  shipmentId: z.string().cuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  location: z.string().min(2).max(200).optional(),
});

export type UpdateGpsPositionInput = z.infer<typeof updateGpsPositionSchema>;
