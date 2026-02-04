/**
 * Server Action : Options de mode de transport avec labels dynamiques
 *
 * Fournit les options de mode de transport avec des labels formatés
 * incluant les multiplicateurs tarifaires et délais de livraison
 * configurés dans PricingConfig.
 *
 * Cette action est accessible à tous les utilisateurs authentifiés
 * car elle est utilisée dans les formulaires de création de devis.
 *
 * @example
 * // Utilisation dans un composant Client
 * const [options, setOptions] = useState<TransportModeOption[]>([]);
 * useEffect(() => {
 *   getTransportModeOptionsAction().then(result => {
 *     if (result.success) setOptions(result.data);
 *   });
 * }, []);
 *
 * @module modules/pricing-config/actions
 */

'use server';

import { getPricingConfig, DEFAULT_PRICING_CONFIG } from '../lib/get-pricing-config';

/**
 * Type pour une option de mode de transport avec label formaté
 */
export interface TransportModeOption {
  /** Valeur technique (ROAD, SEA, AIR, RAIL) */
  value: 'ROAD' | 'SEA' | 'AIR' | 'RAIL';
  /** Label simple (Routier, Maritime, etc.) */
  label: string;
  /** Label enrichi avec multiplicateur et délai */
  labelWithDetails: string;
  /** Multiplicateur tarifaire (ex: 1.0, 0.6, 3.0) */
  multiplier: number;
  /** Impact en pourcentage par rapport à ROAD (référence) */
  percentageImpact: string;
  /** Délai de livraison minimum (jours) */
  deliveryMin: number;
  /** Délai de livraison maximum (jours) */
  deliveryMax: number;
  /** Description du délai formatée */
  deliveryLabel: string;
}

/**
 * Type de résultat pour l'action
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Labels de base pour les modes de transport
 */
const TRANSPORT_MODE_LABELS: Record<string, string> = {
  ROAD: 'Routier',
  SEA: 'Maritime',
  AIR: 'Aérien',
  RAIL: 'Ferroviaire',
};

/**
 * Formate l'impact tarifaire en pourcentage lisible
 *
 * @param multiplier - Multiplicateur tarifaire (ex: 0.6, 1.0, 3.0)
 * @param referenceMultiplier - Multiplicateur de référence (généralement ROAD = 1.0)
 * @returns Chaîne formatée (ex: "-40%", "référence", "+200%")
 */
function formatPercentageImpact(multiplier: number, referenceMultiplier: number): string {
  if (multiplier === referenceMultiplier) {
    return 'référence';
  }

  const percentChange = ((multiplier - referenceMultiplier) / referenceMultiplier) * 100;
  const rounded = Math.round(percentChange);

  if (rounded > 0) {
    return `+${rounded}%`;
  } else {
    return `${rounded}%`;
  }
}

/**
 * Récupère les options de mode de transport avec labels dynamiques
 *
 * Les valeurs (multiplicateurs, délais) proviennent de la configuration
 * PricingConfig en base de données, avec fallback aux valeurs par défaut.
 *
 * @returns Liste des options de mode de transport formatées
 *
 * @example
 * // Résultat type
 * [
 *   {
 *     value: 'ROAD',
 *     label: 'Routier',
 *     labelWithDetails: 'Routier (référence - 3-7 jours)',
 *     multiplier: 1.0,
 *     percentageImpact: 'référence',
 *     deliveryMin: 3,
 *     deliveryMax: 7,
 *     deliveryLabel: '3-7 jours'
 *   },
 *   {
 *     value: 'AIR',
 *     label: 'Aérien',
 *     labelWithDetails: 'Aérien (+200% express - 1-3 jours)',
 *     multiplier: 3.0,
 *     percentageImpact: '+200%',
 *     deliveryMin: 1,
 *     deliveryMax: 3,
 *     deliveryLabel: '1-3 jours'
 *   },
 *   ...
 * ]
 */
export async function getTransportModeOptionsAction(): Promise<
  ActionResult<TransportModeOption[]>
