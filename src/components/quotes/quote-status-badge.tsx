/**
 * Composant Badge de Statut pour les Devis (Quote)
 *
 * Affiche le statut d'un devis avec une icône et une couleur
 * correspondant à l'état actuel du workflow.
 *
 * Workflow des statuts :
 * DRAFT → SUBMITTED → SENT → ACCEPTED → IN_TREATMENT → VALIDATED
 * Ou alternativement : * → REJECTED | CANCELLED | EXPIRED
 *
 * @example
 * ```tsx
 * <QuoteStatusBadge status="ACCEPTED" />
 * <QuoteStatusBadge status={quote.status} />
 * ```
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { QuoteStatus } from '@/lib/db/enums';
import {
  Clock,
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Hourglass,
  FileCheck,
  Ban,
} from 'lucide-react';

// ============================================
// CONFIGURATION DES STATUTS
// ============================================

/**
 * Configuration d'affichage pour chaque statut de devis
 *
 * - label : Texte affiché en français
 * - variant : Style du badge (shadcn/ui)
 * - icon : Icône Lucide associée
 */
const QUOTE_STATUS_CONFIG: Record<
  QuoteStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof Clock;
  }
> = {
  // Statuts de progression
  DRAFT: {
    label: 'Brouillon',
    variant: 'secondary',
    icon: Clock,
  },
  SUBMITTED: {
    label: 'Soumis',        // Nouveau : soumis par le client, en attente d'offre agent
    variant: 'outline',
    icon: Send,
  },
  SENT: {
    label: 'Offre envoyée', // Renommé : offre formelle envoyée par l'agent
    variant: 'outline',
    icon: Mail,
  },
  ACCEPTED: {
    label: 'Accepté',
    variant: 'default',
    icon: CheckCircle,
  },
  IN_TREATMENT: {
    label: 'En traitement',
    variant: 'outline',
    icon: Hourglass,
  },
  VALIDATED: {
    label: 'Validé',
    variant: 'default',
    icon: FileCheck,
  },

  // Statuts de fin négatifs
  REJECTED: {
    label: 'Refusé',
    variant: 'destructive',
    icon: XCircle,
  },
  EXPIRED: {
    label: 'Expiré',
    variant: 'secondary',
    icon: Clock,
  },
  CANCELLED: {
    label: 'Annulé',
    variant: 'destructive',
    icon: Ban,
  },
};

// ============================================
// COMPOSANTS
// ============================================

interface QuoteStatusBadgeProps {
  /** Statut du devis à afficher */
  status: QuoteStatus;
  /** Classes CSS additionnelles */
  className?: string;
  /** Afficher ou non l'icône (défaut: true) */
  showIcon?: boolean;
}

/**
 * Badge de statut avec icône pour les devis
 *
 * Utilise la configuration QUOTE_STATUS_CONFIG pour déterminer
 * le label, la couleur et l'icône selon le statut.
 */
export function QuoteStatusBadge({
  status,
  className,
  showIcon = true,
}: QuoteStatusBadgeProps) {
  // Récupérer la config ou utiliser un fallback
  const config = QUOTE_STATUS_CONFIG[status] || {
    label: status,
    variant: 'secondary' as const,
    icon: Clock,
  };

  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1.5 ${className || ''}`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
    </Badge>
  );
}

/**
 * Badge de statut sans icône (version compacte)
 */
export function QuoteStatusBadgeCompact({
  status,
  className,
}: Omit<QuoteStatusBadgeProps, 'showIcon'>) {
  return <QuoteStatusBadge status={status} className={className} showIcon={false} />;
}

/**
 * Export de la configuration pour utilisation externe
 * (ex: dans les timelines pour les couleurs)
 */
export { QUOTE_STATUS_CONFIG };
