/**
 * Composant : DepotBadge
 *
 * Badge compact affichant le nom et le code d'un dépôt.
 * Utilisé dans les pages de détail (devis, expéditions) pour indiquer
 * le dépôt associé.
 *
 * @param name - Nom du dépôt
 * @param code - Code court du dépôt (ex: "OUA-01")
 */

import { Warehouse } from '@phosphor-icons/react/dist/ssr';
import { Badge } from '@/components/ui/badge';

interface DepotBadgeProps {
  name: string;
  code: string;
}

export function DepotBadge({ name, code }: DepotBadgeProps) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <Warehouse className="h-3 w-3" />
      <span className="font-mono text-xs">{code}</span>
      <span>-</span>
      <span>{name}</span>
    </Badge>
  );
}
