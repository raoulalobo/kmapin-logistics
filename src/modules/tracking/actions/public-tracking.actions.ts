/**
 * Server Actions : Tracking Public
 *
 * Actions serveur pour le suivi public des expéditions (sans authentification)
 * Utilise le client Prisma standard et filtre manuellement les données sensibles
 *
 * IMPORTANT : Ces actions bypassen Zenstack pour permettre l'accès public
 * mais filtrent explicitement toutes les données financières et internes
 *
 * @module modules/tracking/actions/public-tracking
 */

'use server';

import { prisma } from '@/lib/db/client';
import { ShipmentStatus } from '@/generated/prisma';

/**
 * Interface pour les données de tracking publiques (filtrées)
 * Exclut toutes les informations sensibles (coûts, notes internes, GPS, etc.)
 */
export interface PublicShipmentTracking {
  trackingNumber: string;
  status: ShipmentStatus;
  statusLabel: string;

  // Origine/Destination (informations publiques)
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;

  // Dates (publiques)
  estimatedDeliveryDate: Date | null;
  actualDeliveryDate: Date | null;
  requestedPickupDate: Date | null;
  actualPickupDate: Date | null;

  // Transport (informations publiques)
  cargoType: string;
  weight: number;
  packageCount: number;
  transportMode: string[];

  // Company (nom uniquement, pas d'infos sensibles)
  companyName: string;