> {
  try {
    // Récupérer la configuration (avec cache Next.js)
    const config = await getPricingConfig();

    // Utiliser ROAD comme référence pour les calculs de pourcentage
    const referenceMultiplier = config.transportMultipliers.ROAD;

    // Construire les options pour chaque mode de transport
    const modes: Array<'ROAD' | 'SEA' | 'AIR' | 'RAIL'> = ['ROAD', 'SEA', 'AIR', 'RAIL'];

    const options: TransportModeOption[] = modes.map((mode) => {
      const multiplier = config.transportMultipliers[mode];
      const delivery = config.deliverySpeedsPerMode[mode];
      const percentageImpact = formatPercentageImpact(multiplier, referenceMultiplier);

      // Construire le label de délai
      const deliveryLabel = `${delivery.min}-${delivery.max} jours`;

      // Ajouter une mention spéciale pour les modes rapides ou économiques
      let speedMention = '';
      if (mode === 'AIR') {
        speedMention = 'express ';
      } else if (mode === 'SEA' && multiplier < referenceMultiplier) {
        speedMention = 'économique ';
      }

      // Construire le label enrichi
      // Format: "Mode (impact - délai)" ou "Mode (référence - délai)"
      const labelWithDetails = `${TRANSPORT_MODE_LABELS[mode]} (${percentageImpact} ${speedMention}- ${deliveryLabel})`;

      return {
        value: mode,
        label: TRANSPORT_MODE_LABELS[mode],
        labelWithDetails: labelWithDetails.replace('  ', ' '), // Nettoyer les espaces doubles
        multiplier,
        percentageImpact,
        deliveryMin: delivery.min,
        deliveryMax: delivery.max,
        deliveryLabel,
      };
    });

    return { success: true, data: options };
  } catch (error) {
    console.error('[getTransportModeOptionsAction] Erreur:', error);

    // En cas d'erreur, retourner les valeurs par défaut
    const defaultConfig = DEFAULT_PRICING_CONFIG;
    const referenceMultiplier = defaultConfig.transportMultipliers.ROAD;

    const fallbackOptions: TransportModeOption[] = [
      {
        value: 'ROAD',
        label: 'Routier',
        labelWithDetails: 'Routier (référence - 3-7 jours)',
        multiplier: 1.0,
        percentageImpact: 'référence',
        deliveryMin: 3,
        deliveryMax: 7,
        deliveryLabel: '3-7 jours',
      },
      {
        value: 'SEA',
        label: 'Maritime',
        labelWithDetails: 'Maritime (-40% économique - 20-45 jours)',
        multiplier: 0.6,
        //percentageImpact: '-40%',
        percentageImpact: '',
        deliveryMin: 20,
        deliveryMax: 45,
        deliveryLabel: '20-45 jours',
      },
      {
        value: 'AIR',
        label: 'Aérien',
        labelWithDetails: 'Aérien (+200% express - 1-3 jours)',
        multiplier: 3.0,
        percentageImpact: '',
        deliveryMin: 1,
        deliveryMax: 3,
        deliveryLabel: '1-3 jours',
      },
      {
        value: 'RAIL',
        label: 'Ferroviaire',
        labelWithDetails: 'Ferroviaire (-20% - 7-14 jours)',
        multiplier: 0.8,
        percentageImpact: '',
        deliveryMin: 7,
        deliveryMax: 14,
        deliveryLabel: '7-14 jours',
      },
    ];

    return { success: true, data: fallbackOptions };
  }
}

/**
 * Type exporté pour utilisation dans les composants
 */
export type { TransportModeOption };

// ════════════════════════════════════════════════════════════════════════════
// OPTIONS DE PRIORITÉ DE LIVRAISON
// ════════════════════════════════════════════════════════════════════════════

/**
 * Type pour une option de priorité de livraison avec label formaté
 */
export interface PriorityOption {
  /** Valeur technique (STANDARD, NORMAL, EXPRESS, URGENT) */
  value: 'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT';
  /** Label simple (Standard, Normal, etc.) */
  label: string;
  /** Label enrichi avec supplément et description */
  labelWithDetails: string;
  /** Supplément tarifaire (ex: 0, 0.1, 0.5, 0.3) */
  surcharge: number;
  /** Impact en pourcentage formaté (ex: "+10%", "+50%") */
  percentageLabel: string;
  /** Description courte du niveau de service */
  description: string;
}

