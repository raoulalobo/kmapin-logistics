/**
 * Tests unitaires — Calculateur de prix volumétrique (VERSION DYNAMIQUE)
 *
 * Couverture :
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Fonction                    │  Cas testés                              │
 * ├──────────────────────────────┼───────────────────────────────────────────┤
 * │  calculerVolume              │  calcul correct, dimensions nulles        │
 * │  calculerPrixDevisDynamic    │  AIR/ROAD/RAIL/SEA, sans dim, route,     │
 * │                              │  fallback, surcharge cargo, priorité      │
 * │  calculerPrixMultiPackages   │  multi-colis, priorité, colis vide        │
 * └──────────────────────────────┴───────────────────────────────────────────┘
 *
 * Stratégie de mock — rupture de la chaîne Prisma :
 *
 * Le module testé importe :
 *   pricing-calculator-dynamic.ts
 *     ├── @/lib/db/enums           → importe @/generated/prisma (non disponible en test)
 *     ├── @/modules/pricing-config → importe @/lib/db/client   (Prisma)
 *     └── @/modules/transport-rates → importe @/lib/db/client  (Prisma)
 *
 * Solution : mocker les 3 dépendances de façon autonome (sans importOriginal)
 * pour éviter le chargement de Prisma et @/generated/prisma.
 *
 * @module modules/quotes/lib/__tests__/pricing-calculator-dynamic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// vi.hoisted — variables accessibles dans les factories de mock
//
// vi.mock() est hoisted (remonté avant les imports) par Vitest.
// Les variables déclarées avec `const` après les imports ne sont PAS encore
// initialisées quand le factory est exécuté (Temporal Dead Zone).
//
// vi.hoisted() résout ce problème : son callback est exécuté AVANT les mocks,
// rendant DEFAULT_CONFIG disponible dans tous les vi.mock() factories.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration tarifaire par défaut — équivalent de DEFAULT_PRICING_CONFIG
 * Définie via vi.hoisted() pour être disponible dans les factories de mock.
 *
 * Valeurs clés pour les calculs attendus dans les tests :
 *   transportMultipliers = tarifs DIRECTS par mode (plus de coefficient caché) :
 *     AIR: 3.0 €/kg → 75 kg × 3.0 = 225 €
 *     ROAD: 1.0 €/kg
 *     RAIL: 0.8 €/kg
 *     SEA: 120.0 €/m³ (= ancien defaultRatePerM3(200) × 0.6 — même résultat numérique)
 *   volumetricWeightRatios = { AIR: 167, ROAD: 333, SEA: 1, RAIL: 250 }
 *   useVolumetricWeight   = { AIR: true, ROAD: true, SEA: false, RAIL: true }
 *   cargoTypeSurcharges   = { FRAGILE: 0.3, DANGEROUS: 0.5, GENERAL: 0 }
 *   prioritySurcharges    = { STANDARD: 0, NORMAL: 0.1, EXPRESS: 0.5, URGENT: 0.3 }
 */
const DEFAULT_CONFIG = vi.hoisted(() => ({
  transportMultipliers: { ROAD: 1.0, SEA: 120.0, AIR: 3.0, RAIL: 0.8 },
  cargoTypeSurcharges: {
    GENERAL: 0,
    DANGEROUS: 0.5,
    PERISHABLE: 0.4,
    FRAGILE: 0.3,
    BULK: -0.1,
    CONTAINER: 0.2,
    PALLETIZED: 0.15,
    OTHER: 0.1,
  },
  prioritySurcharges: { STANDARD: 0, NORMAL: 0.1, EXPRESS: 0.5, URGENT: 0.3 },
  deliverySpeedsPerMode: {
    ROAD: { min: 3, max: 7 },
    SEA: { min: 20, max: 45 },
    AIR: { min: 1, max: 3 },
    RAIL: { min: 7, max: 14 },
  },
  volumetricWeightRatios: { AIR: 167, ROAD: 333, SEA: 1, RAIL: 250 },
  useVolumetricWeightPerMode: { AIR: true, ROAD: true, SEA: false, RAIL: true },
}));

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS — déclarés AVANT tout import (vi.mock est hoisted par Vitest)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock de @/lib/db/enums
 *
 * Définit les enums TransportMode et CargoType directement dans le test,
 * sans charger @/generated/prisma qui n'est pas disponible hors Next.js.
 * Les enums Prisma sont des objets JS (pas uniquement des types TypeScript).
 */
