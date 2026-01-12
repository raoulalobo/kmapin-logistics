/**
 * Utilitaires pour la gestion des statuts de demande d'enlèvement
 *
 * Centralise les couleurs, labels et icônes pour garantir la cohérence
 * sur toute l'application selon les codes couleur standardisés :
 *
 * - Nouveau (REQUESTED) : Bleu
 * - Prise en charge (SCHEDULED/IN_PROGRESS) : Orange
 * - Effectué (COMPLETED) : Vert
 * - Annulé (CANCELED) : Rouge
 *
 * @module lib/utils/pickup-status
 */

import { PickupStatus } from '@/generated/prisma';
import {
  Clock,
  Calendar,
  PlayCircle,
  CheckCircle,
  XCircle,
  type Icon,
} from '@phosphor-icons/react';

/**
 * Configuration complète d'un statut
 */
export interface PickupStatusConfig {
  /** Libellé en français */
  label: string;
  /** Classe Tailwind pour la couleur du badge */
  color: string;
  /** Classe Tailwind pour la couleur du texte */
  textColor: string;
  /** Classe Tailwind pour la couleur de fond (hover, etc.) */
  bgColor: string;
  /** Description longue du statut */
  description: string;
  /** Icône Phosphor associée au statut */
  icon: Icon;
}

/**
 * Mapping complet des statuts avec codes couleur standardisés
 *
 * ✅ Conforme aux critères d'acceptation de la user story :
 * - Nouveau : Bleu (#3B82F6)
 * - Prise en charge : Orange (#F97316)
 * - Effectué : Vert (#10B981)
 * - Annulé : Rouge (#EF4444)
 */
export const PICKUP_STATUS_CONFIG: Record<PickupStatus, PickupStatusConfig> = {
  /**
   * REQUESTED - Nouveau
   * Demande créée, en attente de planification
   * Couleur : BLEU (selon critères d'acceptation)
   */
  REQUESTED: {
    label: 'Nouveau',
    color: 'bg-blue-500 text-white',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Demande créée, en attente de planification par l\'équipe',
    icon: Clock,
  },

  /**
   * SCHEDULED - Prise en charge
   * Enlèvement planifié avec date et créneau
   * Couleur : ORANGE (selon critères d'acceptation)
   */
  SCHEDULED: {
    label: 'Prise en charge',
    color: 'bg-orange-500 text-white',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    description: 'Enlèvement planifié, transporteur assigné',
    icon: Calendar,
  },

  /**
   * IN_PROGRESS - Prise en charge (en cours)
   * Transporteur en route ou sur place
   * Couleur : ORANGE (même que SCHEDULED)
   */
  IN_PROGRESS: {
    label: 'Prise en charge',
    color: 'bg-orange-500 text-white',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    description: 'Transporteur en route ou sur place',
    icon: PlayCircle,
  },

  /**
   * COMPLETED - Effectué
   * Enlèvement réalisé avec succès
   * Couleur : VERT (selon critères d'acceptation)
   */
  COMPLETED: {
    label: 'Effectué',
    color: 'bg-green-500 text-white',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    description: 'Enlèvement effectué avec succès',
    icon: CheckCircle,
  },

  /**
   * CANCELED - Annulé
   * Enlèvement annulé par le client ou l'équipe
   * Couleur : ROUGE (selon critères d'acceptation)
   */
  CANCELED: {
    label: 'Annulé',
    color: 'bg-red-500 text-white',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    description: 'Enlèvement annulé',
    icon: XCircle,
  },
};

/**
 * Obtenir la configuration d'un statut
 *
 * @param status - Statut de la demande d'enlèvement
 * @returns Configuration complète du statut
 *
 * @example
 * ```tsx
 * const config = getPickupStatusConfig(PickupStatus.REQUESTED);
 * <Badge className={config.color}>{config.label}</Badge>
 * ```
 */
export function getPickupStatusConfig(status: PickupStatus): PickupStatusConfig {
  return PICKUP_STATUS_CONFIG[status];
}

/**
 * Obtenir le libellé français d'un statut
 *
 * @param status - Statut de la demande
 * @returns Libellé en français
 *
 * @example
 * ```tsx
 * getPickupStatusLabel(PickupStatus.REQUESTED) // "Nouveau"
 * ```
 */
export function getPickupStatusLabel(status: PickupStatus): string {
  return PICKUP_STATUS_CONFIG[status].label;
}

/**
 * Obtenir la classe de couleur pour un badge
 *
 * @param status - Statut de la demande
 * @returns Classe Tailwind pour le badge
 *
 * @example
 * ```tsx
 * <Badge className={getPickupStatusColor(PickupStatus.COMPLETED)}>
 *   Effectué
 * </Badge>
 * ```
 */
export function getPickupStatusColor(status: PickupStatus): string {
  return PICKUP_STATUS_CONFIG[status].color;
}

/**
 * Vérifier si un statut est terminal (non modifiable)
 *
 * @param status - Statut à vérifier
 * @returns true si le statut est terminal (COMPLETED ou CANCELED)
 */
export function isPickupStatusTerminal(status: PickupStatus): boolean {
  return status === PickupStatus.COMPLETED || status === PickupStatus.CANCELED;
}

/**
 * Obtenir les statuts suivants possibles depuis un statut donné
 * (pour gestion du workflow)
 *
 * @param currentStatus - Statut actuel
 * @returns Liste des statuts suivants autorisés
 *
 * @example
 * ```tsx
 * getNextPickupStatuses(PickupStatus.REQUESTED)
 * // [PickupStatus.SCHEDULED, PickupStatus.CANCELED]
 * ```
 */
export function getNextPickupStatuses(currentStatus: PickupStatus): PickupStatus[] {
  const transitions: Record<PickupStatus, PickupStatus[]> = {
    REQUESTED: [PickupStatus.SCHEDULED, PickupStatus.CANCELED],
    SCHEDULED: [PickupStatus.IN_PROGRESS, PickupStatus.CANCELED],
    IN_PROGRESS: [PickupStatus.COMPLETED, PickupStatus.CANCELED],
    COMPLETED: [], // Terminal
    CANCELED: [], // Terminal
  };

  return transitions[currentStatus] || [];
}

/**
 * Mapper les statuts pour les filtres (regroupe SCHEDULED et IN_PROGRESS)
 *
 * @returns Options de filtre avec comptages cohérents
 */
export function getPickupStatusFilterOptions() {
  return [
    { value: 'ALL', label: 'Tous les statuts' },
    {
      value: PickupStatus.REQUESTED,
      label: PICKUP_STATUS_CONFIG[PickupStatus.REQUESTED].label,
      color: PICKUP_STATUS_CONFIG[PickupStatus.REQUESTED].color,
    },
    {
      value: 'IN_CHARGE', // Groupe SCHEDULED + IN_PROGRESS
      label: 'Prise en charge',
      color: PICKUP_STATUS_CONFIG[PickupStatus.SCHEDULED].color,
    },
    {
      value: PickupStatus.COMPLETED,
      label: PICKUP_STATUS_CONFIG[PickupStatus.COMPLETED].label,
      color: PICKUP_STATUS_CONFIG[PickupStatus.COMPLETED].color,
    },
    {
      value: PickupStatus.CANCELED,
      label: PICKUP_STATUS_CONFIG[PickupStatus.CANCELED].label,
      color: PICKUP_STATUS_CONFIG[PickupStatus.CANCELED].color,
    },
  ];
}
