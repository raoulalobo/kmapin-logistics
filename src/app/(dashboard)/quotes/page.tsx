/**
 * Page : Liste des devis
 *
 * Affiche tous les devis dans un tableau avec :
 * - Filtres par statut et compagnie
 * - Statistiques (acceptés, en attente, expirés)
 * - Actions rapides (voir, accepter, rejeter)
 *
 * @route /dashboard/quotes
 */

import Link from 'next/link';
import { Plus, Eye, FileText, CheckCircle, XCircle, Clock, Download } from '@phosphor-icons/react/dist/ssr';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { getQuotesAction } from '@/modules/quotes';
import { Pagination } from '@/components/ui/pagination';
import { QuotesFilters } from '@/components/lists/quotes-filters';
import { DownloadPDFButton } from '@/components/pdf/download-pdf-button';

/**
 * Mapper les statuts de devis vers des variantes de badge
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACCEPTED':
      return 'default';
    case 'SENT':
      return 'secondary';
    case 'REJECTED':
    case 'EXPIRED':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Traduire les statuts en français
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    REJECTED: 'Rejeté',
    EXPIRED: 'Expiré',
  };
  return translations[status] || status;
}

/**
 * Composant serveur : Liste des devis avec pagination
 */
export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  // Attendre les searchParams (Next.js 16)
  const params = await searchParams;

  // Extraire les paramètres depuis les searchParams
  const currentPage = Number(params.page) || 1;
  const limit = 10; // Nombre d'items par page
  const status = params.status;
  const search = params.search;

  // Récupérer les devis depuis le serveur avec filtres
  const result = await getQuotesAction(
    currentPage,
    limit,
    undefined, // companyId (géré par RBAC)
    status,
    search
  );

  // Gérer les erreurs
  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>
              {result.error || 'Impossible de charger les devis'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { quotes, pagination } = result.data;

  // Calculer les statistiques
  const acceptedCount = quotes.filter((q) => q.status === 'ACCEPTED').length;
  const pendingCount = quotes.filter((q) => q.status === 'SENT').length;
  const expiredCount = quotes.filter((q) => q.status === 'EXPIRED').length;

  const totalValue = quotes
    .filter((q) => q.status === 'ACCEPTED')
    .reduce((sum, q) => sum + q.estimatedCost, 0);

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devis</h1>
          <p className="text-muted-foreground">
            Gérez vos devis et propositions commerciales
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/quotes/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau devis
          </Link>
        </Button>
      </div>

      {/* Filtres et recherche */}
      <QuotesFilters />

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total devis
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">
              Devis émis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Acceptés
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {acceptedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Valeur: {totalValue.toFixed(2)} €
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En attente
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Attente réponse client
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taux d'acceptation
            </CardTitle>
            <Badge variant="outline" className="font-normal">
              {pagination.total > 0
                ? Math.round((acceptedCount / pagination.total) * 100)
                : 0}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pagination.total > 0
                ? Math.round((acceptedCount / pagination.total) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Sur {pagination.total} devis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des devis */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des devis</CardTitle>
          <CardDescription>
            {pagination.total} devis{pagination.total > 1 ? '' : ''}{' '}
            enregistré{pagination.total > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucun devis</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez par créer votre premier devis
              </p>
              <Button asChild>
                <Link href="/dashboard/quotes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un devis
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Devis</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Marchandise</TableHead>
                  <TableHead>Valide jusqu'au</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => {
                  const isExpired = new Date() > new Date(quote.validUntil);
                  const daysLeft = Math.ceil(
                    (new Date(quote.validUntil).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                  );

                  return (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-semibold">
                            {quote.quoteNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Créé le {new Date(quote.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {/* Fallback si client non enregistré */}
                          <span className="font-medium">{quote.client?.name || quote.originContactName || 'Client non enregistré'}</span>
                          <span className="text-xs text-muted-foreground">
                            {quote.client?.email || quote.originContactEmail || '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-muted-foreground">{quote.originCountry}</span>
                          {' → '}
                          <span className="text-muted-foreground">{quote.destinationCountry}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{quote.cargoType}</span>
                          <span className="text-xs text-muted-foreground">
                            {quote.weight} kg
                            {quote.volume && ` - ${quote.volume} m³`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
                          </span>
                          {!isExpired && quote.status === 'SENT' && daysLeft >= 0 && (
                            <span className={`text-xs ${
                              daysLeft <= 3 ? 'text-orange-600' : 'text-muted-foreground'
                            }`}>
                              {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(quote.status)}>
                          {translateStatus(quote.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-lg">
                          {quote.estimatedCost.toFixed(2)} {quote.currency}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <DownloadPDFButton
                            documentId={quote.id}
                            documentType="quote"
                            variant="outline"
                            size="sm"
                            iconOnly
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/quotes/${quote.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir les détails
                                </Link>
                              </DropdownMenuItem>
                              {quote.status === 'SENT' && !isExpired && (
                                <>
                                  <DropdownMenuItem>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                    Accepter le devis
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                    Rejeter le devis
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {quotes.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          baseUrl="/dashboard/quotes"
        />
      )}
    </div>
  );
}