vi.mock('@/lib/db/enums', () => ({
  TransportMode: {
    ROAD: 'ROAD',
    SEA: 'SEA',
    AIR: 'AIR',
    RAIL: 'RAIL',
  },
  CargoType: {
    GENERAL: 'GENERAL',
    DANGEROUS: 'DANGEROUS',
    PERISHABLE: 'PERISHABLE',
    FRAGILE: 'FRAGILE',
    OVERSIZED: 'OVERSIZED',
    BULK: 'BULK',
    CONTAINER: 'CONTAINER',
    PALLETIZED: 'PALLETIZED',
    OTHER: 'OTHER',
  },
}));

/**
 * Mock de @/modules/pricing-config
 * getPricingConfig retourne toujours DEFAULT_CONFIG (pas d'appel DB)
 */
vi.mock('@/modules/pricing-config', () => ({
  getPricingConfig: vi.fn().mockResolvedValue(DEFAULT_CONFIG),
  DEFAULT_PRICING_CONFIG: DEFAULT_CONFIG,
}));

/**
 * Mock de @/modules/transport-rates
 * getTransportRate retourne null par défaut (aucune route configurée = fallback)
 * Certains tests surchargeront la valeur via mockResolvedValueOnce
 */
vi.mock('@/modules/transport-rates', () => ({
  getTransportRate: vi.fn().mockResolvedValue(null),
}));

// Import du module testé — APRÈS les mocks (ordre crucial)
import {
  calculerVolume,
  calculerPrixDevisDynamic,
  calculerPrixMultiPackages,
} from '../pricing-calculator-dynamic';
import { getTransportRate } from '@/modules/transport-rates';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — constantes de test réutilisables
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dimensions standard pour les tests volumétriques
 * 100 × 80 × 60 cm → Volume = 480_000 cm³ / 1_000_000 = 0.48 m³
 */
const DIMS_48 = { longueur: 100, largeur: 80, hauteur: 60 };

/**
 * Tarif de route mocké pour les tests "priorité TransportRate"
 * Simule une route FR→BF/AIR configurée et active en BDD
 */
