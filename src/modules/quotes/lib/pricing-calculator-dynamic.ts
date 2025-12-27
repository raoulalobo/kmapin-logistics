/**
 * Module de Calcul de Devis Fret (VERSION DYNAMIQUE)
 *
 * Version dynamique qui récupère les paramètres depuis la base de données
 * au lieu d'utiliser des constantes hardcodées.
 *
 * @module modules/quotes/lib/pricing-calculator-dynamic
 *
 * === Différences avec la version statique ===
 *
 * - Récupère les ratios volumétriques depuis PricingConfig (BDD)
 * - Récupère les tarifs depuis TransportRate (BDD)
 * - Récupère les surcharges de priorité depuis PricingConfig (BDD)
 * - Supporte l'activation/désactivation du poids volumétrique par mode
 *
 * === Règles Métier (identiques) ===
 *
 * 1. Calcul du Poids Volumétrique (PV) :
 *    - Aérien  : Volume (m³) × ratio_config (défaut: 167 kg)
 *    - Routier : Volume (m³) × ratio_config (défaut: 333 kg)
 *    - Maritime: MAX(Poids/1000, Volume) → Unité Payante (UP)
 *
 * 2. Masse Taxable :
 *    - Si poids volumétrique activé : MAX(Poids Réel, Poids Volumétrique)
 *    - Si désactivé (ex: Maritime) : Utiliser le système spécifique (UP)
 *
 * 3. Coût de Base :
 *    - Chercher tarif dans TransportRate pour la route
 *    - Sinon, utiliser les tarifs par défaut de PricingConfig
 *
 * 4. Prix Final (avec Priorité) :
 *    - Récupérer le coefficient de priorité depuis PricingConfig
 *    - Prix_Final = Coût_Base × (1 + coefficient)
 */

import { TransportMode } from '@/generated/prisma';
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
 * Entrées pour le calcul de devis
 *
 * Toutes les mesures doivent être fournies dans les unités suivantes :
 * - Poids : kilogrammes (kg)
 * - Dimensions : centimètres (cm)
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

  /** Code pays d'origine (ISO 2 lettres, ex: FR, BF, CI) */
  paysOrigine: string;

  /** Code pays de destination (ISO 2 lettres, ex: FR, BF, CI) */
  paysDestination: string;
}

/**
 * Résultat détaillé du calcul de devis
 *
 * Contient tous les détails du calcul pour transparence et debugging
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

  /** Coût de base AVANT application de la priorité */
  coutBase: number;

  /** Coefficient multiplicateur de priorité (ex: 1.0, 1.1, 1.3) */
  coefficientPriorite: number;

  /** Prix final APRÈS application de la priorité */
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
    // Pour le maritime et le poids volumétrique, utiliser ratePerM3
    // Pour les autres modes ou si poids réel utilisé, utiliser ratePerKg
    if (input.modeTransport === 'SEA' || factureSurVolume) {
      tarifParUnite = transportRate.ratePerM3;
    } else {
      tarifParUnite = transportRate.ratePerKg;
    }
    tarifsRouteUtilises = true;
  } else {
    // ROUTE NON CONFIGURÉE : Utiliser les tarifs par défaut avec multiplicateur
    const transportMultiplier = config.transportMultipliers[input.modeTransport] || 1.0;

    if (input.modeTransport === 'SEA' || factureSurVolume) {
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

  // === ÉTAPE 7 : Application du Coefficient de Priorité ===
  // Récupérer le coefficient de priorité depuis la config
  const prioritySurcharge = config.prioritySurcharges[priorite] || 0;
  const coefficientPriorite = 1 + prioritySurcharge; // ex: 0.1 → 1.1 (coefficient multiplicateur)

  // === ÉTAPE 8 : Calcul du Prix Final ===
  // Prix_Final = Coût_Base × Coefficient_Priorité
  const prixFinal = coutBase * coefficientPriorite;

  // === ÉTAPE 9 : Construction du Résultat ===
  return {
    volume_m3: Math.round(volume_m3 * 1000) / 1000, // Arrondir à 3 décimales
    poidsVolumetrique_kg: Math.round(poidsVolumetrique_kg * 100) / 100, // Arrondir à 2 décimales
    masseTaxable: Math.round(masseTaxable * 100) / 100,
    uniteMasseTaxable,
    tarifParUnite,
    coutBase: Math.round(coutBase * 100) / 100,
    coefficientPriorite,
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
  const details = [
    `Route : ${result.route.axe}`,
    `Volume : ${result.volume_m3} m³`,
    `Poids volumétrique : ${result.poidsVolumetrique_kg} ${result.uniteMasseTaxable}`,
    `Masse taxable : ${result.masseTaxable} ${result.uniteMasseTaxable}`,
    `Tarif : ${result.tarifParUnite} EUR/${result.uniteMasseTaxable}`,
    `Coût de base : ${result.coutBase} EUR`,
    result.coefficientPriorite !== 1
      ? `Supplément priorité (${result.priorite}) : ×${result.coefficientPriorite}`
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

  return {
    prixTotal: `${result.prixFinal.toFixed(2)} ${result.devise}`,
    details,
    alertes,
  };
}
