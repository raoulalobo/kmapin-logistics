/**
 * Page Liste des Devis
 *
 * Affiche tous les devis avec :
 * - Recherche par numéro de devis, client, route
 * - Filtrage par statut
 * - Pagination
 * - Liens vers les détails et création
 * - Statistiques rapides (brouillons, envoyés, acceptés, rejetés)
 *
 * Utilise le module quotes existant avec getQuotesAction
 */

import { requireAuth } from '@/lib/auth/config';
import Link from 'next/link';
import { Plus, FileText, TrendUp, CheckCircle, Clock, Funnel, Trash } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getQuotesAction } from '@/modules/quotes';
import { QuotesDataTable, type QuoteRow } from '@/components/quotes/quotes-data-table';
import { QuoteStatus } from '@/lib/db/enums';

/**
 * Options de filtre par statut pour l'interface
 * Chaque option contient le statut, le label, la variante de badge et une icône
 */
const STATUS_FILTERS: Array<{
  status: QuoteStatus | 'ALL';
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = [
  { status: 'ALL', label: 'Tous', variant: 'outline' },
  { status: 'DRAFT', label: 'Brouillons', variant: 'secondary' },
  { status: 'SUBMITTED', label: 'Soumis', variant: 'outline' },
  { status: 'SENT', label: 'Envoyés', variant: 'outline' },
  { status: 'ACCEPTED', label: 'Acceptés', variant: 'default' },
  { status: 'IN_TREATMENT', label: 'En traitement', variant: 'outline' },
  { status: 'VALIDATED', label: 'Validés', variant: 'default' },
  { status: 'REJECTED', label: 'Rejetés', variant: 'destructive' },
  { status: 'CANCELLED', label: 'Annulés', variant: 'destructive' },
];

/**
 * Fonction utilitaire pour formater le statut en français
 * Inclut tous les statuts du workflow agent
 */
function formatStatus(status: QuoteStatus): string {
  const statusMap: Record<QuoteStatus, string> = {
    DRAFT: 'Brouillon',
    SUBMITTED: 'Soumis',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    REJECTED: 'Rejeté',
    EXPIRED: 'Expiré',
    IN_TREATMENT: 'En traitement',
    VALIDATED: 'Validé',
    CANCELLED: 'Annulé',
  };

  return statusMap[status] || status;
}


export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const result = await getQuotesAction(
    page,
    20,
    undefined,
    params.status as QuoteStatus | undefined,
    params.search
  );

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Devis</h1>
          <p className="text-muted-foreground">
            Gérez vos devis et estimations tarifaires
          </p>
        </div>
        <Card className="p-6">
          <p className="text-destructive">Erreur lors du chargement des devis</p>
        </Card>
      </div>
    );
  }

  const { quotes, pagination } = result.data;

  // Calculer les statistiques
  const stats = {
    total: pagination.total,
    draft: quotes.filter(q => q.status === 'DRAFT').length,
    sent: quotes.filter(q => q.status === 'SENT').length,
    accepted: quotes.filter(q => q.status === 'ACCEPTED').length,
    rejected: quotes.filter(q => q.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Devis</h1>
          <p className="text-muted-foreground">
            Gérez vos devis et estimations tarifaires
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Lien Corbeille — visible uniquement pour ADMIN et OPERATIONS_MANAGER */}
          {(session.user.role === 'ADMIN' || session.user.role === 'OPERATIONS_MANAGER') && (
            <Button variant="outline" size="lg" asChild className="gap-2">
              <Link href="/dashboard/quotes/trash">
                <Trash className="h-5 w-5" />
                Corbeille
              </Link>
            </Button>
          )}
          <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Link href="/dashboard/quotes/new">
              <Plus className="h-5 w-5" weight="fill" />
              Nouveau devis
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total devis</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tous les devis
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Envoyés</CardTitle>
            <TrendUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En attente de réponse
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Acceptés</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Devis validés
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Non envoyés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* FILTRES PAR STATUT */}
      {/* Permet à l'agent de filtrer la liste par statut */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Card className="dashboard-card">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Funnel className="h-4 w-4" />
              <span>Filtrer par statut :</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => {
                // Déterminer si ce filtre est actif
                const isActive =
                  (filter.status === 'ALL' && !params.status) ||
                  params.status === filter.status;

                // Construire l'URL du filtre
                const filterUrl =
                  filter.status === 'ALL'
                    ? `/dashboard/quotes${params.search ? `?search=${params.search}` : ''}`
                    : `/dashboard/quotes?status=${filter.status}${params.search ? `&search=${params.search}` : ''}`;

                return (
                  <Link key={filter.status} href={filterUrl}>
                    <Badge
                      variant={isActive ? 'default' : filter.variant}
                      className={`cursor-pointer transition-all hover:scale-105 ${
                        isActive
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {filter.label}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Indication du filtre actif */}
          {params.status && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Affichage des devis avec statut :{' '}
                <span className="font-medium text-foreground">
                  {formatStatus(params.status as QuoteStatus)}
                </span>
              </span>
              <Link
                href={`/dashboard/quotes${params.search ? `?search=${params.search}` : ''}`}
                className="text-primary hover:underline"
              >
                (Réinitialiser)
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DataTable des devis */}
      {quotes.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun devis trouvé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {params.status
                ? `Aucun devis avec le statut "${formatStatus(params.status as QuoteStatus)}"`
                : params.search
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Commencez par créer votre premier devis'}
            </p>
            <div className="flex gap-2">
              {params.status && (
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/quotes${params.search ? `?search=${params.search}` : ''}`}>
                    Voir tous les devis
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Link href="/dashboard/quotes/new">
                  <Plus className="h-5 w-5" weight="fill" />
                  Créer un devis
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <QuotesDataTable
          data={quotes as unknown as QuoteRow[]}
          userRole={session.user.role as string}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} sur {pagination.totalPages} • {pagination.total} devis au total
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/quotes?page=${pagination.page - 1}${params.status ? `&status=${params.status}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                >
                  Précédent
                </Link>
              </Button>
            )}
            {pagination.page < pagination.totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/quotes?page=${pagination.page + 1}${params.status ? `&status=${params.status}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                >
                  Suivant
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
