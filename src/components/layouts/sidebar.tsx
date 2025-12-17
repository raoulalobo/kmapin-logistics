/**
 * Composant : Sidebar
 *
 * Navigation latérale pour le dashboard avec organisation des modules
 * par catégories et support du responsive (mobile + desktop)
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Package,
  MapPin,
  Users,
  UserCog,
  Truck,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  LayoutDashboard,
  FileSpreadsheet,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { hasPermission } from '@/lib/auth/permissions-client';
import type { UserRole } from '@/generated/prisma';

/**
 * Type pour un lien de navigation
 */
type NavLink = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string; // Pour afficher un badge (ex: nombre de notifications)
  permission?: string; // Permission requise pour afficher ce lien (optionnel)
};

/**
 * Type pour une section de navigation
 */
type NavSection = {
  title: string;
  links: NavLink[];
};

/**
 * Configuration de la navigation
 * Organisation hiérarchique des modules de l'application
 */
const navigation: NavSection[] = [
  {
    title: 'Principal',
    links: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        // Pas de permission requise - accessible à tous
      },
    ],
  },
  {
    title: 'Opérations',
    links: [
      {
        label: 'Expéditions',
        href: '/dashboard/shipments',
        icon: Package,
        permission: 'shipments:read', // Utilisera aussi shipments:read:own pour les CLIENTs
      },
      {
        label: 'Tracking',
        href: '/dashboard/tracking',
        icon: MapPin,
        permission: 'tracking:read',
      },
      {
        label: 'Transporteurs',
        href: '/dashboard/transporters',
        icon: Truck,
        permission: 'transporters:read',
      },
    ],
  },
  {
    title: 'Commercial',
    links: [
      {
        label: 'Clients',
        href: '/dashboard/clients',
        icon: Users,
        permission: 'clients:read', // Seulement ADMIN, OPERATIONS_MANAGER, FINANCE_MANAGER, VIEWER
      },
      {
        label: 'Devis',
        href: '/dashboard/quotes',
        icon: FileSpreadsheet,
        permission: 'quotes:read',
      },
      {
        label: 'Factures',
        href: '/dashboard/invoices',
        icon: CreditCard,
        permission: 'invoices:read',
      },
    ],
  },
  {
    title: 'Gestion',
    links: [
      {
        label: 'Utilisateurs',
        href: '/dashboard/users',
        icon: UserCog,
        // Pas de permission - réservé aux ADMIN via wildcard '*'
      },
      {
        label: 'Documents',
        href: '/dashboard/documents',
        icon: FileText,
        permission: 'documents:read',
      },
      {
        label: 'Rapports',
        href: '/dashboard/reports',
        icon: BarChart3,
        permission: 'reports:read',
      },
      {
        label: 'Paramètres',
        href: '/dashboard/settings',
        icon: Settings,
        // Pas de permission - accessible à tous (paramètres personnels)
      },
    ],
  },
];

/**
 * Props du composant Sidebar
 */
interface SidebarProps {
  className?: string;
  userRole?: UserRole; // Rôle de l'utilisateur pour filtrer les liens selon les permissions
}

/**
 * Composant Sidebar
 *
 * Barre de navigation latérale avec organisation par sections
 * Gère l'état actif des liens et le scroll
 * Filtre les liens selon les permissions de l'utilisateur
 */
export function Sidebar({ className, userRole = 'CLIENT' }: SidebarProps) {
  const pathname = usePathname();

  /**
   * Filtrer les liens selon les permissions de l'utilisateur
   * Un lien est affiché si :
   * - Il n'a pas de permission requise (accessible à tous)
   * - L'utilisateur a la permission exacte
   * - L'utilisateur a la permission avec scope :own (pour les CLIENTs)
   */
  const filterLinksByPermission = (links: NavLink[]): NavLink[] => {
    return links.filter((link) => {
      // Si pas de permission requise, afficher le lien
      if (!link.permission) return true;

      // Vérifier la permission exacte
      if (hasPermission(userRole, link.permission)) return true;

      // Vérifier la permission avec scope :own (pour les CLIENTs)
      if (hasPermission(userRole, `${link.permission}:own`)) return true;

      return false;
    });
  };

  /**
   * Filtrer les sections : ne garder que les sections avec au moins un lien visible
   */
  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      links: filterLinksByPermission(section.links),
    }))
    .filter((section) => section.links.length > 0);

  return (
    <div className={cn('flex h-full flex-col border-r bg-background', className)}>
      {/* Logo et titre */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </div>
          <span className="text-lg">KmapIn</span>
        </Link>
      </div>

      {/* Navigation avec scroll */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4 py-4">
          {filteredNavigation.map((section) => (
            <div key={section.title} className="space-y-1">
              {/* Titre de section */}
              <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h4>

              {/* Liens de la section */}
              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{link.label}</span>
                    {link.badge && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Séparateur entre sections (sauf la dernière) */}
              {section !== navigation[navigation.length - 1] && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer sidebar (optionnel - version, support, etc.) */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          v1.0.0
        </p>
      </div>
    </div>
  );
}