  // Events de tracking (simplifiés)
  trackingEvents: PublicTrackingEvent[];

  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicTrackingEvent {
  id: string;
  status: ShipmentStatus;
  statusLabel: string;
  location: string; // Ville/Région uniquement (pas de coordonnées GPS)
  timestamp: Date;
  description: string | null; // Filtré (notes internes exclues)
}

/**
 * Traduire un statut ShipmentStatus en français
 */
function translateStatus(status: ShipmentStatus): string {
  const translations: Record<ShipmentStatus, string> = {
    DRAFT: 'Brouillon',
    PENDING_APPROVAL: 'En attente d\'approbation',
    APPROVED: 'Approuvé',
    PICKED_UP: 'Collecté',
    IN_TRANSIT: 'En transit',
    AT_CUSTOMS: 'En douane',
    CUSTOMS_CLEARED: 'Dédouané',
    OUT_FOR_DELIVERY: 'En cours de livraison',
    READY_FOR_PICKUP: 'Disponible au retrait',
    DELIVERED: 'Livré',
    CANCELLED: 'Annulé',
    ON_HOLD: 'En attente',
    EXCEPTION: 'Exception',
  };
  return translations[status] || status;
}

/**
 * Valider le format du numéro de tracking
 *
 * Formats acceptés :
 * 1. Format actuel : {PAYS}-{CODE3}-{JJAA}-{SEQ5}
 *    - PAYS : Code pays ISO 2 lettres (ex: BF, FR, CI)
 *    - CODE3 : Code aléatoire 3 caractères alphanumériques
 *    - JJAA : Jour (2 chiffres) + Année (2 derniers chiffres)
 *    - SEQ5 : Séquence journalière sur 5 chiffres
 *    - Exemple : BF-XK7-1425-00042
 *
 * 2. Format historique : SHP-YYYYMMDD-XXXXX
 *    - Exemple : SHP-20250109-A1B2C
 *
 * @param trackingNumber - Numéro de tracking à valider
 * @returns true si valide, false sinon
 */
function isValidTrackingNumber(trackingNumber: string): boolean {
  const trimmed = trackingNumber.trim().toUpperCase();

  // Format actuel : XX-XXX-DDYY-XXXXX (ex: BF-XK7-1425-00042)
  // - 2 lettres (pays) - 3 alphanumériques - 4 chiffres (JJAA) - 5 chiffres (séquence)
  const currentFormatRegex = /^[A-Z]{2}-[A-Z0-9]{3}-\d{4}-\d{5}$/;

  // Format historique : SHP-YYYYMMDD-XXXXX (ex: SHP-20250109-A1B2C)
  const legacyFormatRegex = /^SHP-\d{8}-[A-Z0-9]{5}$/;

  return currentFormatRegex.test(trimmed) || legacyFormatRegex.test(trimmed);
}

/**
 * Récupérer le tracking public d'une expédition par son numéro de tracking
 *
 * Cette fonction est accessible SANS authentification et filtre automatiquement
 * les données sensibles (coûts, notes internes, GPS, etc.)
 *
 * Restrictions de sécurité :
 * - Les expéditions en statut DRAFT ne sont PAS accessibles publiquement
 * - Les coordonnées GPS sont exclues
 * - Les coûts (estimatedCost, actualCost) sont masqués
 * - Les notes internes et métadonnées sensibles sont filtrées
 *
 * @param trackingNumber - Numéro de tracking (format XX-XXX-0000-00000 ou SHP-YYYYMMDD-XXXXX)
 * @returns Données publiques de tracking ou null si introuvable/non accessible
 */
export async function getPublicTracking(
  trackingNumber: string
): Promise<PublicShipmentTracking | null> {
  try {
    // Validation du format
    if (!isValidTrackingNumber(trackingNumber)) {
      console.warn(`[getPublicTracking] Format invalide : ${trackingNumber}`);
      return null;
    }

    // Récupérer l'expédition avec le client Prisma standard (bypass Zenstack)
    // IMPORTANT: Pour les guests (public), on ne récupère que le DERNIER événement
    // L'historique complet est réservé aux utilisateurs connectés (dashboard)
    const shipment = await prisma.shipment.findUnique({
      where: { trackingNumber },
      include: {
        client: {
          select: {
            name: true, // Nom uniquement (pas d'email, taxId, etc.)
          },
        },
        trackingEvents: {
          orderBy: { timestamp: 'desc' }, // Tri décroissant pour avoir le plus récent en premier
          take: 1, // LIMITER à 1 seul événement (le dernier)
          select: {
            id: true,
            status: true,
            location: true,
            description: true,
            timestamp: true,
            // EXCLURE : latitude, longitude, metadata (sensibles)
          },
        },
      },
    });

    // Shipment introuvable
    if (!shipment) {
      return null;
    }

    // Bloquer l'accès aux shipments en DRAFT (brouillon = interne uniquement)
    if (shipment.status === ShipmentStatus.DRAFT) {
      console.warn(`[getPublicTracking] Accès DRAFT refusé : ${trackingNumber}`);
      return null;
    }

    // Construire les tracking events publics (filtrés)
    const publicEvents: PublicTrackingEvent[] = shipment.trackingEvents.map((event) => ({
      id: event.id,
      status: event.status as ShipmentStatus,
      statusLabel: translateStatus(event.status as ShipmentStatus),
      location: event.location,
      timestamp: event.timestamp,
      description: event.description, // Déjà filtré (pas de notes internes en DB)
    }));

    // Construire la réponse publique (SANS données sensibles)
    const publicTracking: PublicShipmentTracking = {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status as ShipmentStatus,
      statusLabel: translateStatus(shipment.status as ShipmentStatus),

      // Origine/Destination (publiques)
      originCity: shipment.originCity,
      originCountry: shipment.originCountry,
      destinationCity: shipment.destinationCity,
      destinationCountry: shipment.destinationCountry,

      // Dates (publiques)
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
      actualDeliveryDate: shipment.actualDeliveryDate,
      requestedPickupDate: shipment.requestedPickupDate,
      actualPickupDate: shipment.actualPickupDate,

      // Transport (publiques)
      cargoType: shipment.cargoType,
      weight: shipment.weight,
      packageCount: shipment.packageCount,
      transportMode: shipment.transportMode as string[],

      // Company (nom uniquement, "Non spécifié" si pas de client)
      companyName: shipment.client?.name || 'Non spécifié',

      // Events filtrés
      trackingEvents: publicEvents,

      // Métadonnées de base
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };

    return publicTracking;
  } catch (error) {
    console.error('[getPublicTracking] Erreur :', error);
    return null;
  }
}

/**
 * Vérifier si un numéro de tracking existe (sans révéler de détails)
 *
 * Utile pour l'UX du formulaire de recherche (afficher un message d'erreur clair)
 *
 * @param trackingNumber - Numéro de tracking à vérifier
 * @returns true si le numéro existe, false sinon
 */
export async function checkTrackingNumberExists(
  trackingNumber: string
): Promise<boolean> {
  try {
    if (!isValidTrackingNumber(trackingNumber)) {
      return false;
    }

    const count = await prisma.shipment.count({
      where: {
        trackingNumber,
        // Exclure les DRAFT (non publics)
        status: {
          not: ShipmentStatus.DRAFT,
        },
      },
    });

    return count > 0;
  } catch (error) {
    console.error('[checkTrackingNumberExists] Erreur :', error);
    return false;
  }
}
