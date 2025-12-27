/**
 * Module de Calcul de Devis Fret
 *
 * Implémente l'algorithme de cotation selon les spécifications fonctionnelles.
 * Basé sur le document "calculs.pdf" - Spécifications du Module de Calcul de Devis Fret
 *
 * @module modules/quotes/lib/pricing-calculator
 *
 * === Règles Métier ===
 *
 * 1. Calcul du Poids Volumétrique (PV) :
 *    - Aérien  : Volume (m³) × 167 kg    [Ratio 1/6 = 6000]
 *    - Routier : Volume (m³) × 333 kg    [Ratio 1/3 = 5000]
 *    - Maritime: MAX(Poids/1000, Volume) [Ratio 1/1 = 1000] → Unité Payante (UP)
 *
 * 2. Masse Taxable :
 *    - Pour Aérien et Routier : MAX(Poids Réel, Poids Volumétrique)
 *    - Pour Maritime : MAX(Poids en tonnes, Volume en m³) → Unité Payante
 *
 * 3. Coût de Base :
 *    - Coût_Base = Masse_Taxable × Tarif_Axe_Mode
 *
 * 4. Prix Final (avec Priorité) :
 *    - Standard : Prix_Final = Coût_Base × 1.0
 *    - Normal   : Prix_Final = Coût_Base × 1.1
 *    - Urgent   : Prix_Final = Coût_Base × 1.3
 *
 * === Pourquoi cette règle ? ===
 *
 * Le poids volumétrique permet d'optimiser l'espace dans les moyens de transport :
 * - **Colis lourd et compact** (ex: lingots de plomb) → Facturation au poids réel
 * - **Colis léger et encombrant** (ex: plumes, cartons vides) → Facturation au volume
 *
 * L'aérien a un ratio plus restrictif (1/6) car l'espace cabine coûte cher.
 * Le routier est intermédiaire (1/3).
 * Le maritime privilégie le poids réel (conteneurs standardisés).
 */

import { TransportMode } from '@/generated/prisma';

/**
 * Type de priorité pour le calcul de devis
 *
 * - STANDARD : Livraison normale (coefficient 1.0)
 * - NORMAL   : Livraison accélérée (+10%, coefficient 1.1)
 * - URGENT   : Livraison express (+30%, coefficient 1.3)
 */
export type Priority = 'STANDARD' | 'NORMAL' | 'URGENT';

/**
 * Entrées pour le calcul de devis
 *
 * Toutes les mesures doivent être fournies dans les unités suivantes :
 * - Poids : kilogrammes (kg)
 * - Dimensions : centimètres (cm)
 */
export interface QuotePricingInput {
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
  priorite?: Priority;

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
export interface QuotePricingResult {
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

  /** Coefficient multiplicateur de priorité (1.0, 1.1, ou 1.3) */
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
  priorite: Priority;

