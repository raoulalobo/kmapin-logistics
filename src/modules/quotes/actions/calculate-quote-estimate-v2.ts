/**
 * Server Action : Calculer une Estimation de Devis (VERSION 2 - PDF)
 *
 * Nouvelle implémentation basée sur l'algorithme du document "calculs.pdf"
 * Utilise le module pricing-calculator-dynamic pour un calcul conforme aux spécifications
 *
 * @module modules/quotes/actions
 */

'use server';

import {
  quoteEstimateSchema,
  quoteEstimateMultiPackageSchema,
  type QuoteEstimateResult,
  type QuoteEstimateMultiPackageResult,
} from '../schemas/quote.schema';
import {
  calculerPrixDevisDynamic,
  calculerPrixMultiPackages,
  type PriorityType,
  type CargoTypeForPricing,
} from '../lib/pricing-calculator-dynamic';
import { TransportMode, CargoType } from '@/lib/db/enums';

/**
 * Type pour les résultats d'actions avec erreur ou succès
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

/**
 * Mapping des noms de pays complets vers codes ISO
 * Utilisé pour convertir les noms de pays en codes pour le calcul
 */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'France': 'FR',
  'Allemagne': 'DE',
  'Espagne': 'ES',
  'Italie': 'IT',
  'Belgique': 'BE',
  'Pays-Bas': 'NL',
  'Royaume-Uni': 'GB',
  'Pologne': 'PL',
  'États-Unis': 'US',
  'Chine': 'CN',
  'Japon': 'JP',
  'Australie': 'AU',
  'Brésil': 'BR',
  'Canada': 'CA',
  'Inde': 'IN',
  'Afrique du Sud': 'ZA',
  'Maroc': 'MA',
  'Algérie': 'DZ',
  'Tunisie': 'TN',
  'Côte d\'Ivoire': 'CI',
  'Burkina Faso': 'BF',
  'Sénégal': 'SN',
};

/**
 * Action : Calculer une Estimation de Devis (VERSION 2 - Algorithme PDF)
 *
 * Calcule un prix estimatif pour un transport en utilisant l'algorithme
 * défini dans les spécifications du document "calculs.pdf".
 *
 * === Différences avec la version 1 ===
 *
 * 1. **Poids Volumétrique** : Utilise les ratios configurables depuis PricingConfig
 *    - AIR: 167 kg/m³ (ratio 1/6)
 *    - ROAD: 333 kg/m³ (ratio 1/3)
 *    - SEA: Unité Payante (UP) = MAX(Poids/1000, Volume)
 *
 * 2. **Activation par Mode** : Le poids volumétrique peut être désactivé par mode
 *    (ex: Maritime utilise "Poids ou Mesure" au lieu du poids volumétrique)
 *
 * 3. **Priorités** : Support de 4 niveaux (STANDARD, NORMAL, EXPRESS, URGENT)
 *    avec coefficients configurables
 *
 * 4. **Tarifs** : Recherche dans TransportRate puis fallback vers tarifs par défaut
 *
 * @param data - Données du formulaire d'estimation
 * @returns Résultat du calcul avec coût estimé et détails
 *
 * @permissions Aucune - Action publique
 *
 * @example
 * ```typescript
 * const result = await calculateQuoteEstimateV2Action({
 *   originCountry: 'France',
 *   destinationCountry: 'Côte d\'Ivoire',
 *   cargoType: 'GENERAL',
 *   weight: 5,
 *   length: 50,
 *   width: 40,
 *   height: 30,
 *   transportMode: ['AIR'],
 *   priority: 'STANDARD',
 * });
 * ```
 */
