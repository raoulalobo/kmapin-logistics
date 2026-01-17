/**
 * Page : Liste des Demandes d'Achat Délégué (Back-Office)
 *
 * User Story US-3.1 : Liste back-office avec filtres, statistiques et actions
 *
 * Affiche la liste des demandes d'achat avec :
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
import { PurchaseStatus } from '@/lib/db/enums';
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
  ShoppingCart,
  Plus,
  Clock,
  Package,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface PageProps {
  searchParams: Promise<{
    search?: string;
    statuses?: string; // CSV: "NOUVEAU,EN_COURS"
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

export type PurchaseFiltersType = {
  search?: string;
  statuses?: PurchaseStatus[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

// ============================================
// HELPERS
// ============================================

/**
 * Convertit les searchParams en filtres typés
 */
function parseFilters(
  searchParams: Awaited<PageProps['searchParams']>
): PurchaseFiltersType {
  return {
    search: searchParams.search || undefined,
    statuses: searchParams.statuses
      ? (searchParams.statuses.split(',') as PurchaseStatus[])
      : undefined,
    dateFrom: searchParams.dateFrom || undefined,
    dateTo: searchParams.dateTo || undefined,
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

  // Utiliser le client Prisma standard au lieu de l'enhanced client
  const { prisma } = await import('@/lib/db/client');

  // Filtrer manuellement par rôle
  const where: any = {};
  if (session.user.role === 'CLIENT') {
    where.userId = session.user.id;
  }

  // Compter par statut (en parallèle)
  const [total, nouveau, enCours, livre, annule] = await Promise.all([
    prisma.purchaseRequest.count({ where }),
    prisma.purchaseRequest.count({
      where: { ...where, status: PurchaseStatus.NOUVEAU },
    }),
    prisma.purchaseRequest.count({
      where: { ...where, status: PurchaseStatus.EN_COURS },
    }),
    prisma.purchaseRequest.count({
      where: { ...where, status: PurchaseStatus.LIVRE },
    }),
    prisma.purchaseRequest.count({
      where: { ...where, status: PurchaseStatus.ANNULE },
    }),
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
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

      {/* En cours */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En cours</CardTitle>
          <Package className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{enCours}</div>
          <p className="text-xs text-muted-foreground">Achat en cours</p>
        </CardContent>
      </Card>

      {/* Livré */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Livrés</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{livre}</div>
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
 * Liste des demandes avec filtres (version temporaire simplifiée)
 */
async function PurchasesList({
  searchParams,
}: {
  searchParams: PageProps['searchParams'];
}) {
  const session = await requireAuth();

  // Utiliser le client Prisma standard au lieu de l'enhanced client
  const { prisma } = await import('@/lib/db/client');

  // Next.js 16 : searchParams est maintenant une Promise
  const resolvedSearchParams = await searchParams;
  const filters = parseFilters(resolvedSearchParams);
  const page = parseInt(resolvedSearchParams.page || '1');
  const limit = 20;

  // Construire les conditions where
  const where: any = {};

  // Filtrer manuellement par rôle (remplace Zenstack)
  if (session.user.role === 'CLIENT') {
    // Les CLIENTs voient seulement leurs propres achats
    where.userId = session.user.id;
  } else if (
    session.user.role === 'FINANCE_MANAGER' ||
    session.user.role === 'OPERATIONS_MANAGER'
  ) {
    // Les managers voient tous les achats (pas de filtre)
  }
  // Les ADMIN voient tous les achats (pas de filtre)

  // Recherche textuelle
  if (filters.search) {
    where.OR = [
      { trackingNumber: { contains: filters.search, mode: 'insensitive' } },
      { contactEmail: { contains: filters.search, mode: 'insensitive' } },
      { contactPhone: { contains: filters.search } },
      { productName: { contains: filters.search, mode: 'insensitive' } },
      { deliveryCity: { contains: filters.search, mode: 'insensitive' } },
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

  // Charger les demandes avec relations
  const [purchases, total] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.purchaseRequest.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Version temporaire : afficher sous forme de liste simple
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes d'achat ({total})</CardTitle>
        <CardDescription>
          Liste des demandes d'achat délégué
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {purchases.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune demande d'achat trouvée.
            </p>
          ) : (
            purchases.map((purchase) => (
              <Link
                key={purchase.id}
                href={`/dashboard/purchases/${purchase.id}`}
                className="block p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {purchase.trackingNumber}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          purchase.status === 'NOUVEAU'
                            ? 'bg-blue-100 text-blue-800'
                            : purchase.status === 'EN_COURS'
                              ? 'bg-orange-100 text-orange-800'
                              : purchase.status === 'LIVRE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {purchase.productName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {purchase.contactEmail} • {purchase.deliveryCity}
                    </p>
                    {purchase.user && (
                      <p className="text-xs text-muted-foreground">
                        Client: {purchase.user.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>
                      {new Date(purchase.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    {purchase.estimatedPrice && (
                      <p className="font-medium">
                        ~{purchase.estimatedPrice.toFixed(2)} €
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Pagination simple */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {page > 1 && (
              <Button variant="outline" asChild>
                <Link
                  href={`/dashboard/purchases?page=${page - 1}${
                    filters.search ? `&search=${filters.search}` : ''
                  }`}
                >
                  Précédent
                </Link>
              </Button>
            )}
            <span className="px-4 py-2 text-sm text-muted-foreground">
              Page {page} sur {totalPages}
            </span>
            {page < totalPages && (
              <Button variant="outline" asChild>
                <Link
                  href={`/dashboard/purchases?page=${page + 1}${
                    filters.search ? `&search=${filters.search}` : ''
                  }`}
                >
                  Suivant
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
 * Page de liste des demandes d'achat délégué
 */
export default function PurchasesPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des Achats Délégués
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les demandes d'achat délégué en temps réel
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/dashboard/purchases/new">
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
        <PurchasesList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Métadonnées de la page
 */
export const metadata = {
  title: 'Gestion des Achats Délégués | Faso Fret Logistics',
  description:
    'Gérez les demandes d\'achat délégué avec filtres et actions en temps réel',
};
