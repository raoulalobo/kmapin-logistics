/**
 * Server Action : Calculer une Estimation de Devis (VERSION 2 - PDF)
 *
 * Nouvelle implémentation basée sur l'algorithme du document "calculs.pdf"
 * Utilise le module pricing-calculator-dynamic pour un calcul conforme aux spécifications
 *
 * @module modules/quotes/actions
 */

'use server';

import { quoteEstimateSchema, type QuoteEstimateResult } from '../schemas/quote.schema';
import {
  calculerPrixDevisDynamic,
  type PriorityType,
} from '../lib/pricing-calculator-dynamic';
import { TransportMode } from '@/generated/prisma';

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

    // === Étape 3 : Calcul avec le nouvel algorithme ===
    const resultatCalcul = await calculerPrixDevisDynamic({
      poidsReel: validatedData.weight,
      longueur: validatedData.length || 0,
      largeur: validatedData.width || 0,
      hauteur: validatedData.height || 0,
      modeTransport: primaryTransportMode,
      priorite: priority,
      paysOrigine: originCode,
      paysDestination: destCode,
    });

    // === Étape 4 : Conversion du résultat au format QuoteEstimateResult ===
    // Le nouvel algorithme retourne un format différent, on doit le mapper
    const estimatedCost = resultatCalcul.prixFinal;

    // Calcul du breakdown pour compatibilité avec l'ancienne interface
    const breakdown = {
      baseCost: resultatCalcul.coutBase,
      transportModeCost: 0, // Non applicable dans le nouvel algorithme
      cargoTypeSurcharge: 0, // Non inclus dans ce calcul simplifié
      prioritySurcharge: Math.round(
        resultatCalcul.coutBase * (resultatCalcul.coefficientPriorite - 1)
      ),
      distanceFactor: 0, // Non utilisé dans le nouvel algorithme
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