export async function calculateQuoteEstimateV2Action(
  data: unknown
): Promise<ActionResult<QuoteEstimateResult>> {
  try {
    // === Étape 1 : Validation des données ===
    const validatedData = quoteEstimateSchema.parse(data);

    // === Étape 2 : Préparation des paramètres ===
    // Convertir les noms de pays en codes ISO si nécessaire
    const originCode =
      COUNTRY_NAME_TO_ISO[validatedData.originCountry] ||
      validatedData.originCountry.toUpperCase().substring(0, 2);

    const destCode =
      COUNTRY_NAME_TO_ISO[validatedData.destinationCountry] ||
      validatedData.destinationCountry.toUpperCase().substring(0, 2);

    // Utiliser le premier mode de transport (primaire)
    const primaryTransportMode = validatedData.transportMode[0] as TransportMode;

    // Mapper la priorité (défaut: STANDARD)
    const priority = (validatedData.priority || 'STANDARD') as PriorityType;

    // Mapper le type de marchandise pour le calculateur
    // CargoType enum peut avoir plus de valeurs que CargoTypeForPricing
    // On mappe les valeurs connues, sinon on utilise 'GENERAL'
    const knownCargoTypes: CargoTypeForPricing[] = [
      'GENERAL', 'DANGEROUS', 'PERISHABLE', 'FRAGILE',
      'BULK', 'CONTAINER', 'PALLETIZED', 'OTHER'
    ];
    const cargoTypeForPricing: CargoTypeForPricing = knownCargoTypes.includes(
      validatedData.cargoType as CargoTypeForPricing
    )
      ? (validatedData.cargoType as CargoTypeForPricing)
      : 'GENERAL';

    // === Étape 3 : Calcul avec le nouvel algorithme ===
    const resultatCalcul = await calculerPrixDevisDynamic({
      poidsReel: validatedData.weight,
      longueur: validatedData.length || 0,
      largeur: validatedData.width || 0,
      hauteur: validatedData.height || 0,
      modeTransport: primaryTransportMode,
      priorite: priority,
      typeMarchandise: cargoTypeForPricing,
      paysOrigine: originCode,
      paysDestination: destCode,
    });

    // === Étape 4 : Conversion du résultat au format QuoteEstimateResult ===
    // Le nouvel algorithme retourne un format différent, on doit le mapper
    const estimatedCost = resultatCalcul.prixFinal;

    // Breakdown avec les vraies valeurs calculées par l'algorithme
    const breakdown = {
      baseCost: resultatCalcul.coutBase,
      cargoTypeSurcharge: resultatCalcul.surchargeTypeMarchandise,
      prioritySurcharge: Math.round(resultatCalcul.surchargePriorite),
    };

    // Estimation du délai de livraison (utiliser la config si disponible)
    const estimatedDeliveryDays = await estimateDeliveryDays(
      primaryTransportMode,
      priority
    );

    // === Étape 5 : Retourner le résultat ===
    return {
      success: true,
      data: {
        estimatedCost,
        currency: 'EUR',
        breakdown,
        estimatedDeliveryDays,
      },
    };
  } catch (error) {
    console.error('Error calculating quote estimate V2:', error);

    // Gestion des erreurs de validation Zod
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        error: 'Données invalides. Veuillez vérifier tous les champs.',
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors du calcul de l\'estimation',
    };
  }
}

/**
 * Action : Calculer une Estimation Multi-Packages (CALCULATEUR PUBLIC)
 *
 * Version multi-colis du calculateur de devis pour la landing page.
 * Chaque ligne de colis est calculée individuellement via calculerPrixMultiPackages(),
 * puis les résultats sont agrégés avec application de la surcharge priorité sur le total.
 *
 * Workflow :
 * 1. Validation des données avec quoteEstimateMultiPackageSchema
 * 2. Conversion des noms de pays en codes ISO
 * 3. Mapping des types de marchandise (CargoType → CargoTypeForPricing)
 * 4. Calcul via calculerPrixMultiPackages() (prix unitaire × quantité par ligne)
 * 5. Estimation du délai de livraison
 * 6. Retour du résultat avec détail par ligne et totaux
 *
 * @param data - Données du formulaire (route + transport + packages[])
 * @returns Résultat détaillé avec prix par ligne, totaux et délai estimé
 *
 * @permissions Aucune - Action publique (pas d'authentification requise)
 *
 * @example
 * ```typescript
 * const result = await calculateMultiPackageEstimateAction({
 *   originCountry: 'FR',
 *   destinationCountry: 'BF',
 *   transportMode: ['AIR'],
 *   priority: 'URGENT',
 *   packages: [
 *     { description: 'Tablette', quantity: 1, cargoType: 'FRAGILE', weight: 2, length: 30, width: 20, height: 5 },
 *     { description: 'Cartons', quantity: 3, cargoType: 'GENERAL', weight: 15 },
 *   ],
 * });
 * // result.data.lines[0] → { unitPrice: 25.50, lineTotal: 25.50, quantity: 1 }
 * // result.data.lines[1] → { unitPrice: 42.00, lineTotal: 126.00, quantity: 3 }
 * // result.data.totalPrice → 196.95 (avec surcharge URGENT ×1.3)
 * ```
 */