/**
 * Labels et descriptions de base pour les priorités
 */
const PRIORITY_LABELS: Record<string, { label: string; description: string }> = {
  STANDARD: { label: 'Standard', description: 'délai normal' },
  NORMAL: { label: 'Normal', description: 'légèrement accéléré' },
  EXPRESS: { label: 'Express', description: 'rapide' },
  URGENT: { label: 'Urgent', description: 'prioritaire' },
};

/**
 * Formate le supplément en pourcentage lisible
 *
 * @param surcharge - Supplément tarifaire (ex: 0.1 pour +10%)
 * @returns Chaîne formatée (ex: "+10%", "0%")
 */
function formatPrioritySurcharge(surcharge: number): string {
  const percent = Math.round(surcharge * 100);
  if (percent === 0) {
    return '0%';
  }
  return `+${percent}%`;
}

/**
 * Récupère les options de priorité de livraison avec labels dynamiques
 *
 * Les valeurs (surcharges) proviennent de la configuration
 * PricingConfig en base de données, avec fallback aux valeurs par défaut.
 *
 * @returns Liste des options de priorité formatées
 *
 * @example
 * // Résultat type
 * [
 *   {
 *     value: 'STANDARD',
 *     label: 'Standard',
 *     labelWithDetails: 'Standard (délai normal)',
 *     surcharge: 0,
 *     percentageLabel: '0%',
 *     description: 'délai normal'
 *   },
 *   {
 *     value: 'EXPRESS',
 *     label: 'Express',
 *     labelWithDetails: 'Express (+50% - rapide)',
 *     surcharge: 0.5,
 *     percentageLabel: '+50%',
 *     description: 'rapide'
 *   },
 *   ...
 * ]
 */
export async function getPriorityOptionsAction(): Promise<
  ActionResult<PriorityOption[]>
> {
  try {
    // Récupérer la configuration (avec cache Next.js)
    const config = await getPricingConfig();

    // Construire les options pour chaque priorité
    const priorities: Array<'STANDARD' | 'NORMAL' | 'EXPRESS' | 'URGENT'> = [
      'STANDARD',
      'NORMAL',
      'EXPRESS',
      'URGENT',
    ];

    const options: PriorityOption[] = priorities.map((priority) => {
      const surcharge = config.prioritySurcharges[priority];
      const { label, description } = PRIORITY_LABELS[priority];
      const percentageLabel = formatPrioritySurcharge(surcharge);

      // Construire le label enrichi
      // Format: "Label (+X% - description)" ou "Label (description)" si 0%
      let labelWithDetails: string;
      if (surcharge === 0) {
        labelWithDetails = `${label} (${description})`;
      } else {
        labelWithDetails = `${label} (${percentageLabel} - ${description})`;
      }

      return {
        value: priority,
        label,
        labelWithDetails,
        surcharge,
        percentageLabel,
        description,
      };
    });

    return { success: true, data: options };
  } catch (error) {
    console.error('[getPriorityOptionsAction] Erreur:', error);

    // En cas d'erreur, retourner les valeurs par défaut
    const fallbackOptions: PriorityOption[] = [
      {
        value: 'STANDARD',
        label: 'Standard',
        labelWithDetails: 'Standard (délai normal)',
        surcharge: 0,
        percentageLabel: '0%',
        description: 'délai normal',
      },
      {
        value: 'NORMAL',
        label: 'Normal',
        labelWithDetails: 'Normal (+10% - légèrement accéléré)',
        surcharge: 0.1,
        percentageLabel: '+10%',
        description: 'légèrement accéléré',
      },
      {
        value: 'EXPRESS',
        label: 'Express',
        labelWithDetails: 'Express (+50% - rapide)',
        surcharge: 0.5,
        percentageLabel: '+50%',
        description: 'rapide',
      },
      {
        value: 'URGENT',
        label: 'Urgent',
        labelWithDetails: 'Urgent (+30% - prioritaire)',
        surcharge: 0.3,
        percentageLabel: '+30%',
        description: 'prioritaire',
      },
    ];

    return { success: true, data: fallbackOptions };
  }
}

/**
 * Type exporté pour utilisation dans les composants
 */
export type { PriorityOption };
