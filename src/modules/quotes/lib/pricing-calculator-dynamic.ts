/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Module de Calcul de Devis Fret (VERSION DYNAMIQUE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Version dynamique du calculateur de prix qui récupère les paramètres depuis
 * la base de données au lieu d'utiliser des constantes hardcodées.
 *
 * @module modules/quotes/lib/pricing-calculator-dynamic
 * @version 2.0.0
 * @author Faso Fret Logistics
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONFORMITÉ AUX NORMES INTERNATIONALES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ce module implémente les standards de l'industrie du fret :
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  Mode       │  Ratio        │  Norme              │  Signification         │
 * ├─────────────┼───────────────┼─────────────────────┼────────────────────────┤
 * │  AIR        │  167 kg/m³    │  IATA (1:6000)      │  1 m³ = 167 kg         │
 * │  ROAD       │  333 kg/m³    │  Standard (1:3000)  │  1 m³ = 333 kg         │
 * │  SEA        │  W/M          │  Unité Payante      │  MAX(tonnes, m³)       │
 * │  RAIL       │  250 kg/m³    │  Variable           │  1 m³ = 250 kg         │
 * └─────────────┴───────────────┴─────────────────────┴────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALGORITHME DE CALCUL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ÉTAPE 1 : Calcul du Volume
 * ─────────────────────────────
 * Volume_m³ = (Longueur_cm × Largeur_cm × Hauteur_cm) / 1.000.000
 *
 * ÉTAPE 2 : Poids Volumétrique (selon mode)
 * ─────────────────────────────────────────────
 * │ AIR   │ PV = Volume_m³ × 167 kg/m³      │ Ratio IATA 1:6000
 * │ ROAD  │ PV = Volume_m³ × 333 kg/m³      │ Ratio standard 1:3000
 * │ SEA   │ UP = MAX(Poids_tonnes, Volume)  │ Unité Payante (W/M)
 * │ RAIL  │ PV = Volume_m³ × 250 kg/m³      │ Estimation ferroviaire
 *
 * ÉTAPE 3 : Masse Taxable (Chargeable Weight)
 * ────────────────────────────────────────────────
 * │ AIR/ROAD/RAIL │ MT = MAX(Poids_réel, Poids_volumétrique)
 * │ SEA           │ MT = MAX(Poids_tonnes, Volume_m³) = Unité Payante
 *
 * ÉTAPE 4 : Tarif Applicable
 * ───────────────────────────────
 * 1. Rechercher dans TransportRate (BDD) pour la route spécifique
 * 2. Si non trouvé → utiliser tarif par défaut × multiplicateur mode
 *
 * ÉTAPE 5 : Coût de Base
 * ──────────────────────────
 * Coût_Base = Masse_Taxable × Tarif_par_unité
 *
 * ÉTAPE 6 : Surcharge Type de Marchandise
 * ──────────────────────────────────────────────
 * │ GENERAL     │  0%  │ Pas de surcharge
 * │ DANGEROUS   │ +50% │ Matières dangereuses (ADR/IMDG)
 * │ PERISHABLE  │ +40% │ Denrées périssables (chaîne du froid)
 * │ FRAGILE     │ +30% │ Manipulation spéciale requise
 * │ BULK        │ -10% │ Vrac (économies d'échelle)
 * │ CONTAINER   │ +20% │ Conteneur standardisé
 * │ PALLETIZED  │ +15% │ Palettisé
 *
 * Surcharge_Cargo = Coût_Base × Coefficient_Cargo
 *
 * ÉTAPE 7 : Surcharge Priorité
 * ─────────────────────────────────
 * │ STANDARD │ ×1.0  │  0% │ Délai normal
 * │ NORMAL   │ ×1.1  │ +10%│ Légèrement accéléré
 * │ EXPRESS  │ ×1.5  │ +50%│ Rapide
 * │ URGENT   │ ×1.3  │ +30%│ Prioritaire
 *
 * ÉTAPE 8 : Prix Final
 * ─────────────────────────
 * Prix_Final = (Coût_Base + Surcharge_Cargo) × Coefficient_Priorité
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXEMPLE DE CALCUL COMPLET
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Données d'entrée :
 * - Poids réel : 50 kg
 * - Dimensions : 100 × 80 × 60 cm
 * - Mode : AIR
 * - Route : FR → BF
 * - Type marchandise : FRAGILE
 * - Priorité : URGENT
 *
 * Calcul :
 * 1. Volume = (100 × 80 × 60) / 1.000.000 = 0.48 m³
 * 2. Poids volumétrique = 0.48 × 167 = 80.16 kg
 * 3. Masse taxable = MAX(50, 80.16) = 80.16 kg (facturation au volume)
 * 4. Tarif FR→BF AIR = 7.25 €/kg
 * 5. Coût base = 80.16 × 7.25 = 581.16 €
 * 6. Surcharge FRAGILE (+30%) = 581.16 × 0.30 = 174.35 €
 * 7. Prix avant priorité = 581.16 + 174.35 = 755.51 €
 * 8. Surcharge URGENT (×1.3) = 755.51 × 1.3 = 982.16 €
 *
 * Prix final : 982.16 €
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOURCES DE DONNÉES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ┌────────────────────┬────────────────────────────────────────────────────────┐
 * │  Paramètre         │  Source                                                │
 * ├────────────────────┼────────────────────────────────────────────────────────┤
 * │  Ratios volum.     │  PricingConfig.volumetricWeightRatios (BDD)            │
 * │  Tarifs routes     │  TransportRate (BDD) pour chaque origine→destination   │
 * │  Tarifs défaut     │  PricingConfig.defaultRatePerKg / defaultRatePerM3     │
 * │  Surcharges cargo  │  PricingConfig.cargoTypeSurcharges (BDD)               │
 * │  Surcharges prio.  │  PricingConfig.prioritySurcharges (BDD)                │
 * │  Activation PV     │  PricingConfig.useVolumetricWeightPerMode (BDD)        │
 * └────────────────────┴────────────────────────────────────────────────────────┘
 *
 * Note : Toutes les configurations sont cachées pendant 1 heure (unstable_cache)
 * pour optimiser les performances.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DIFFÉRENCES AVEC LA VERSION STATIQUE (pricing-calculator.ts)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * │ Aspect                 │ Statique          │ Dynamique                      │
 * ├────────────────────────┼───────────────────┼────────────────────────────────┤
 * │ Tarifs                 │ Hardcodés         │ BDD (TransportRate)            │
 * │ Ratios volumétriques   │ Constantes        │ BDD (PricingConfig)            │
 * │ Surcharges cargo       │ Non implémenté    │ BDD (PricingConfig)            │
 * │ Surcharges priorité    │ Constantes        │ BDD (PricingConfig)            │
 * │ Niveaux priorité       │ 3 (STD/NORM/URG)  │ 4 (STD/NORM/EXP/URG)           │
 * │ Performance            │ Immédiat          │ Async (cache 1h)               │
 * │ Modifiable par admin   │ Non               │ Oui (via dashboard)            │
 *
 * @see pricing-calculator.ts pour la version statique avec valeurs hardcodées
 * @see /modules/pricing-config pour la gestion de la configuration
 * @see /modules/transport-rates pour la gestion des tarifs par route
 */

import { TransportMode } from '@/lib/db/enums';
import { getPricingConfig } from '@/modules/pricing-config';
import { getTransportRate } from '@/modules/transport-rates';

/**
 * Type de priorité pour le calcul de devis
 *
 * - STANDARD : Livraison normale (coefficient configuré, défaut: 0)
 * - NORMAL   : Livraison accélérée (coefficient configuré, défaut: +10%)
 * - EXPRESS  : Livraison rapide (coefficient configuré, défaut: +50%)
 * - URGENT   : Livraison express (coefficient configuré, défaut: +30%)
 */
export type PriorityType = 'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT';

/**
 * Types de marchandise supportés pour les surcharges
 *
 * Les surcharges sont configurées dans PricingConfig.cargoTypeSurcharges
 * et appliquées au coût de base avant la priorité.
 *
 * @example
 * - GENERAL : 0% (pas de surcharge)
 * - DANGEROUS : +50% (matières dangereuses, ADR)
 * - PERISHABLE : +40% (denrées périssables, chaîne du froid)
 * - FRAGILE : +30% (manipulation spéciale requise)
 */
export type CargoTypeForPricing =
  | 'GENERAL'
  | 'DANGEROUS'
  | 'PERISHABLE'
  | 'FRAGILE'
  | 'BULK'
  | 'CONTAINER'
  | 'PALLETIZED'
  | 'OTHER';

/**
 * Entrées pour le calcul de devis
 *
 * Toutes les mesures doivent être fournies dans les unités suivantes :
 * - Poids : kilogrammes (kg)
 * - Dimensions : centimètres (cm)
 *
 * @example
 * ```typescript
 * const input: QuotePricingInputDynamic = {
 *   poidsReel: 500,          // 500 kg
 *   longueur: 120,           // 120 cm
 *   largeur: 80,             // 80 cm (palette EUR)
 *   hauteur: 100,            // 100 cm
 *   modeTransport: 'AIR',
 *   priorite: 'URGENT',
 *   typeMarchandise: 'FRAGILE',
 *   paysOrigine: 'FR',
 *   paysDestination: 'BF',
 * };
 * ```
 */
export interface QuotePricingInputDynamic {
  /** Poids réel de la marchandise en kilogrammes (kg) */
  poidsReel: number;

  /** Longueur en centimètres (cm) */
  longueur: number;

  /** Largeur en centimètres (cm) */
  largeur: number;

  /** Hauteur en centimètres (cm) */
  hauteur: number;

  /** Mode de transport principal */
  modeTransport: TransportMode;

  /** Priorité de livraison (défaut: STANDARD) */
  priorite?: PriorityType;

  /**
   * Type de marchandise pour calcul de la surcharge
   * Si non fourni, aucune surcharge n'est appliquée (équivalent à GENERAL)
   */
  typeMarchandise?: CargoTypeForPricing;

  /** Code pays d'origine (ISO 2 lettres, ex: FR, BF, CI) */
  paysOrigine: string;

  /** Code pays de destination (ISO 2 lettres, ex: FR, BF, CI) */
  paysDestination: string;
}

/**
 * Résultat détaillé du calcul de devis
 *
 * Contient tous les détails du calcul pour transparence et debugging.
 *
 * === Formule de calcul ===
 * 1. Coût Base = Masse Taxable × Tarif
 * 2. Surcharge Cargo = Coût Base × Coefficient Cargo (ex: +50% pour DANGEROUS)
 * 3. Prix Avant Priorité = Coût Base + Surcharge Cargo
 * 4. Prix Final = Prix Avant Priorité × Coefficient Priorité (ex: ×1.3 pour URGENT)
 *
 * @example
 * // Résultat pour 500kg de marchandise FRAGILE en AIR, priorité URGENT
 * {
 *   coutBase: 1000,           // 500 kg × 2 €/kg
 *   surchargeTypeMarchandise: 300,  // +30% FRAGILE
 *   coefficientPriorite: 1.3, // +30% URGENT
 *   prixFinal: 1690,          // (1000 + 300) × 1.3
 * }
 */
export interface QuotePricingResultDynamic {
  /** Volume calculé en mètres cubes (m³) */
  volume_m3: number;

  /** Poids volumétrique calculé en kg (selon le mode de transport) */
  poidsVolumetrique_kg: number;

  /** Masse taxable utilisée pour la facturation (MAX entre poids réel et volumétrique) */
  masseTaxable: number;

  /** Unité de mesure de la masse taxable ("kg" pour aérien/routier, "UP" pour maritime) */
  uniteMasseTaxable: 'kg' | 'UP' | 'tonne';

  /** Tarif par unité appliqué (€/kg, €/m³, ou €/tonne selon le mode) */
  tarifParUnite: number;

  /** Coût de base AVANT application des surcharges (Masse Taxable × Tarif) */
  coutBase: number;

  /**
   * Type de marchandise utilisé pour la surcharge
   * Correspond à CargoTypeForPricing ou null si non spécifié
   */
  typeMarchandise: CargoTypeForPricing | null;

  /**
   * Coefficient de surcharge pour le type de marchandise (ex: 0.3 = +30%)
   * 0 si GENERAL ou non spécifié
   */
  coefficientTypeMarchandise: number;

  /**
   * Montant de la surcharge type de marchandise en devise
   * = coutBase × coefficientTypeMarchandise
   */
  surchargeTypeMarchandise: number;

  /** Coefficient multiplicateur de priorité (ex: 1.0, 1.1, 1.3) */
  coefficientPriorite: number;

  /**
   * Montant de la surcharge priorité en devise
   * = (coutBase + surchargeTypeMarchandise) × (coefficientPriorite - 1)
   */
  surchargePriorite: number;

  /** Prix final APRÈS application de toutes les surcharges */
  prixFinal: number;

  /** Devise du prix (toujours EUR pour l'instant) */
  devise: string;

  /** Détails de la route utilisée pour le calcul */
  route: {
    origine: string;
    destination: string;
    axe: string; // ex: "FR → CI"
  };

  /** Mode de transport utilisé */
  modeTransport: TransportMode;

  /** Priorité appliquée */
  priorite: PriorityType;

  /** Indicateur si le poids volumétrique a été utilisé au lieu du poids réel */
  factureSurVolume: boolean;

  /** Indicateur si le tarif utilisé provient de la matrice de routes (true) ou des valeurs par défaut (false) */
  tarifsRouteUtilises: boolean;
}

/**
 * === ÉTAPE 1 : Calcul du Volume ===
 *
 * Convertit les dimensions (en cm) en volume (en m³)
 *
 * Formule : Volume_m3 = (Longueur × Largeur × Hauteur) / 1.000.000
 *
 * @param longueur - Longueur en centimètres (cm)
 * @param largeur - Largeur en centimètres (cm)
 * @param hauteur - Hauteur en centimètres (cm)
 * @returns Volume en mètres cubes (m³)
 *
 * @throws {Error} Si une dimension est négative ou nulle
 */
export function calculerVolume(
  longueur: number,
  largeur: number,
  hauteur: number
): number {
  // Validation : dimensions doivent être positives
  if (longueur <= 0 || largeur <= 0 || hauteur <= 0) {
    throw new Error('Dimensions nulles : Toutes les dimensions doivent être strictement positives');
  }

  // Conversion cm³ → m³ : diviser par 1.000.000
  const volume_m3 = (longueur * largeur * hauteur) / 1_000_000;

  return volume_m3;
}

/**
 * === FONCTION PRINCIPALE : Calculer le Prix d'un Devis (VERSION DYNAMIQUE) ===
 *
 * Orchestre toutes les étapes du calcul de prix en utilisant les données de configuration BDD
 *
 * Étapes :
 * 1. Récupérer la configuration globale (PricingConfig)
 * 2. Calculer le volume (m³)
 * 3. Calculer le poids volumétrique (selon config)
 * 4. Déterminer la masse taxable
 * 5. Récupérer le tarif (TransportRate ou défaut)
 * 6. Calculer le coût de base
 * 7. Appliquer le coefficient de priorité (selon config)
 * 8. Calculer le prix final
 *
 * @param input - Paramètres du devis (poids, dimensions, route, mode, priorité)
 * @returns Résultat détaillé du calcul avec tous les intermédiaires
 *
 * @throws {Error} Si les données d'entrée sont invalides
 *
 * @example
 * ```typescript
 * const resultat = await calculerPrixDevisDynamic({
 *   poidsReel: 5,          // 5 kg
 *   longueur: 50,          // 50 cm
 *   largeur: 40,           // 40 cm
 *   hauteur: 30,           // 30 cm
 *   modeTransport: 'AIR',
 *   priorite: 'STANDARD',
 *   paysOrigine: 'FR',
 *   paysDestination: 'CI',
 * });
 * ```
 */
export async function calculerPrixDevisDynamic(
  input: QuotePricingInputDynamic
): Promise<QuotePricingResultDynamic> {
  // Validation des entrées
  if (input.poidsReel <= 0) {
    throw new Error('Le poids réel doit être strictement positif');
  }

  // Définir la priorité par défaut si non fournie
  const priorite = input.priorite || 'STANDARD';

  // === ÉTAPE 1 : Récupérer la configuration globale ===
  const config = await getPricingConfig();

  // === ÉTAPE 2 : Calcul du Volume (optionnel) ===
  // Si toutes les dimensions sont fournies (> 0), calculer le volume
  // Sinon, considérer le volume comme 0 (dimensions non renseignées)
  let volume_m3 = 0;
  if (input.longueur > 0 && input.largeur > 0 && input.hauteur > 0) {
    volume_m3 = calculerVolume(input.longueur, input.largeur, input.hauteur);
  }

  // === ÉTAPE 3 : Calcul du Poids Volumétrique (si activé pour ce mode) ===
  const useVolumetric = config.useVolumetricWeightPerMode[input.modeTransport];
  const volumetricRatio = config.volumetricWeightRatios[input.modeTransport];
  // Si volume = 0 (dimensions non fournies), le poids volumétrique sera aussi 0
  const poidsVolumetrique_kg = useVolumetric && volume_m3 > 0 ? volume_m3 * volumetricRatio : 0;

  // === ÉTAPE 4 : Détermination de la Masse Taxable ===
  let masseTaxable: number;
  let uniteMasseTaxable: 'kg' | 'UP' | 'tonne';
  let factureSurVolume: boolean;

  if (input.modeTransport === 'SEA') {
    // Cas spécial Maritime : Unité Payante (UP) = MAX(Poids en tonnes, Volume en m³)
    const poidsTonnes = input.poidsReel / 1000;
    masseTaxable = Math.max(poidsTonnes, volume_m3);
    uniteMasseTaxable = 'UP';
    factureSurVolume = volume_m3 > poidsTonnes;
  } else if (useVolumetric) {
    // Cas Aérien, Routier, Rail (avec poids volumétrique activé)
    masseTaxable = Math.max(input.poidsReel, poidsVolumetrique_kg);
    uniteMasseTaxable = 'kg';
    factureSurVolume = poidsVolumetrique_kg > input.poidsReel;
  } else {
    // Poids volumétrique désactivé : utiliser uniquement le poids réel
    masseTaxable = input.poidsReel;
    uniteMasseTaxable = 'kg';
    factureSurVolume = false;
  }

  // === ÉTAPE 5 : Récupération du Tarif ===
  // Normaliser les codes pays en majuscules
  const origineNorm = input.paysOrigine.toUpperCase();
  const destinationNorm = input.paysDestination.toUpperCase();

  // Chercher le tarif spécifique pour cette route
  const transportRate = await getTransportRate(
    origineNorm,
    destinationNorm,
    input.modeTransport
  );

  let tarifParUnite: number;
  let tarifsRouteUtilises: boolean;

  if (transportRate && transportRate.isActive) {
    // ROUTE CONFIGURÉE : Utiliser le tarif spécifique
    // Pour le maritime (unité = UP/m³), utiliser ratePerM3
    // Pour les autres modes (unité = kg), utiliser ratePerKg
    // CORRECTION BUG : Ne PAS utiliser ratePerM3 pour le poids volumétrique aérien/routier !
    // Le poids volumétrique est en KG, donc on utilise le tarif par KG
    if (uniteMasseTaxable === 'UP') {
      tarifParUnite = transportRate.ratePerM3;
    } else {
      tarifParUnite = transportRate.ratePerKg;
    }
    tarifsRouteUtilises = true;
  } else {
    // ROUTE NON CONFIGURÉE : Utiliser les tarifs par défaut avec multiplicateur
    const transportMultiplier = config.transportMultipliers[input.modeTransport] || 1.0;

    // CORRECTION BUG : Utiliser ratePerM3 UNIQUEMENT pour le maritime (UP)
    if (uniteMasseTaxable === 'UP') {
      tarifParUnite = config.defaultRatePerM3 * transportMultiplier;
    } else {
      tarifParUnite = config.defaultRatePerKg * transportMultiplier;
    }
    tarifsRouteUtilises = false;

    console.warn(
      `[calculerPrixDevisDynamic] Aucun tarif trouvé pour ${origineNorm} → ${destinationNorm} (${input.modeTransport}). ` +
      `Utilisation du tarif par défaut : ${tarifParUnite} EUR`
    );
  }

  // === ÉTAPE 6 : Calcul du Coût de Base ===
  // Coût_Base = Masse_Taxable × Tarif_Par_Unité
  const coutBase = masseTaxable * tarifParUnite;

  // === ÉTAPE 7 : Application de la Surcharge Type de Marchandise ===
  // Récupérer le coefficient de surcharge pour le type de marchandise depuis la config
  // Si non spécifié ou GENERAL, le coefficient est 0 (pas de surcharge)
  const typeMarchandise = input.typeMarchandise || null;
  const coefficientTypeMarchandise = typeMarchandise
    ? (config.cargoTypeSurcharges[typeMarchandise] || 0)
    : 0;

  // Calculer le montant de la surcharge type de marchandise
  // Surcharge = Coût_Base × Coefficient (ex: 1000 × 0.3 = 300€ pour FRAGILE +30%)
  const surchargeTypeMarchandise = coutBase * coefficientTypeMarchandise;

  // Prix après surcharge marchandise (avant priorité)
  const prixApresCargoSurcharge = coutBase + surchargeTypeMarchandise;

  // === ÉTAPE 8 : Application du Coefficient de Priorité ===
  // Récupérer le coefficient de priorité depuis la config
  const prioritySurchargeCoef = config.prioritySurcharges[priorite] || 0;
  const coefficientPriorite = 1 + prioritySurchargeCoef; // ex: 0.1 → 1.1 (coefficient multiplicateur)

  // Calculer le montant de la surcharge priorité
  // Surcharge Priorité = Prix_Après_Cargo × (Coefficient - 1)
  // Exemple : 1300 × 0.3 = 390€ pour URGENT +30%
  const surchargePriorite = prixApresCargoSurcharge * prioritySurchargeCoef;

  // === ÉTAPE 9 : Calcul du Prix Final ===
  // Prix_Final = (Coût_Base + Surcharge_Cargo) × Coefficient_Priorité
  // ou de façon équivalente : Prix_Final = Coût_Base + Surcharge_Cargo + Surcharge_Priorité
  const prixFinal = prixApresCargoSurcharge * coefficientPriorite;

  // === ÉTAPE 10 : Construction du Résultat ===
  return {
    volume_m3: Math.round(volume_m3 * 1000) / 1000, // Arrondir à 3 décimales
    poidsVolumetrique_kg: Math.round(poidsVolumetrique_kg * 100) / 100, // Arrondir à 2 décimales
    masseTaxable: Math.round(masseTaxable * 100) / 100,
    uniteMasseTaxable,
    tarifParUnite,
    coutBase: Math.round(coutBase * 100) / 100,
    typeMarchandise,
    coefficientTypeMarchandise,
    surchargeTypeMarchandise: Math.round(surchargeTypeMarchandise * 100) / 100,
    coefficientPriorite,
    surchargePriorite: Math.round(surchargePriorite * 100) / 100,
    prixFinal: Math.round(prixFinal * 100) / 100,
    devise: 'EUR',
    route: {
      origine: origineNorm,
      destination: destinationNorm,
      axe: `${origineNorm} → ${destinationNorm}`,
    },
    modeTransport: input.modeTransport,
    priorite,
    factureSurVolume,
    tarifsRouteUtilises,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCUL MULTI-PACKAGES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Entrée pour un colis individuel dans le calcul multi-packages
 *
 * Chaque colis a ses propres caractéristiques (type, poids, dimensions)
 * et une quantité pour les colis identiques regroupés sur une même ligne.
 *
 * @example
 * // 3 cartons GENERAL de 15 kg, 60×40×40 cm
 * {
 *   description: "Cartons vêtements",
 *   quantity: 3,
 *   cargoType: "GENERAL",
 *   weight: 15,       // poids UNITAIRE
 *   length: 60,
 *   width: 40,
 *   height: 40,
 * }
 */
export interface PackageInput {
  /** Description libre du colis (optionnel) */
  description?: string;

  /** Nombre de colis identiques dans cette ligne (défaut: 1) */
  quantity: number;

  /** Type de marchandise spécifique à ce colis */
  cargoType: CargoTypeForPricing;

  /** Poids UNITAIRE en kg */
  weight: number;

  /** Longueur unitaire en cm (optionnel) */
  length?: number;

  /** Largeur unitaire en cm (optionnel) */
  width?: number;

  /** Hauteur unitaire en cm (optionnel) */
  height?: number;
}

/**
 * Entrées pour le calcul multi-packages
 *
 * Contient la liste des colis + les paramètres globaux du devis
 * (route, mode de transport, priorité).
 */
export interface MultiPackageInput {
  /** Liste des colis à calculer (min 1, max 50) */
  packages: PackageInput[];

  /** Mode de transport principal */
  modeTransport: TransportMode;

  /** Priorité de livraison (défaut: STANDARD) */
  priorite?: PriorityType;

  /** Code pays d'origine (ISO 2 lettres, ex: FR, BF) */
  paysOrigine: string;

  /** Code pays de destination (ISO 2 lettres, ex: FR, BF) */
  paysDestination: string;
}

/**
 * Résultat du calcul pour UN colis (une ligne)
 *
 * Contient le prix unitaire calculé via calculerPrixDevisDynamic()
 * ainsi que le total de la ligne (unitPrice × quantity).
 */
export interface PackageLineResult {
  /** Description du colis (si fournie) */
  description?: string;

  /** Quantité de colis identiques */
  quantity: number;

  /** Type de marchandise */
  cargoType: CargoTypeForPricing;

  /** Poids unitaire en kg */
  weight: number;

  /** Prix unitaire calculé (pour 1 colis de cette ligne) */
  unitPrice: number;

  /** Total de la ligne = unitPrice × quantity */
  lineTotal: number;

  /** Résultat détaillé du calcul unitaire (volume, masse taxable, etc.) */
  detail: QuotePricingResultDynamic;
}

/**
 * Résultat global du calcul multi-packages
 *
 * Contient le détail par ligne + les agrégats globaux
 * (poids total, nombre total de colis, prix total).
 */
export interface MultiPackageResult {
  /** Détail du calcul pour chaque ligne de colis */
  lines: PackageLineResult[];

  /** Nombre total de colis (somme des quantités) */
  totalPackageCount: number;

  /** Poids total en kg (somme de weight × quantity pour chaque ligne) */
  totalWeight: number;

  /** Prix total AVANT surcharge priorité (somme des lineTotal après surcharge cargo) */
  totalBeforePriority: number;

  /** Prix total FINAL après toutes les surcharges */
  totalPrice: number;

  /** Devise (EUR) */
  devise: string;

  /** Route utilisée */
  route: {
    origine: string;
    destination: string;
    axe: string;
  };

  /** Mode de transport */
  modeTransport: TransportMode;

  /** Priorité appliquée */
  priorite: PriorityType;

  /** Type de marchandise dominant (le plus fréquent parmi les colis) */
  dominantCargoType: CargoTypeForPricing;
}

/**
 * === FONCTION PRINCIPALE : Calculer le prix pour PLUSIEURS colis ===
 *
 * Orchestre le calcul de prix pour un devis multi-colis :
 * 1. Itère sur chaque ligne de colis
 * 2. Calcule le prix UNITAIRE via calculerPrixDevisDynamic() (inclut surcharge cargo)
 * 3. Multiplie par la quantité pour obtenir le total de la ligne
 * 4. Somme tous les totaux de ligne pour le prix global
 *
 * NOTE IMPORTANTE sur la priorité :
 * La surcharge priorité est appliquée UNE SEULE FOIS sur le total global,
 * pas individuellement par colis. Chaque appel à calculerPrixDevisDynamic()
 * utilise priorite='STANDARD' pour calculer le prix unitaire (sans surcharge priorité),
 * puis la priorité est appliquée au total final.
 *
 * @param input - Liste des colis + paramètres globaux (route, mode, priorité)
 * @returns Résultat détaillé avec prix par ligne et totaux globaux
 *
 * @example
 * ```typescript
 * const result = await calculerPrixMultiPackages({
 *   packages: [
 *     { quantity: 1, cargoType: 'FRAGILE', weight: 2, length: 30, width: 20, height: 5, description: 'Tablette' },
 *     { quantity: 3, cargoType: 'GENERAL', weight: 15, length: 60, width: 40, height: 40, description: 'Cartons' },
 *   ],
 *   modeTransport: 'AIR',
 *   priorite: 'URGENT',
 *   paysOrigine: 'FR',
 *   paysDestination: 'BF',
 * });
 *
 * // result.lines[0].unitPrice = prix pour 1 tablette (FRAGILE, 2kg)
 * // result.lines[0].lineTotal = unitPrice × 1
 * // result.lines[1].unitPrice = prix pour 1 carton (GENERAL, 15kg)
 * // result.lines[1].lineTotal = unitPrice × 3
 * // result.totalPrice = somme des lineTotal × coefficient priorité URGENT
 * ```
 */
export async function calculerPrixMultiPackages(
  input: MultiPackageInput
): Promise<MultiPackageResult> {
  // Validation : au moins un colis requis
  if (!input.packages || input.packages.length === 0) {
    throw new Error('Au moins un colis est requis pour le calcul');
  }

  const priorite = input.priorite || 'STANDARD';
  const lines: PackageLineResult[] = [];
  let totalBeforePriority = 0;
  let totalWeight = 0;
  let totalPackageCount = 0;

  // Compteur pour déterminer le type de marchandise dominant
  const cargoTypeCounts: Record<string, number> = {};

  // === Calcul ligne par ligne ===
  for (const pkg of input.packages) {
    // Calculer le prix UNITAIRE (1 colis) avec priorité STANDARD
    // La surcharge priorité sera appliquée au total global, pas par colis
    const detail = await calculerPrixDevisDynamic({
      poidsReel: pkg.weight,
      longueur: pkg.length || 0,
      largeur: pkg.width || 0,
      hauteur: pkg.height || 0,
      modeTransport: input.modeTransport,
      priorite: 'STANDARD', // Pas de surcharge priorité par colis
      typeMarchandise: pkg.cargoType,
      paysOrigine: input.paysOrigine,
      paysDestination: input.paysDestination,
    });

    // Le prix unitaire inclut la surcharge cargo mais PAS la surcharge priorité
    const unitPrice = detail.prixFinal;

    // Total de la ligne = prix unitaire × quantité
    const lineTotal = unitPrice * pkg.quantity;

    lines.push({
      description: pkg.description,
      quantity: pkg.quantity,
      cargoType: pkg.cargoType,
      weight: pkg.weight,
      unitPrice: Math.round(unitPrice * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100,
      detail,
    });

    // Accumuler les totaux
    totalBeforePriority += lineTotal;
    totalWeight += pkg.weight * pkg.quantity;
    totalPackageCount += pkg.quantity;

    // Compter les types de marchandise (pondéré par quantité)
    const key = pkg.cargoType;
    cargoTypeCounts[key] = (cargoTypeCounts[key] || 0) + pkg.quantity;
  }

  // === Application de la surcharge priorité sur le total global ===
  // Récupérer le coefficient de priorité depuis la config (via le premier résultat)
  // Note : on fait un appel "dummy" pour récupérer le coefficient si priorité != STANDARD
  let coefficientPriorite = 1;
  if (priorite !== 'STANDARD' && lines.length > 0) {
    // Calculer avec la priorité demandée pour récupérer le coefficient
    const refResult = await calculerPrixDevisDynamic({
      poidsReel: lines[0].weight,
      longueur: 0,
      largeur: 0,
      hauteur: 0,
      modeTransport: input.modeTransport,
      priorite: priorite,
      typeMarchandise: 'GENERAL',
      paysOrigine: input.paysOrigine,
      paysDestination: input.paysDestination,
    });
    coefficientPriorite = refResult.coefficientPriorite;
  }

  // Prix total = somme des lignes × coefficient priorité
  const totalPrice = totalBeforePriority * coefficientPriorite;

  // Déterminer le type de marchandise dominant (le plus fréquent)
  const dominantCargoType = (Object.entries(cargoTypeCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'GENERAL') as CargoTypeForPricing;

  // Normaliser les codes pays
  const origineNorm = input.paysOrigine.toUpperCase();
  const destinationNorm = input.paysDestination.toUpperCase();

  return {
    lines,
    totalPackageCount,
    totalWeight: Math.round(totalWeight * 100) / 100,
    totalBeforePriority: Math.round(totalBeforePriority * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    devise: 'EUR',
    route: {
      origine: origineNorm,
      destination: destinationNorm,
      axe: `${origineNorm} → ${destinationNorm}`,
    },
    modeTransport: input.modeTransport,
    priorite,
    dominantCargoType,
  };
}

/**
 * === FONCTION UTILITAIRE : Formater le Résultat pour Affichage ===
 *
 * Convertit le résultat du calcul en un objet facile à afficher dans l'interface
 *
 * @param result - Résultat du calcul de prix
 * @returns Objet formaté pour l'affichage
 */
export function formaterResultatDevisDynamic(result: QuotePricingResultDynamic): {
  prixTotal: string;
  details: string[];
  alertes: string[];
} {
  // Labels français pour les types de marchandise
  const cargoTypeLabels: Record<string, string> = {
    GENERAL: 'Générale',
    DANGEROUS: 'Dangereuse',
    PERISHABLE: 'Périssable',
    FRAGILE: 'Fragile',
    BULK: 'Vrac',
    CONTAINER: 'Conteneur',
    PALLETIZED: 'Palettisée',
    OTHER: 'Autre',
  };

  const details = [
    `Route : ${result.route.axe}`,
    `Volume : ${result.volume_m3} m³`,
    `Poids volumétrique : ${result.poidsVolumetrique_kg} ${result.uniteMasseTaxable}`,
    `Masse taxable : ${result.masseTaxable} ${result.uniteMasseTaxable}`,
    `Tarif : ${result.tarifParUnite} EUR/${result.uniteMasseTaxable}`,
    `Coût de base : ${result.coutBase} EUR`,
    // Afficher la surcharge type de marchandise si applicable
    result.surchargeTypeMarchandise > 0 && result.typeMarchandise
      ? `Supplément ${cargoTypeLabels[result.typeMarchandise] || result.typeMarchandise} (+${Math.round(result.coefficientTypeMarchandise * 100)}%) : +${result.surchargeTypeMarchandise} EUR`
      : null,
    // Afficher la surcharge priorité si applicable
    result.coefficientPriorite !== 1
      ? `Supplément priorité ${result.priorite} (+${Math.round((result.coefficientPriorite - 1) * 100)}%) : +${result.surchargePriorite} EUR`
      : null,
  ].filter(Boolean) as string[];

  const alertes: string[] = [];

  if (result.factureSurVolume) {
    alertes.push(
      '⚠️ Facturation au volume : Votre colis est léger et encombrant. ' +
      'Le poids volumétrique est utilisé pour le calcul.'
    );
  }

  if (result.uniteMasseTaxable === 'UP') {
    alertes.push(
      'ℹ️ Maritime : Le prix est calculé en Unités Payantes (UP). ' +
      '1 UP = MAX(1 tonne, 1 m³)'
    );
  }

  if (!result.tarifsRouteUtilises) {
    alertes.push(
      '⚠️ Tarif estimatif : Cette route n\'est pas configurée. ' +
      'Le tarif utilisé est une estimation basée sur les valeurs par défaut.'
    );
  }

  // Alerte pour marchandise spéciale
  if (result.typeMarchandise === 'DANGEROUS') {
    alertes.push(
      '⚠️ Matières dangereuses : Transport soumis à réglementation ADR/IMDG. ' +
      'Documents spéciaux requis.'
    );
  } else if (result.typeMarchandise === 'PERISHABLE') {
    alertes.push(
      '🧊 Périssable : Transport en température contrôlée. ' +
      'Chaîne du froid garantie.'
    );
  }

  return {
    prixTotal: `${result.prixFinal.toFixed(2)} ${result.devise}`,
    details,
    alertes,
  };
}
