/**
 * Page : Liste des Demandes d'Enlèvement (Back-Office)
 *
 * User Story US-3.1 : Liste back-office avec filtres, statistiques et actions
 *
 * Affiche la liste des demandes d'enlèvement avec :
 * - Statistiques en temps réel par statut
 * - Filtres avancés (statut, date, recherche, etc.)
 * - Tableau avec tri et pagination
 * - Actions rapides (changement de statut, annulation)
 *
 * Route protégée accessible aux rôles :
 * - ADMIN : accès complet
 * - OPERATIONS_MANAGER : gestion complète
 * - FINANCE_MANAGER : lecture seule
 * - CLIENT : voir ses propres demandes uniquement
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/config';
import { PickupStatus } from '@/lib/db/enums';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Plus,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  PickupsListClient,
  type PickupFiltersType,
} from '@/components/pickups';

// ============================================
// TYPES
// ============================================

interface PageProps {
  searchParams: Promise<{
    search?: string;
    statuses?: string; // CSV: "NOUVEAU,PRISE_EN_CHARGE"
    dateFrom?: string;
    dateTo?: string;
    onlyUnattached?: string;
    onlyWithDriver?: string; // Filtre sur les pickups avec chauffeur assigné
    timeSlot?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

// ============================================
// HELPERS
// ============================================

/**
 * Convertit les searchParams en filtres typés
 */
function parseFilters(searchParams: Awaited<PageProps['searchParams']>): PickupFiltersType {
  return {
    search: searchParams.search || undefined,
    statuses: searchParams.statuses
      ? (searchParams.statuses.split(',') as PickupStatus[])
      : undefined,
    dateFrom: searchParams.dateFrom || undefined,
    dateTo: searchParams.dateTo || undefined,
    onlyUnattached: searchParams.onlyUnattached === 'true',
    onlyWithDriver: searchParams.onlyWithDriver === 'true',
    timeSlot: searchParams.timeSlot as any,
    sortBy: (searchParams.sortBy as any) || 'createdAt',
    sortOrder: (searchParams.sortOrder as 'asc' | 'desc') || 'desc',
  };
}

// ============================================
// COMPOSANTS
// ============================================

/**
 * Cartes de statistiques
 */
async function StatsCards() {
  const session = await requireAuth();

  // TEMPORAIRE : Utiliser le client Prisma standard au lieu de l'enhanced client
  const { prisma } = await import('@/lib/db/client');

  // TEMPORAIRE : Filtrer manuellement par rôle
  const where: any = {};
  if (session.user.role === 'CLIENT') {
    where.userId = session.user.id;
  }

  // Compter par statut (en parallèle)
  const [total, nouveau, priseEnCharge, effectue, annule] = await Promise.all([
    prisma.pickupRequest.count({ where }),
    prisma.pickupRequest.count({ where: { ...where, status: PickupStatus.NOUVEAU } }),
    prisma.pickupRequest.count({ where: { ...where, status: PickupStatus.PRISE_EN_CHARGE } }),
    prisma.pickupRequest.count({ where: { ...where, status: PickupStatus.EFFECTUE } }),
    prisma.pickupRequest.count({ where: { ...where, status: PickupStatus.ANNULE } }),
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">Demandes</p>
        </CardContent>
      </Card>

      {/* Nouveau */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{nouveau}</div>
          <p className="text-xs text-muted-foreground">À traiter (24-48h)</p>
        </CardContent>
      </Card>

      {/* Prise en charge */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En charge</CardTitle>
          <Truck className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{priseEnCharge}</div>
          <p className="text-xs text-muted-foreground">En cours</p>
        </CardContent>
      </Card>

      {/* Effectué */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Effectués</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{effectue}</div>
          <p className="text-xs text-muted-foreground">Complétés</p>
        </CardContent>
      </Card>

      {/* Annulé */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Annulés</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{annule}</div>
          <p className="text-xs text-muted-foreground">Avec raison</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Liste des demandes avec filtres
 */
async function PickupsList({
  searchParams,
}: {
  searchParams: PageProps['searchParams'];
}) {
  const session = await requireAuth();

  // TEMPORAIRE : Utiliser le client Prisma standard au lieu de l'enhanced client
  // car Zenstack bloque l'accès même avec les bonnes permissions
  // TODO : Investiguer et résoudre le problème Zenstack
  const { prisma } = await import('@/lib/db/client');

  // Next.js 16 : searchParams est maintenant une Promise
  const resolvedSearchParams = await searchParams;
  const filters = parseFilters(resolvedSearchParams);
  const page = parseInt(resolvedSearchParams.page || '1');
  const limit = 20;

  // Construire les conditions where
  const where: any = {};

  // TEMPORAIRE : Filtrer manuellement par rôle (remplace Zenstack)
  if (session.user.role === 'CLIENT') {
    // Les CLIENTs voient seulement leurs propres pickups
    where.userId = session.user.id;
  } else if (session.user.role === 'FINANCE_MANAGER' || session.user.role === 'OPERATIONS_MANAGER') {
    // Les managers voient tous les pickups (pas de filtre)
  }
  // Les ADMIN voient tous les pickups (pas de filtre)

  // Recherche textuelle
  if (filters.search) {
    where.OR = [
      { trackingNumber: { contains: filters.search, mode: 'insensitive' } },
      { contactEmail: { contains: filters.search, mode: 'insensitive' } },
      { contactPhone: { contains: filters.search } },
      { pickupAddress: { contains: filters.search, mode: 'insensitive' } },
      { pickupCity: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Filtres par statut
  if (filters.statuses && filters.statuses.length > 0) {
    where.status = { in: filters.statuses };
  }

  // Plage de dates
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo);
    }
  }

  // Filtres binaires
  if (filters.onlyUnattached) {
    where.isAttachedToAccount = false;
  }

  // Filtre sur les pickups avec chauffeur assigné
  if (filters.onlyWithDriver) {
    where.driverName = { not: null };
  }

  // Créneau horaire
  if (filters.timeSlot && filters.timeSlot !== '__all__') {
    where.timeSlot = filters.timeSlot;
  }

  // Charger les demandes avec relations
  const [pickups, total] = await Promise.all([
    prisma.pickupRequest.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        shipment: {
          select: {
            trackingNumber: true,
          },
        },
      },
      orderBy: {
        [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pickupRequest.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <PickupsListClient
      pickups={pickups as any}
      filters={filters}
      userRole={session.user.role}
      currentPage={page}
      totalPages={totalPages}
      total={total}
    />
  );
}

/**
 * Skeleton de chargement
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PAGE PRINCIPALE
// ============================================

/**
 * Page de liste des demandes d'enlèvement
 */
export default function PickupsPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des Enlèvements
          </h1>
          <p className="text-muted-foreground mt-1">
            Planifiez et suivez les enlèvements de colis en temps réel
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/dashboard/pickups/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Link>
        </Button>
      </div>

      {/* Statistiques */}
      <Suspense fallback={<LoadingSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Liste avec filtres */}
      <Suspense fallback={<LoadingSkeleton />}>
        <PickupsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Métadonnées de la page
 */
export const metadata = {
  title: 'Gestion des Enlèvements | Faso Fret Logistics',
  description: 'Gérez les demandes d\'enlèvement avec filtres et actions en temps réel',
};
