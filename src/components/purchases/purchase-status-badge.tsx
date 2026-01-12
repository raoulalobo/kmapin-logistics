/**
 * Composant Badge de Statut pour les Demandes d'Achat Délégué
 *
 * Affiche le statut d'une demande avec un code couleur approprié
 * Utilisé dans les listes, tableaux et pages de détails
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { PurchaseStatus } from '@/lib/db/enums';
import { cn } from '@/lib/utils';

/**
 * Configuration des badges par statut
 */
const STATUS_CONFIG: Record<
  PurchaseStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  }
> = {
  [PurchaseStatus.NOUVEAU]: {
    label: 'Nouveau',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  [PurchaseStatus.EN_COURS]: {
    label: 'En cours',
    variant: 'secondary',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
  [PurchaseStatus.LIVRE]: {
    label: 'Livré',
    variant: 'outline',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  [PurchaseStatus.ANNULE]: {
    label: 'Annulé',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
};

interface PurchaseStatusBadgeProps {
  status: PurchaseStatus;
  className?: string;
}

/**
 * Badge affichant le statut d'une demande d'achat
 *
 * @param status - Statut de la demande
 * @param className - Classes CSS additionnelles
 *
 * @example
 * ```tsx
 * <PurchaseStatusBadge status={PurchaseStatus.NOUVEAU} />
 * <PurchaseStatusBadge status={purchase.status} className="text-sm" />
 * ```
 */
export function PurchaseStatusBadge({
  status,
  className,
}: PurchaseStatusBadgeProps) {
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
export function PurchaseStatusBadgeSmall({
  status,
  className,
}: PurchaseStatusBadgeProps) {
  return (
    <PurchaseStatusBadge
      status={status}
      className={cn('text-xs px-2 py-0.5', className)}
    />
  );
}

/**
 * Badge avec icône (pour pages de détails)
 */
export function PurchaseStatusBadgeWithIcon({
  status,
  className,
}: PurchaseStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  // Icônes selon le statut
  const Icon = () => {
    switch (status) {
      case PurchaseStatus.NOUVEAU:
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
      case PurchaseStatus.EN_COURS:
        return (
          <svg
            className="w-3 h-3 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
        );
      case PurchaseStatus.LIVRE:
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
      case PurchaseStatus.ANNULE:
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
