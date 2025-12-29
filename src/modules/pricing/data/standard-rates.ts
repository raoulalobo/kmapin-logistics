/**
 * Données des tarifs standards par destination
 *
 * @module modules/pricing/data
 */

import { TransportMode, CargoType } from '@/generated/prisma';

/**
 * Interface pour un tarif standard
 */
export interface StandardRate {
  /** ID unique du tarif */
  id: string;
  /** Nom du pays d'origine */
  origin: string;
  /** Code pays d'origine (ISO 2 lettres) */
  originCode: string;
  /** Nom de la destination */
  destination: string;
  /** Code pays de la destination (ISO 2 lettres) */
  destinationCode: string;
  /** Mode de transport */
  transportMode: TransportMode;
  /** Type de marchandise */
  cargoType: CargoType;
  /** Prix par kg */
  pricePerKg: number;
  /** Prix minimum */
  minPrice: number;
  /** Prix maximum */
  maxPrice: number;
  /** Délai minimum (jours) */
  estimatedDaysMin: number;
  /** Délai maximum (jours) */
  estimatedDaysMax: number;
  /** Devise */
  currency: string;
}

/**
 * Tarifs standards par destination et mode de transport
 *
 * Ces tarifs sont indicatifs et servent de référence pour les clients
 */
export const STANDARD_RATES: StandardRate[] = [
  // ALLEMAGNE
  {
    id: 'eu-de-road-general',
    destination: 'Allemagne',
    destinationCode: 'DE',
    transportMode: TransportMode.ROAD,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.45,
    minPrice: 200,
    maxPrice: 2000,
    estimatedDaysMin: 2,
    estimatedDaysMax: 4,
    currency: 'EUR',
  },
  {
    id: 'eu-de-rail-general',
    destination: 'Allemagne',
    destinationCode: 'DE',
    transportMode: TransportMode.RAIL,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.38,
    minPrice: 250,
    maxPrice: 1800,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    currency: 'EUR',
  },

  // BELGIQUE
  {
    id: 'eu-be-road-general',
    destination: 'Belgique',
    destinationCode: 'BE',
    transportMode: TransportMode.ROAD,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.35,
    minPrice: 150,
    maxPrice: 1500,
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    currency: 'EUR',
  },

  // ESPAGNE
  {
    id: 'eu-es-road-general',
    destination: 'Espagne',
    destinationCode: 'ES',
    transportMode: TransportMode.ROAD,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.55,
    minPrice: 250,
    maxPrice: 2500,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    currency: 'EUR',
  },
  {
    id: 'eu-es-sea-general',
    destination: 'Espagne',
    destinationCode: 'ES',
    transportMode: TransportMode.SEA,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.30,
    minPrice: 400,
    maxPrice: 3000,
    estimatedDaysMin: 5,
    estimatedDaysMax: 8,
    currency: 'EUR',
  },

  // ITALIE
  {
    id: 'eu-it-road-general',
    destination: 'Italie',
    destinationCode: 'IT',
    transportMode: TransportMode.ROAD,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.50,
    minPrice: 230,
    maxPrice: 2200,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    currency: 'EUR',
  },

  // ROYAUME-UNI
  {
    id: 'eu-gb-road-general',
    destination: 'Royaume-Uni',
    destinationCode: 'GB',
    transportMode: TransportMode.ROAD,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.60,
    minPrice: 300,
    maxPrice: 2800,
    estimatedDaysMin: 2,
    estimatedDaysMax: 4,
    currency: 'EUR',
  },
  {
    id: 'eu-gb-sea-general',
    destination: 'Royaume-Uni',
    destinationCode: 'GB',
    transportMode: TransportMode.SEA,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.35,
    minPrice: 350,
    maxPrice: 2500,
    estimatedDaysMin: 3,
    estimatedDaysMax: 6,
    currency: 'EUR',
  },

  // PAYS-BAS
  {
    id: 'eu-nl-road-general',
    destination: 'Pays-Bas',
    destinationCode: 'NL',
    transportMode: TransportMode.ROAD,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.40,
    minPrice: 180,
    maxPrice: 1800,
    estimatedDaysMin: 2,
    estimatedDaysMax: 4,
    currency: 'EUR',
  },

  // POLOGNE
  {
    id: 'eu-pl-road-general',
    destination: 'Pologne',
    destinationCode: 'PL',
    transportMode: TransportMode.ROAD,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.52,
    minPrice: 280,
    maxPrice: 2400,
    estimatedDaysMin: 3,
    estimatedDaysMax: 6,
    currency: 'EUR',
  },

  // CHINE
  {
    id: 'asia-cn-sea-general',
    destination: 'Chine',
    destinationCode: 'CN',
    transportMode: TransportMode.SEA,
    cargoType: CargoType.GENERAL,
    pricePerKg: 1.20,
    minPrice: 1500,
    maxPrice: 15000,
    estimatedDaysMin: 25,
    estimatedDaysMax: 35,
    currency: 'EUR',
  },
  {
    id: 'asia-cn-air-general',
    destination: 'Chine',
    destinationCode: 'CN',
    transportMode: TransportMode.AIR,
    cargoType: CargoType.GENERAL,
    pricePerKg: 4.50,
    minPrice: 800,
    maxPrice: 25000,
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
    currency: 'EUR',
  },

  // ÉTATS-UNIS
  {
    id: 'na-us-sea-general',
    destination: 'États-Unis',
    destinationCode: 'US',
    transportMode: TransportMode.SEA,
    cargoType: CargoType.GENERAL,
    pricePerKg: 1.50,
    minPrice: 1800,
    maxPrice: 18000,
    estimatedDaysMin: 20,
    estimatedDaysMax: 30,
    currency: 'EUR',
  },
  {
    id: 'na-us-air-general',
    destination: 'États-Unis',
    destinationCode: 'US',
    transportMode: TransportMode.AIR,
    cargoType: CargoType.GENERAL,
    pricePerKg: 5.00,
    minPrice: 1000,
    maxPrice: 30000,
    estimatedDaysMin: 2,
    estimatedDaysMax: 5,
    currency: 'EUR',
  },

  // MAROC
  {
    id: 'af-ma-sea-general',
    destination: 'Maroc',
    destinationCode: 'MA',
    transportMode: TransportMode.SEA,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.70,
    minPrice: 500,
    maxPrice: 5000,
    estimatedDaysMin: 4,
    estimatedDaysMax: 8,
    currency: 'EUR',
  },
  {
    id: 'af-ma-road-general',
    destination: 'Maroc',
    destinationCode: 'MA',
    transportMode: TransportMode.ROAD,
    cargoType: CargoType.GENERAL,
    pricePerKg: 0.85,
    minPrice: 400,
    maxPrice: 4000,
    estimatedDaysMin: 5,
    estimatedDaysMax: 7,
    currency: 'EUR',
  },
];