export async function calculateMultiPackageEstimateAction(
  data: unknown
): Promise<ActionResult<QuoteEstimateMultiPackageResult>> {
  try {
    // === Étape 1 : Validation des données ===
    const validatedData = quoteEstimateMultiPackageSchema.parse(data);

    // === Étape 2 : Convertir les noms de pays en codes ISO ===
    const originCode =
      COUNTRY_NAME_TO_ISO[validatedData.originCountry] ||
      validatedData.originCountry.toUpperCase().substring(0, 2);

    const destCode =
      COUNTRY_NAME_TO_ISO[validatedData.destinationCountry] ||
      validatedData.destinationCountry.toUpperCase().substring(0, 2);

    // === Étape 3 : Mapper les types de marchandise de chaque colis ===
    // CargoType (enum DB) peut avoir plus de valeurs que CargoTypeForPricing
    // On mappe les valeurs connues, sinon on utilise 'GENERAL' comme fallback
    const knownCargoTypes: CargoTypeForPricing[] = [
      'GENERAL', 'DANGEROUS', 'PERISHABLE', 'FRAGILE',
      'BULK', 'CONTAINER', 'PALLETIZED', 'OTHER'
    ];

    const packagesForPricing = validatedData.packages.map((pkg) => ({
      description: pkg.description,
      quantity: pkg.quantity,
      cargoType: knownCargoTypes.includes(pkg.cargoType as CargoTypeForPricing)
        ? (pkg.cargoType as CargoTypeForPricing)
        : ('GENERAL' as CargoTypeForPricing),
      weight: pkg.weight,
      // Dimensions optionnelles : convertir undefined/null en 0 pour le calculateur
      length: pkg.length || 0,
      width: pkg.width || 0,
      height: pkg.height || 0,
    }));

    // Mode de transport principal (le premier sélectionné)
    const primaryTransportMode = validatedData.transportMode[0] as TransportMode;

    // Priorité (défaut: STANDARD)
    const priority = (validatedData.priority || 'STANDARD') as PriorityType;

    // === Étape 4 : Calcul multi-packages ===
    // calculerPrixMultiPackages() itère sur chaque colis, calcule le prix unitaire
    // (avec surcharge cargo mais SANS surcharge priorité), multiplie par la quantité,
    // puis applique la surcharge priorité UNE SEULE FOIS sur le total global
    const multiResult = await calculerPrixMultiPackages({
      packages: packagesForPricing,
      modeTransport: primaryTransportMode,
      priorite: priority,
      paysOrigine: originCode,
      paysDestination: destCode,
    });

    // === Étape 5 : Estimation du délai de livraison ===
    const estimatedDeliveryDays = await estimateDeliveryDays(
      primaryTransportMode,
      priority
    );

    // === Étape 6 : Mapper le résultat pour le composant client ===
    // On simplifie les données pour ne pas exposer les détails internes du calculateur
    const resultForClient: QuoteEstimateMultiPackageResult = {
      lines: multiResult.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        cargoType: line.cargoType,
        weight: line.weight,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
      totalPackageCount: multiResult.totalPackageCount,
      totalWeight: multiResult.totalWeight,
      totalBeforePriority: multiResult.totalBeforePriority,
      totalPrice: multiResult.totalPrice,
      devise: multiResult.devise,
      route: multiResult.route,
      modeTransport: multiResult.modeTransport,
      priorite: multiResult.priorite,
      dominantCargoType: multiResult.dominantCargoType,
      estimatedDeliveryDays,
    };

    return {
      success: true,
      data: resultForClient,
    };
  } catch (error) {
    console.error('Error calculating multi-package estimate:', error);

    // Gestion des erreurs de validation Zod
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        error: 'Données invalides. Veuillez vérifier tous les champs.',
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors du calcul de l\'estimation',
    };
  }
}

/**
 * Fonction helper pour estimer le délai de livraison
 *
 * Utilise la configuration PricingConfig pour obtenir les délais par mode
 * et applique un ajustement selon la priorité
 *
 * @param transportMode - Mode de transport
 * @param priority - Priorité de livraison
 * @returns Nombre de jours estimés
 */
async function estimateDeliveryDays(
  transportMode: TransportMode,
  priority: PriorityType
): Promise<number> {
  try {
    const { getPricingConfig } = await import('@/modules/pricing-config');
    const config = await getPricingConfig();

    // Récupérer les délais pour ce mode
    const deliverySpeed = config.deliverySpeedsPerMode[transportMode];
    if (!deliverySpeed) {
      return 7; // Défaut : 7 jours
    }

    // Prendre la médiane entre min et max
    let baseDays = Math.round((deliverySpeed.min + deliverySpeed.max) / 2);

    // Ajuster selon la priorité
    switch (priority) {
      case 'NORMAL':
        baseDays = Math.ceil(baseDays * 0.8); // -20%
        break;
      case 'EXPRESS':
        baseDays = Math.ceil(baseDays * 0.6); // -40%
        break;
      case 'URGENT':
        baseDays = Math.ceil(baseDays * 0.4); // -60%
        break;
      default:
        // STANDARD: pas de modification
        break;
    }

    return Math.max(1, baseDays); // Minimum 1 jour
  } catch (error) {
    console.error('Error estimating delivery days:', error);
    return 7; // Défaut en cas d'erreur
  }
}
