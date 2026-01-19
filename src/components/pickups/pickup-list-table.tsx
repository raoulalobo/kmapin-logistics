/**
 * Composant Table de Liste pour les Demandes d'Enlèvement
 *
 * Affiche la liste des demandes avec tri, pagination et actions
 * User Story US-3.1 : Liste back-office avec filtres et actions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PickupStatus, UserRole } from '@/lib/db/enums';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  ArrowUpDown,
  ExternalLink,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PickupStatusBadgeSmall } from './pickup-status-badge';
import { PickupActionsMenu } from './pickup-actions-menu';

// ============================================
// TYPES
// ============================================

/**
 * Demande pour affichage tableau
 */
interface PickupListItem {
  id: string;
  trackingNumber: string;
  status: PickupStatus;

  contactName: string | null;
  contactEmail: string;
  contactPhone: string;

  pickupAddress: string;
  pickupCity: string;
  pickupPostalCode: string;

  requestedDate: Date;
  scheduledDate: Date | null;

  isAttachedToAccount: boolean;
  userId: string | null;

  // Informations chauffeur (on ne gère plus les transporteurs comme entité)
  driverName: string | null;

  shipmentId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

interface PickupListTableProps {
  pickups: PickupListItem[];
  userRole: UserRole;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Formatte une date courte
 */
function formatShortDate(date: Date | null | undefined): string {
  if (!date) return '-';
  return format(date, 'dd/MM/yy', { locale: fr });
}

/**
 * Formatte une adresse courte
 */
function formatShortAddress(address: string, city: string, postalCode: string): string {
  // Tronquer l'adresse si trop longue
  const shortAddress = address.length > 30 ? `${address.substring(0, 30)}...` : address;
  return `${shortAddress}, ${city}`;
}

// ============================================
// COMPOSANTS
// ============================================

/**
 * Composant de pagination
 */
function TablePagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}) {
  if (!onPageChange || totalPages <= 1) return null;

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between border-t px-6 py-4">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} sur {totalPages}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">Première page</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Page précédente</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Page suivante</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Dernière page</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * En-tête de colonne triable
 */
function SortableHeader({
  column,
  label,
  onSort,
}: {
  column: string;
  label: string;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
}) {
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  if (!onSort) {
    return <span>{label}</span>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-3"
      onClick={() => {
        const newDirection = direction === 'asc' ? 'desc' : 'asc';
        setDirection(newDirection);
        onSort(column, newDirection);
      }}
    >
      <span>{label}</span>
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  );
}

/**
 * État vide
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="h-16 w-16 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Aucune demande d&apos;enlèvement
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Il n&apos;y a aucune demande correspondant à vos critères de recherche.
      </p>
    </div>
  );
}

/**
 * État de chargement
 */
function LoadingState() {
  return (
    <div className="py-12 text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      <p className="mt-4 text-sm text-muted-foreground">Chargement...</p>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Tableau de liste des demandes d'enlèvement
 *
 * @param pickups - Liste des demandes à afficher
 * @param userRole - Rôle de l'utilisateur (pour permissions actions)
 * @param currentPage - Page actuelle (pagination)
 * @param totalPages - Nombre total de pages
 * @param onPageChange - Callback de changement de page
 * @param onSort - Callback de tri par colonne
 * @param isLoading - État de chargement
 * @param compact - Mode compact (sans card wrapper)
 * @param className - Classes CSS additionnelles
 *
 * @example
 * ```tsx
 * <PickupListTable
 *   pickups={pickupsList}
 *   userRole={session.user.role}
 *   currentPage={1}
 *   totalPages={5}
 *   onPageChange={(page) => fetchPickups(page)}
 *   onSort={(column, direction) => fetchPickups(1, column, direction)}
 * />
 * ```
 */
export function PickupListTable({
  pickups,
  userRole,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onSort,
  isLoading = false,
  compact = false,
  className,
}: PickupListTableProps) {
  const router = useRouter();

  // Navigation vers les détails
  const handleRowClick = (pickupId: string) => {
    router.push(`/dashboard/pickups/${pickupId}`);
  };

  // Rendu du contenu
  const renderContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (pickups.length === 0) {
      return <EmptyState />;
    }

    return (
      <>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">
                  <SortableHeader
                    column="trackingNumber"
                    label="N° Suivi"
                    onSort={onSort}
                  />
                </TableHead>

                <TableHead>
                  <SortableHeader column="status" label="Statut" onSort={onSort} />
                </TableHead>

                <TableHead>Contact</TableHead>

                <TableHead>Adresse</TableHead>

                <TableHead className="w-[100px]">
                  <SortableHeader
                    column="requestedDate"
                    label="Date"
                    onSort={onSort}
                  />
                </TableHead>

                <TableHead className="w-[120px]">Infos</TableHead>

                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pickups.map((pickup) => (
                <TableRow
                  key={pickup.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(pickup.id)}
                >
                  {/* Numéro de suivi */}
                  <TableCell className="font-mono text-sm">
                    {pickup.trackingNumber}
                  </TableCell>

                  {/* Statut */}
                  <TableCell>
                    <PickupStatusBadgeSmall status={pickup.status} />
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        {pickup.contactName || 'Contact'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {pickup.contactEmail}
                      </p>
                    </div>
                  </TableCell>

                  {/* Adresse */}
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-[250px]">
                      <p className="truncate">
                        {formatShortAddress(
                          pickup.pickupAddress,
                          pickup.pickupCity,
                          pickup.pickupPostalCode
                        )}
                      </p>
                    </div>
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">
                        {formatShortDate(pickup.scheduledDate || pickup.requestedDate)}
                      </p>
                      {pickup.scheduledDate && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 border-green-200"
                        >
                          Confirmée
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Infos additionnelles */}
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      {pickup.isAttachedToAccount ? (
                        <div className="flex items-center text-xs text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span>Rattaché</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-xs text-gray-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          <span>Invité</span>
                        </div>
                      )}

                      {pickup.driverName && (
                        <div className="flex items-center text-xs text-blue-600">
                          <Package className="h-3 w-3 mr-1" />
                          <span className="truncate max-w-[100px]">
                            {pickup.driverName}
                          </span>
                        </div>
                      )}

                      {pickup.shipmentId && (
                        <div className="flex items-center text-xs text-purple-600">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          <span>Expédition</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PickupActionsMenu
                      pickupId={pickup.id}
                      currentStatus={pickup.status}
                      userRole={userRole}
                      compact={true}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </>
    );
  };

  // Mode compact sans card wrapper
  if (compact) {
    return <div className={className}>{renderContent()}</div>;
  }

  // Mode complet avec card
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Demandes d&apos;enlèvement</span>
        </CardTitle>
        <CardDescription>
          {pickups.length} demande{pickups.length > 1 ? 's' : ''} trouvée
          {pickups.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">{renderContent()}</CardContent>
    </Card>
  );
}
