/**
 * Composant Client : Liste des Pickups avec Filtres
 *
 * Composant client qui enveloppe PickupFilters et PickupListTable
 * pour gérer la navigation avec les paramètres d'URL.
 */

'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PickupFilters, type PickupFilters as PickupFiltersType } from './pickup-filters';
import { PickupListTable } from './pickup-list-table';

// ============================================
// TYPES
// ============================================

interface PickupsListClientProps {
  pickups: any[];
  filters: PickupFiltersType;
  userRole: string;
  currentPage: number;
  totalPages: number;
  total: number;
}

// ============================================
// HELPER
// ============================================

/**
 * Construit l'URL avec les filtres
 */
function buildFilterUrl(filters: PickupFiltersType, page?: number): string {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.statuses && filters.statuses.length > 0) {
    params.set('statuses', filters.statuses.join(','));
  }
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.onlyUnattached) params.set('onlyUnattached', 'true');
  if (filters.onlyWithDriver) params.set('onlyWithDriver', 'true');
  if (filters.timeSlot) params.set('timeSlot', filters.timeSlot);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (page && page > 1) params.set('page', page.toString());

  const queryString = params.toString();
  return `/dashboard/pickups${queryString ? `?${queryString}` : ''}`;
}

// ============================================
// COMPOSANT
// ============================================

/**
 * Composant client pour afficher la liste des pickups avec filtres
 */
export function PickupsListClient({
  pickups,
  filters,
  userRole,
  currentPage,
  totalPages,
  total,
}: PickupsListClientProps) {
  const router = useRouter();

  /**
   * Handler pour les changements de filtres
   * Navigue vers la nouvelle URL avec les filtres mis à jour
   */
  const handleFiltersChange = (newFilters: PickupFiltersType) => {
    const url = buildFilterUrl(newFilters, 1); // Reset page to 1 on filter change
    router.push(url);
  };

  /**
   * Handler pour réinitialiser les filtres
   */
  const handleReset = () => {
    router.push('/dashboard/pickups');
  };

  /**
   * Handler pour changer de page
   */
  const handlePageChange = (page: number) => {
    const url = buildFilterUrl(filters, page);
    router.push(url);
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>
            Affinez votre recherche avec les filtres ci-dessous
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* compact={true} : affiche uniquement la barre de recherche par défaut,
              les autres filtres sont accessibles via "Recherche détaillée" */}
          <PickupFilters
            initialValues={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleReset}
            compact={true}
          />
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle>Demandes d&apos;enlèvement</CardTitle>
          <CardDescription>
            {total} demande{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PickupListTable
            pickups={pickups}
            userRole={userRole}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