const mockTransportRate = {
  id: 'rate-001',
  originCountryCode: 'FR',
  destinationCountryCode: 'BF',
  transportMode: 'AIR' as const,
  ratePerKg: 7.25,    // tarif absolu pour cette route
  ratePerM3: 1200.0,
  cargoTypeSurcharges: {},
  prioritySurcharges: {},
  isActive: true,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Réinitialiser getTransportRate → null avant chaque test
beforeEach(() => {
  vi.mocked(getTransportRate).mockResolvedValue(null);
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 1 — calculerVolume (fonction pure, synchrone)
// ═════════════════════════════════════════════════════════════════════════════

describe('calculerVolume', () => {
  /**
   * Formule : Volume_m³ = (L × l × h) / 1_000_000
   * 100 × 80 × 60 = 480_000 cm³ = 0.48 m³
   */
  it('calcule correctement 100×80×60 cm → 0.48 m³', () => {
    const volume = calculerVolume(100, 80, 60);
    expect(volume).toBeCloseTo(0.48, 5);
  });

  it('calcule correctement 30×20×10 cm → 0.006 m³', () => {
    expect(calculerVolume(30, 20, 10)).toBeCloseTo(0.006, 6);
  });

  it('lève une erreur si longueur = 0', () => {
    expect(() => calculerVolume(0, 80, 60)).toThrow('Dimensions nulles');
  });

  it('lève une erreur si largeur = 0', () => {
    expect(() => calculerVolume(100, 0, 60)).toThrow('Dimensions nulles');
  });

  it('lève une erreur si hauteur = 0', () => {
    expect(() => calculerVolume(100, 80, 0)).toThrow('Dimensions nulles');
  });

  it('lève une erreur si une dimension est négative', () => {
    expect(() => calculerVolume(100, -10, 60)).toThrow('Dimensions nulles');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Masse taxable par mode de transport
// ═════════════════════════════════════════════════════════════════════════════

describe('calculerPrixDevisDynamic — masse taxable par mode', () => {

  // ─── AIR ──────────────────────────────────────────────────────────────────
  describe('AIR — norme IATA (167 kg/m³)', () => {
    /**
     * PV = 0.48 m³ × 167 = 80.16 kg
     * masseTaxable = MAX(50, 80.16) = 80.16 kg → facturation au VOLUME
     */
    it('facture au volume quand PV > poids réel (50 kg réel, 0.48 m³ → 80.16 kg vol)', async () => {
      const r = await calculerPrixDevisDynamic({
        poidsReel: 50, ...DIMS_48,
        modeTransport: 'AIR', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      });

      expect(r.poidsVolumetrique_kg).toBeCloseTo(80.16, 1);
      expect(r.masseTaxable).toBeCloseTo(80.16, 1);
      expect(r.uniteMasseTaxable).toBe('kg');
      expect(r.factureSurVolume).toBe(true);
    });

    /**
     * PV = 0.48 × 167 = 80.16 kg
     * masseTaxable = MAX(100, 80.16) = 100 kg → facturation au POIDS RÉEL
     */
    it('facture au poids réel quand poids réel > PV (100 kg réel, 0.48 m³ → 80.16 kg vol)', async () => {
      const r = await calculerPrixDevisDynamic({
        poidsReel: 100, ...DIMS_48,
        modeTransport: 'AIR', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      });

      expect(r.masseTaxable).toBe(100);
      expect(r.factureSurVolume).toBe(false);
    });
  });

  // ─── ROAD ─────────────────────────────────────────────────────────────────
  describe('ROAD — ratio standard (333 kg/m³)', () => {
    /**
     * PV = 0.48 × 333 = 159.84 kg
     * masseTaxable = MAX(50, 159.84) = 159.84 kg → facturation au VOLUME
     */
    it('facture au volume pour 50 kg réel, 0.48 m³ (PV = 159.84 kg)', async () => {
      const r = await calculerPrixDevisDynamic({
        poidsReel: 50, ...DIMS_48,
        modeTransport: 'ROAD', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      });

      expect(r.poidsVolumetrique_kg).toBeCloseTo(159.84, 1);
      expect(r.masseTaxable).toBeCloseTo(159.84, 1);
      expect(r.uniteMasseTaxable).toBe('kg');
      expect(r.factureSurVolume).toBe(true);
    });
  });

  // ─── RAIL ─────────────────────────────────────────────────────────────────
  describe('RAIL — ratio ferroviaire (250 kg/m³)', () => {
    /**
     * PV = 0.48 × 250 = 120 kg
     * masseTaxable = MAX(50, 120) = 120 kg → facturation au VOLUME
     */
    it('facture au volume pour 50 kg réel, 0.48 m³ (PV = 120 kg)', async () => {
      const r = await calculerPrixDevisDynamic({
        poidsReel: 50, ...DIMS_48,
        modeTransport: 'RAIL', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      });

      expect(r.poidsVolumetrique_kg).toBeCloseTo(120, 1);
      expect(r.masseTaxable).toBeCloseTo(120, 1);
      expect(r.uniteMasseTaxable).toBe('kg');
      expect(r.factureSurVolume).toBe(true);
    });
  });

  // ─── SEA ──────────────────────────────────────────────────────────────────
  describe('SEA — Unité Payante W/M (PAS de conversion m³ → kg)', () => {
    /**
     * Poids réel = 50 kg = 0.05 tonnes
     * Volume = 0.48 m³
     * UP = MAX(0.05, 0.48) = 0.48 → facturation au VOLUME (en m³, pas en kg)
     *
     * CRITIQUE : la masse taxable (0.48) est inférieure au poids réel (50 kg),
     * prouvant que les m³ NE sont PAS convertis en kg pour la mer.
     */
    it('retourne UP = 0.48 quand volume > poids en tonnes (50 kg, 0.48 m³)', async () => {
      const r = await calculerPrixDevisDynamic({
        poidsReel: 50, ...DIMS_48,
        modeTransport: 'SEA', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      });

      expect(r.masseTaxable).toBeCloseTo(0.48, 2);
      expect(r.uniteMasseTaxable).toBe('UP');
      expect(r.factureSurVolume).toBe(true);
      // Proof : masse taxable < poids réel → les m³ ne sont PAS convertis en kg
      expect(r.masseTaxable).toBeLessThan(50);
    });

    /**
     * Poids réel = 2000 kg = 2 tonnes
     * Volume = 0.48 m³
     * UP = MAX(2, 0.48) = 2 → facturation au POIDS (en tonnes)
     */
    it('retourne UP = 2 quand poids en tonnes > volume (2000 kg, 0.48 m³)', async () => {
      const r = await calculerPrixDevisDynamic({
        poidsReel: 2000, ...DIMS_48,
        modeTransport: 'SEA', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      });

      expect(r.masseTaxable).toBeCloseTo(2.0, 2);
      expect(r.uniteMasseTaxable).toBe('UP');
      expect(r.factureSurVolume).toBe(false);
    });

    /**
     * Sans dimensions : volume = 0, UP = MAX(poids_tonnes, 0) = poids_tonnes
     * Poids = 500 kg = 0.5 tonnes → UP = 0.5
     */
    it('utilise le poids en tonnes quand aucune dimension fournie (500 kg)', async () => {
      const r = await calculerPrixDevisDynamic({
        poidsReel: 500, longueur: 0, largeur: 0, hauteur: 0,
        modeTransport: 'SEA', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      });

      expect(r.masseTaxable).toBeCloseTo(0.5, 2);
      expect(r.uniteMasseTaxable).toBe('UP');
    });
  });

  // ─── Sans dimensions ──────────────────────────────────────────────────────
  describe('Sans dimensions (longueur/largeur/hauteur = 0)', () => {
    /**
     * Volume = 0 → PV = 0
     * Pour AIR : masseTaxable = MAX(75, 0) = 75 kg
     */
    it('utilise le poids réel brut quand aucune dimension fournie (mode AIR)', async () => {
      const r = await calculerPrixDevisDynamic({
        poidsReel: 75, longueur: 0, largeur: 0, hauteur: 0,
        modeTransport: 'AIR', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      });

      expect(r.masseTaxable).toBe(75);
      expect(r.poidsVolumetrique_kg).toBe(0);
      expect(r.factureSurVolume).toBe(false);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Source du tarif (priorité TransportRate vs fallback multiplicateurs)
// ═════════════════════════════════════════════════════════════════════════════

describe('calculerPrixDevisDynamic — source du tarif', () => {
  /**
   * FALLBACK : pas de TransportRate → tarif = transportMultipliers[mode] (tarif direct)
   * transportMultipliers.AIR = 3.0 €/kg
   * masseTaxable = 75 kg (sans dims, AIR)
   * coutBase = 75 × 3.0 = 225.00 €
   */
  it('[fallback] applique le tarif direct par mode quand aucune route configurée', async () => {
    const r = await calculerPrixDevisDynamic({
      poidsReel: 75, longueur: 0, largeur: 0, hauteur: 0,
      modeTransport: 'AIR', priorite: 'STANDARD',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.tarifParUnite).toBe(3.0);           // 1.0 × 3.0
    expect(r.tarifsRouteUtilises).toBe(false);
    expect(r.coutBase).toBeCloseTo(225.0, 2);    // 75 × 3.0
  });

  /**
   * PRIORITÉ : TransportRate actif trouvé → tarifParUnite = ratePerKg de la route
   * mockTransportRate.ratePerKg = 7.25 €/kg
   * masseTaxable = 75 kg → coutBase = 75 × 7.25 = 543.75 €
   */
  it('[priorité] utilise ratePerKg du TransportRate quand la route est active', async () => {
    vi.mocked(getTransportRate).mockResolvedValueOnce(mockTransportRate);

    const r = await calculerPrixDevisDynamic({
      poidsReel: 75, longueur: 0, largeur: 0, hauteur: 0,
      modeTransport: 'AIR', priorite: 'STANDARD',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.tarifParUnite).toBe(7.25);
    expect(r.tarifsRouteUtilises).toBe(true);
    expect(r.coutBase).toBeCloseTo(543.75, 2);   // 75 × 7.25
  });

  /**
   * TransportRate présent mais isActive = false → tombe en fallback
   */
  it('[fallback] ignore un TransportRate dont isActive = false', async () => {
    vi.mocked(getTransportRate).mockResolvedValueOnce({
      ...mockTransportRate,
      isActive: false,
    });

    const r = await calculerPrixDevisDynamic({
      poidsReel: 75, longueur: 0, largeur: 0, hauteur: 0,
      modeTransport: 'AIR', priorite: 'STANDARD',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.tarifsRouteUtilises).toBe(false);
    expect(r.tarifParUnite).toBe(3.0);           // retombe sur transportMultipliers.AIR = 3.0
  });

  /**
   * SEA avec TransportRate : uniteMasseTaxable = UP → utilise ratePerM3
   * mockTransportRate.ratePerM3 = 1200 €/m³
   * masseTaxable = MAX(0.05t, 0.48m³) = 0.48 UP
   * coutBase = 0.48 × 1200 = 576 €
   */
  it('[SEA priorité] utilise ratePerM3 du TransportRate pour l\'unité UP', async () => {
    vi.mocked(getTransportRate).mockResolvedValueOnce({
      ...mockTransportRate,
      transportMode: 'SEA',
    });

    const r = await calculerPrixDevisDynamic({
      poidsReel: 50, ...DIMS_48,
      modeTransport: 'SEA', priorite: 'STANDARD',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.tarifParUnite).toBe(1200.0);        // ratePerM3
    expect(r.tarifsRouteUtilises).toBe(true);
    expect(r.coutBase).toBeCloseTo(576.0, 1);    // 0.48 × 1200
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Surcharges cargo et priorité
// ═════════════════════════════════════════════════════════════════════════════

describe('calculerPrixDevisDynamic — surcharges', () => {
  /**
   * FRAGILE = +30%
   * masseTaxable = 100 kg, tarifParUnite = 3.0 (fallback AIR)
   * coutBase = 100 × 3.0 = 300 €
   * surchargeCargo = 300 × 0.3 = 90 €
   * prixFinal (STANDARD, ×1.0) = 300 + 90 = 390 €
   */
  it('applique la surcharge FRAGILE (+30%) sur le coût de base', async () => {
    const r = await calculerPrixDevisDynamic({
      poidsReel: 100, longueur: 0, largeur: 0, hauteur: 0,
      modeTransport: 'AIR', priorite: 'STANDARD', typeMarchandise: 'FRAGILE',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.coefficientTypeMarchandise).toBe(0.3);
    expect(r.surchargeTypeMarchandise).toBeCloseTo(90.0, 2);
    expect(r.prixFinal).toBeCloseTo(390.0, 2);
  });

  /**
   * DANGEROUS = +50%
   * coutBase = 300 €, surchargeCargo = 300 × 0.5 = 150 €
   * prixFinal = 300 + 150 = 450 €
   */
  it('applique la surcharge DANGEROUS (+50%) sur le coût de base', async () => {
    const r = await calculerPrixDevisDynamic({
      poidsReel: 100, longueur: 0, largeur: 0, hauteur: 0,
      modeTransport: 'AIR', priorite: 'STANDARD', typeMarchandise: 'DANGEROUS',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.coefficientTypeMarchandise).toBe(0.5);
    expect(r.surchargeTypeMarchandise).toBeCloseTo(150.0, 2);
    expect(r.prixFinal).toBeCloseTo(450.0, 2);
  });

  /**
   * URGENT = coefficient ×1.3
   * coutBase = 300 € (GENERAL, aucune surcharge cargo)
   * surchargePriorite = 300 × 0.3 = 90 €
   * prixFinal = 300 × 1.3 = 390 €
   */
  it('applique le coefficient URGENT (×1.3) sur le prix avant priorité', async () => {
    const r = await calculerPrixDevisDynamic({
      poidsReel: 100, longueur: 0, largeur: 0, hauteur: 0,
      modeTransport: 'AIR', priorite: 'URGENT', typeMarchandise: 'GENERAL',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.coefficientPriorite).toBe(1.3);
    expect(r.surchargePriorite).toBeCloseTo(90.0, 2);
    expect(r.prixFinal).toBeCloseTo(390.0, 2);
  });

  /**
   * Combinaison FRAGILE + EXPRESS
   * coutBase = 300 €
   * surchargeCargo FRAGILE = 300 × 0.3 = 90 € → prix avant priorité = 390 €
   * coefficient EXPRESS = ×1.5 → prixFinal = 390 × 1.5 = 585 €
   */
  it('cumule surcharge FRAGILE et priorité EXPRESS (390 × 1.5 = 585 €)', async () => {
    const r = await calculerPrixDevisDynamic({
      poidsReel: 100, longueur: 0, largeur: 0, hauteur: 0,
      modeTransport: 'AIR', priorite: 'EXPRESS', typeMarchandise: 'FRAGILE',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.coefficientPriorite).toBe(1.5);
    expect(r.prixFinal).toBeCloseTo(585.0, 2);
  });

  /**
   * Poids = 0 → erreur attendue
   */
  it('lève une erreur si le poids réel est 0', async () => {
    await expect(
      calculerPrixDevisDynamic({
        poidsReel: 0, longueur: 0, largeur: 0, hauteur: 0,
        modeTransport: 'AIR', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      })
    ).rejects.toThrow('poids réel');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 5 — calculerPrixMultiPackages
// ═════════════════════════════════════════════════════════════════════════════

describe('calculerPrixMultiPackages', () => {
  /**
   * La surcharge priorité s'applique UNE SEULE FOIS sur le total global,
   * pas individuellement par colis.
   *
   * Colis 1 : 50 kg AIR GENERAL → unitPrice = 50 × 3.0 = 150 €
   * Colis 2 : 100 kg AIR GENERAL → unitPrice = 100 × 3.0 = 300 €
   * totalBeforePriority = 150 + 300 = 450 €
   * priorité URGENT (×1.3) → totalPrice = 450 × 1.3 = 585 €
   */
  it('applique la surcharge URGENT une seule fois sur le total (pas par colis)', async () => {
    const r = await calculerPrixMultiPackages({
      packages: [
        { quantity: 1, cargoType: 'GENERAL', weight: 50 },
        { quantity: 1, cargoType: 'GENERAL', weight: 100 },
      ],
      modeTransport: 'AIR', priorite: 'URGENT',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.totalBeforePriority).toBeCloseTo(450.0, 2);
    expect(r.totalPrice).toBeCloseTo(585.0, 2);  // 450 × 1.3
    expect(r.lines).toHaveLength(2);
  });

  /**
   * La quantité multiplie bien le prix unitaire.
   * 3 cartons GENERAL de 10 kg chacun (sans dims)
   * unitPrice = 10 × 3.0 = 30 €
   * lineTotal = 30 × 3 = 90 €
   */
  it('multiplie correctement le prix unitaire par la quantité', async () => {
    const r = await calculerPrixMultiPackages({
      packages: [{ quantity: 3, cargoType: 'GENERAL', weight: 10 }],
      modeTransport: 'AIR', priorite: 'STANDARD',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.lines[0].unitPrice).toBeCloseTo(30.0, 2);   // 10 × 3.0
    expect(r.lines[0].lineTotal).toBeCloseTo(90.0, 2);   // 30 × 3
    expect(r.totalPackageCount).toBe(3);
    expect(r.totalWeight).toBeCloseTo(30.0, 2);          // 10 × 3
  });

  /**
   * Le type de marchandise dominant est celui avec la plus grande quantité.
   * 2× GENERAL + 4× FRAGILE → dominant = FRAGILE
   */
  it('détermine correctement le type de marchandise dominant (quantité pondérée)', async () => {
    const r = await calculerPrixMultiPackages({
      packages: [
        { quantity: 2, cargoType: 'GENERAL', weight: 10 },
        { quantity: 4, cargoType: 'FRAGILE', weight: 5 },
      ],
      modeTransport: 'AIR', priorite: 'STANDARD',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.dominantCargoType).toBe('FRAGILE');
  });

  /**
   * Agrégation du poids total : weight × quantity pour chaque ligne
   * 3 cartons de 15 kg = 45 kg total
   */
  it('agrège correctement le poids total (weight × quantity)', async () => {
    const r = await calculerPrixMultiPackages({
      packages: [{ quantity: 3, cargoType: 'GENERAL', weight: 15 }],
      modeTransport: 'ROAD', priorite: 'STANDARD',
      paysOrigine: 'FR', paysDestination: 'BF',
    });

    expect(r.totalWeight).toBeCloseTo(45.0, 2);
    expect(r.totalPackageCount).toBe(3);
  });

  /**
   * Validation : une liste vide doit lever une erreur
   */
  it('lève une erreur si la liste de colis est vide', async () => {
    await expect(
      calculerPrixMultiPackages({
        packages: [],
        modeTransport: 'AIR', priorite: 'STANDARD',
        paysOrigine: 'FR', paysDestination: 'BF',
      })
    ).rejects.toThrow('Au moins un colis');
  });
});
