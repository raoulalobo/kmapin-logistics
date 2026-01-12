/**
 * Composant Badge de Statut pour les Demandes d'Enlèvement
 *
 * Affiche le statut d'une demande avec un code couleur approprié
 * Utilisé dans les listes, tableaux et pages de détails
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { PickupStatus } from '@/lib/db/enums';
import { cn } from '@/lib/utils';

/**
 * Configuration des badges par statut
 */
const STATUS_CONFIG: Record<
  PickupStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  }
> = {
  [PickupStatus.NOUVEAU]: {
    label: 'Nouveau',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  [PickupStatus.PRISE_EN_CHARGE]: {
    label: 'Prise en charge',
    variant: 'secondary',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
  [PickupStatus.EFFECTUE]: {
    label: 'Effectué',
    variant: 'outline',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  [PickupStatus.ANNULE]: {
    label: 'Annulé',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
};

interface PickupStatusBadgeProps {
  status: PickupStatus;
  className?: string;
}

/**
 * Badge affichant le statut d'une demande d'enlèvement
 *
 * @param status - Statut de la demande
 * @param className - Classes CSS additionnelles
 *
 * @example
 * ```tsx
 * <PickupStatusBadge status={PickupStatus.NOUVEAU} />
 * <PickupStatusBadge status={pickup.status} className="text-sm" />
 * ```
 */
export function PickupStatusBadge({
  status,
  className,
}: PickupStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

/**
 * Petite variante du badge (pour tableaux compacts)
 */
export function PickupStatusBadgeSmall({
  status,
  className,
}: PickupStatusBadgeProps) {
  return (
    <PickupStatusBadge
      status={status}
      className={cn('text-xs px-2 py-0.5', className)}
    />
  );
}

/**
 * Badge avec icône (pour pages de détails)
 */
export function PickupStatusBadgeWithIcon({
  status,
  className,
}: PickupStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  // Icônes selon le statut
  const Icon = () => {
    switch (status) {
      case PickupStatus.NOUVEAU:
        return (
          <svg
            className="w-3 h-3 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
      case PickupStatus.PRISE_EN_CHARGE:
        return (
          <svg
            className="w-3 h-3 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
          </svg>
        );
      case PickupStatus.EFFECTUE:
        return (
          <svg
            className="w-3 h-3 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case PickupStatus.ANNULE:
        return (
          <svg
            className="w-3 h-3 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, 'flex items-center', className)}
    >
      <Icon />
      {config.label}
    </Badge>
  );
}
