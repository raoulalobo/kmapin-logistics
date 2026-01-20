/**
 * Composant Badge de Statut pour les Expéditions (Shipment)
 *
 * Affiche le statut d'une expédition avec une icône et une couleur
 * correspondant à l'état actuel du workflow logistique.
 *
 * Workflow des statuts :
 * DRAFT → PENDING_APPROVAL → APPROVED → PICKED_UP → IN_TRANSIT →
 * AT_CUSTOMS → CUSTOMS_CLEARED → OUT_FOR_DELIVERY → DELIVERED
 *
 * Statuts alternatifs : CANCELLED, ON_HOLD, EXCEPTION, READY_FOR_PICKUP
 *
 * @example
 * ```tsx
 * <ShipmentStatusBadge status="IN_TRANSIT" />
 * <ShipmentStatusBadge status={shipment.status} showIcon={false} />
 * ```
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { ShipmentStatus } from '@/lib/db/enums';
import {
  Clock,
  FileText,
  CheckCircle,
  Truck,
  Plane,
  Package,
  ShieldCheck,
  MapPin,
  XCircle,
  PauseCircle,
  AlertTriangle,
  Building2,
} from 'lucide-react';

// ============================================
// CONFIGURATION DES STATUTS
// ============================================

/**
 * Configuration d'affichage pour chaque statut d'expédition
 *
 * - label : Texte affiché en français
 * - variant : Style du badge (shadcn/ui)
 * - icon : Icône Lucide associée
 * - bgClass : Classe de fond personnalisée (optionnel)
 */
const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof Clock;
    bgClass?: string;
  }
> = {
  // ══════════════════════════════════════════
  // STATUTS DE PROGRESSION (workflow normal)
  // ══════════════════════════════════════════

  /**
   * Brouillon - Expédition créée mais pas encore soumise
   */
  DRAFT: {
    label: 'Brouillon',
    variant: 'secondary',
    icon: FileText,
  },

  /**
   * En attente d'approbation - Soumise, en cours de validation
   */
  PENDING_APPROVAL: {
    label: 'En attente',
    variant: 'outline',
    icon: Clock,
  },

  /**
   * Approuvée - Validée, prête pour enlèvement
   */
  APPROVED: {
    label: 'Approuvée',
    variant: 'default',
    icon: CheckCircle,
  },

  /**
   * Enlevée - Colis récupéré chez l'expéditeur
   */
  PICKED_UP: {
    label: 'Enlevée',
    variant: 'default',
    icon: Package,
    bgClass: 'bg-blue-500 hover:bg-blue-600',
  },

  /**
   * En transit - En cours d'acheminement
   */
  IN_TRANSIT: {
    label: 'En transit',
    variant: 'default',
    icon: Truck,
    bgClass: 'bg-indigo-500 hover:bg-indigo-600',
  },

  /**
   * En douane - En cours de dédouanement
   */
  AT_CUSTOMS: {
    label: 'En douane',
    variant: 'outline',
    icon: Building2,
  },

  /**
   * Dédouanée - Formalités douanières terminées
   */
  CUSTOMS_CLEARED: {
    label: 'Dédouanée',
    variant: 'default',
    icon: ShieldCheck,
    bgClass: 'bg-cyan-500 hover:bg-cyan-600',
  },

  /**
   * En cours de livraison - Dernier kilomètre
   */
  OUT_FOR_DELIVERY: {
    label: 'En livraison',
    variant: 'default',
    icon: Truck,
    bgClass: 'bg-purple-500 hover:bg-purple-600',
  },

  /**
   * Disponible au retrait - Au point relais
   */
  READY_FOR_PICKUP: {
    label: 'À retirer',
    variant: 'outline',
    icon: MapPin,
  },

  /**
   * Livrée - Livraison terminée avec succès
   */
  DELIVERED: {
    label: 'Livrée',
    variant: 'default',
    icon: CheckCircle,
    bgClass: 'bg-green-500 hover:bg-green-600',
  },

  // ══════════════════════════════════════════
  // STATUTS EXCEPTIONNELS
  // ══════════════════════════════════════════

  /**
   * Annulée - Expédition annulée
   */
  CANCELLED: {
    label: 'Annulée',
    variant: 'destructive',
    icon: XCircle,
  },

  /**
   * En attente - Mise en pause temporaire
   */
  ON_HOLD: {
    label: 'En pause',
    variant: 'secondary',
    icon: PauseCircle,
  },

  /**
   * Exception - Problème nécessitant une intervention
   */
  EXCEPTION: {
    label: 'Exception',
    variant: 'destructive',
    icon: AlertTriangle,
  },
};

// ============================================
// COMPOSANTS
// ============================================

interface ShipmentStatusBadgeProps {
  /** Statut de l'expédition à afficher */
  status: ShipmentStatus;
  /** Classes CSS additionnelles */
  className?: string;
  /** Afficher ou non l'icône (défaut: true) */
  showIcon?: boolean;
}

/**
 * Badge de statut avec icône pour les expéditions
 *
 * Utilise la configuration SHIPMENT_STATUS_CONFIG pour déterminer
 * le label, la couleur et l'icône selon le statut.
 *
 * @example
 * ```tsx
 * // Avec icône (défaut)
 * <ShipmentStatusBadge status="IN_TRANSIT" />
 *
 * // Sans icône
 * <ShipmentStatusBadge status="DELIVERED" showIcon={false} />
 *
 * // Avec classes personnalisées
 * <ShipmentStatusBadge status="PENDING_APPROVAL" className="text-sm" />
 * ```
 */
export function ShipmentStatusBadge({
  status,
  className,
  showIcon = true,
}: ShipmentStatusBadgeProps) {
  // Récupérer la config ou utiliser un fallback pour les statuts inconnus
  const config = SHIPMENT_STATUS_CONFIG[status] || {
    label: status,
    variant: 'secondary' as const,
    icon: Clock,
  };

  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1.5 ${config.bgClass || ''} ${className || ''}`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
    </Badge>
  );
}

/**
 * Badge de statut sans icône (version compacte)
 *
 * Utile dans les tableaux ou espaces restreints.
 */
export function ShipmentStatusBadgeCompact({
  status,
  className,
}: Omit<ShipmentStatusBadgeProps, 'showIcon'>) {
  return (
    <ShipmentStatusBadge status={status} className={className} showIcon={false} />
  );
}

/**
 * Export de la configuration pour utilisation externe
 * (ex: dans les timelines pour les couleurs, filtres, etc.)
 */
export { SHIPMENT_STATUS_CONFIG };