  /** Indicateur si le poids volumétrique a été utilisé au lieu du poids réel */
  factureSurVolume: boolean;
}

/**
 * Ratios de conversion pour le calcul du poids volumétrique
 *
 * Ces ratios définissent combien de kg équivaut 1 m³ selon le mode de transport.
 * Plus le ratio est élevé, plus le volume est pénalisé (facturé cher).
 */
const RATIOS_CONVERSION: Record<TransportMode, number> = {
  AIR: 167,   // 1 m³ = 167 kg  (Ratio 1/6 = 6000)
  ROAD: 333,  // 1 m³ = 333 kg  (Ratio 1/3 = 5000)
  SEA: 1,     // 1 m³ = 1 tonne (Ratio 1/1 = 1000) - Cas spécial : Unité Payante
  RAIL: 250,  // 1 m³ = 250 kg  (Ratio approximatif pour ferroviaire)
};

/**
 * Coefficients multiplicateurs de priorité
 *
 * Appliqués au coût de base pour obtenir le prix final
 */
const COEFFICIENTS_PRIORITE: Record<Priority, number> = {
  STANDARD: 1.0,  // +0%
  NORMAL: 1.1,    // +10%
  URGENT: 1.3,    // +30%
};

/**
 * Tableau des Tarifs de Référence (Tarif_Axe_Mode)
 *
 * Structure : { "CODE_ORIGINE-CODE_DESTINATION": { MODE: TARIF } }
 *
 * Tarifs basés sur le document de spécifications :
 * - France → Côte d'Ivoire : Aérien 5.50-6.50 €/kg, Maritime 260-350 €/m³
 * - France → Burkina Faso : Aérien 6.50-8.00 €/kg, Maritime 380-550 €
 * - Côte d'Ivoire → Burkina : Aérien 3.50-4.50 €/kg, Routier 120-150 €/tonne
 * - Burkina Faso → France : Aérien 9.00-12.00 €/kg, Maritime 300-450 €
 *
 * IMPORTANT : Pour les tarifs avec fourchette, on utilise la valeur médiane
 */
const TARIFS_REFERENCE: Record<string, Partial<Record<TransportMode, number>>> = {
  // France → Côte d'Ivoire
  'FR-CI': {
    AIR: 6.0,   // Médiane de 5.50-6.50 €/kg
    SEA: 305,   // Médiane de 260-350 €/m³
  },
  // France → Burkina Faso
  'FR-BF': {
    AIR: 7.25,  // Médiane de 6.50-8.00 €/kg
    SEA: 465,   // Médiane de 380-550 €/m³
  },
  // Côte d'Ivoire → Burkina Faso
  'CI-BF': {
    AIR: 4.0,   // Médiane de 3.50-4.50 €/kg
    ROAD: 135,  // Médiane de 120-150 €/tonne
  },
  // Burkina Faso → France
  'BF-FR': {
    AIR: 10.5,  // Médiane de 9.00-12.00 €/kg
    SEA: 375,   // Médiane de 300-450 €/m³
  },
  // Routes inverses (symétriques, mais peuvent avoir des tarifs différents)
  'CI-FR': {
    AIR: 6.0,
    SEA: 305,
  },
  'BF-CI': {
    AIR: 4.0,
    ROAD: 135,
  },
};

/**
 * Tarif par défaut si la route n'est pas configurée
 * Utilisé comme fallback pour les routes non définies dans TARIFS_REFERENCE
 */
const TARIF_DEFAUT_PAR_MODE: Record<TransportMode, number> = {
  AIR: 8.0,   // €/kg
  SEA: 400,   // €/m³
  ROAD: 150,  // €/tonne
  RAIL: 100,  // €/tonne
};

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
 *
 * @example
 * // Carton de 50cm × 40cm × 30cm
 * const volume = calculerVolume(50, 40, 30);
 * // => 0.06 m³
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
 * === ÉTAPE 2 : Calcul du Poids Volumétrique ===
 *
 * Calcule le poids volumétrique selon le mode de transport
 *
 * Formules :
 * - Aérien  : PV = Volume_m3 × 167 kg
 * - Routier : PV = Volume_m3 × 333 kg
 * - Maritime: PV = Volume_m3 (en m³, pas converti en kg)
 * - Rail    : PV = Volume_m3 × 250 kg
 *
 * @param volume_m3 - Volume en mètres cubes
 * @param modeTransport - Mode de transport
 * @returns Poids volumétrique en kg (ou m³ pour maritime)
 *
 * @example
 * // Volume de 0.06 m³ en aérien
 * const pv = calculerPoidsVolumetrique(0.06, 'AIR');
 * // => 0.06 × 167 = 10.02 kg
 */
export function calculerPoidsVolumetrique(
  volume_m3: number,
  modeTransport: TransportMode
): number {
  const ratio = RATIOS_CONVERSION[modeTransport];

  if (!ratio) {
    throw new Error(`Mode de transport invalide : ${modeTransport}`);
  }

  // Pour le maritime, le poids volumétrique = volume en m³ (pas de conversion)
  // Pour les autres modes, on multiplie par le ratio
  return volume_m3 * ratio;
}

/**
 * === ÉTAPE 3 : Détermination de la Masse Taxable ===
 *
 * Détermine la masse à utiliser pour la facturation
 *
 * Règles :
 * - Aérien et Routier : MAX(Poids_Réel, Poids_Volumétrique)
 * - Maritime : MAX(Poids_Réel / 1000 tonnes, Volume_m3)
 *
 * @param poidsReel_kg - Poids réel en kilogrammes
 * @param poidsVolumetrique - Poids volumétrique calculé
 * @param volume_m3 - Volume en m³ (utilisé uniquement pour maritime)
 * @param modeTransport - Mode de transport
 * @returns Objet avec la masse taxable et son unité
 *
 * @example
 * // Colis de 5 kg avec PV de 10 kg en aérien
 * const masseTaxable = determinerMasseTaxable(5, 10, 0.06, 'AIR');
 * // => { masseTaxable: 10, unite: 'kg', factureSurVolume: true }
 */
export function determinerMasseTaxable(
  poidsReel_kg: number,
  poidsVolumetrique: number,
  volume_m3: number,
  modeTransport: TransportMode
): {
  masseTaxable: number;
  unite: 'kg' | 'UP' | 'tonne';
  factureSurVolume: boolean;
} {
  if (modeTransport === 'SEA') {
    // Cas spécial Maritime : Unité Payante (UP) = MAX(Poids en tonnes, Volume en m³)
    const poidsTonnes = poidsReel_kg / 1000;
    const masseTaxable = Math.max(poidsTonnes, volume_m3);

    return {
      masseTaxable,
      unite: 'UP',
      factureSurVolume: volume_m3 > poidsTonnes, // true si on facture au volume
    };
  } else {
    // Cas Aérien, Routier, Rail : MAX(Poids Réel, Poids Volumétrique)
    const masseTaxable = Math.max(poidsReel_kg, poidsVolumetrique);

    return {
      masseTaxable,
      unite: 'kg',
      factureSurVolume: poidsVolumetrique > poidsReel_kg, // true si on facture au volume
    };
  }
}

/**
 * === ÉTAPE 4 : Récupération du Tarif ===
 *
 * Récupère le tarif applicable pour une route et un mode de transport donnés
 *
 * Stratégie :
 * 1. Chercher le tarif exact pour l'axe (origine → destination)
 * 2. Si non trouvé, utiliser le tarif par défaut du mode de transport
 *
 * @param origine - Code pays d'origine (ex: "FR", "BF", "CI")
 * @param destination - Code pays de destination
 * @param modeTransport - Mode de transport
 * @returns Tarif par unité (€/kg, €/m³, ou €/tonne selon le mode)
 *
 * @example
 * const tarif = obtenirTarif('FR', 'CI', 'AIR');
 * // => 6.0 €/kg
 */
export function obtenirTarif(
  origine: string,
  destination: string,
  modeTransport: TransportMode
): number {
  // Normaliser les codes pays en majuscules
  const origineNorm = origine.toUpperCase();
  const destinationNorm = destination.toUpperCase();

  // Construire la clé de l'axe
  const axe = `${origineNorm}-${destinationNorm}`;

  // Chercher le tarif pour cet axe et ce mode
  const tarifsAxe = TARIFS_REFERENCE[axe];

  if (tarifsAxe && tarifsAxe[modeTransport] !== undefined) {
    return tarifsAxe[modeTransport]!;
  }

  // Fallback : utiliser le tarif par défaut
  console.warn(
    `Tarif non trouvé pour l'axe ${axe} en mode ${modeTransport}. ` +
    `Utilisation du tarif par défaut : ${TARIF_DEFAUT_PAR_MODE[modeTransport]} €`
  );

  return TARIF_DEFAUT_PAR_MODE[modeTransport];
}

/**
 * === FONCTION PRINCIPALE : Calculer le Prix d'un Devis ===
 *
 * Orchestre toutes les étapes du calcul de prix selon l'algorithme des spécifications
 *
 * Étapes :
 * 1. Calcul du volume (m³)
 * 2. Calcul du poids volumétrique (kg ou m³ pour maritime)
 * 3. Détermination de la masse taxable (MAX entre poids réel et volumétrique)
 * 4. Récupération du tarif pour l'axe et le mode de transport
 * 5. Calcul du coût de base (Masse_Taxable × Tarif)
 * 6. Application du coefficient de priorité
 * 7. Calcul du prix final
 *
 * @param input - Paramètres du devis (poids, dimensions, route, mode, priorité)
 * @returns Résultat détaillé du calcul avec tous les intermédiaires
 *
 * @throws {Error} Si les données d'entrée sont invalides
 *
 * @example
 * const resultat = calculerPrixDevis({
 *   poidsReel: 5,          // 5 kg
 *   longueur: 50,          // 50 cm
 *   largeur: 40,           // 40 cm
 *   hauteur: 30,           // 30 cm
 *   modeTransport: 'AIR',
 *   priorite: 'STANDARD',
 *   paysOrigine: 'FR',
 *   paysDestination: 'CI',
 * });
 * // => {
 * //   volume_m3: 0.06,
 * //   poidsVolumetrique_kg: 10.02,
 * //   masseTaxable: 10.02,
 * //   coutBase: 60.12,
 * //   prixFinal: 60.12,
 * //   ...
 * // }
 */
export function calculerPrixDevis(input: QuotePricingInput): QuotePricingResult {
  // Validation des entrées
  if (input.poidsReel <= 0) {
    throw new Error('Le poids réel doit être strictement positif');
  }

  // Définir la priorité par défaut si non fournie
  const priorite = input.priorite || 'STANDARD';

  // === ÉTAPE 1 : Calcul du Volume ===
  const volume_m3 = calculerVolume(input.longueur, input.largeur, input.hauteur);

  // === ÉTAPE 2 : Calcul du Poids Volumétrique ===
  const poidsVolumetrique_kg = calculerPoidsVolumetrique(volume_m3, input.modeTransport);

  // === ÉTAPE 3 : Détermination de la Masse Taxable ===
  const { masseTaxable, unite, factureSurVolume } = determinerMasseTaxable(
    input.poidsReel,
    poidsVolumetrique_kg,
    volume_m3,
    input.modeTransport
  );

  // === ÉTAPE 4 : Récupération du Tarif ===
  const tarifParUnite = obtenirTarif(
    input.paysOrigine,
    input.paysDestination,
    input.modeTransport
  );

  // === ÉTAPE 5 : Calcul du Coût de Base ===
  // Coût_Base = Masse_Taxable × Tarif_Axe_Mode
  const coutBase = masseTaxable * tarifParUnite;

  // === ÉTAPE 6 : Application du Coefficient de Priorité ===
  const coefficientPriorite = COEFFICIENTS_PRIORITE[priorite];

  // === ÉTAPE 7 : Calcul du Prix Final ===
  // Prix_Final = Coût_Base × Coefficient_Priorité
  const prixFinal = coutBase * coefficientPriorite;

  // === ÉTAPE 8 : Construction du Résultat ===
  return {
    volume_m3: Math.round(volume_m3 * 1000) / 1000, // Arrondir à 3 décimales
    poidsVolumetrique_kg: Math.round(poidsVolumetrique_kg * 100) / 100, // Arrondir à 2 décimales
    masseTaxable: Math.round(masseTaxable * 100) / 100,
    uniteMasseTaxable: unite,
    tarifParUnite,
    coutBase: Math.round(coutBase * 100) / 100,
    coefficientPriorite,
    prixFinal: Math.round(prixFinal * 100) / 100,
    devise: 'EUR',
    route: {
      origine: input.paysOrigine.toUpperCase(),
      destination: input.paysDestination.toUpperCase(),
      axe: `${input.paysOrigine.toUpperCase()} → ${input.paysDestination.toUpperCase()}`,
    },
    modeTransport: input.modeTransport,
    priorite,
    factureSurVolume,
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
export function formaterResultatDevis(result: QuotePricingResult): {
  prixTotal: string;
  details: string[];
  alertes: string[];
} {
  const details = [
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

  return {
    prixTotal: `${result.prixFinal.toFixed(2)} ${result.devise}`,
    details,
    alertes,
  };
}
