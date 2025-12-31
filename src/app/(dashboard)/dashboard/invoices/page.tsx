/**
 * Page : Liste des factures
 *
 * Affiche toutes les factures dans un tableau avec :
 * - Filtres par statut et compagnie
 * - Statistiques financières
 * - Actions rapides (voir, télécharger PDF, marquer comme payée)
 *
 * @route /dashboard/invoices
 */

import Link from 'next/link';
import { Plus, Eye, FileText, CurrencyEur, Clock, CheckCircle, Download } from '@phosphor-icons/react/dist/ssr';

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

import { getInvoicesAction } from '@/modules/invoices';
import { Pagination } from '@/components/ui/pagination';
import { InvoicesFilters } from '@/components/lists/invoices-filters';
import { DownloadPDFButton } from '@/components/pdf/download-pdf-button';

/**
 * Mapper les statuts de facture vers des variantes de badge
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'PAID':
      return 'default';
    case 'SENT':
    case 'VIEWED':
      return 'secondary';
    case 'OVERDUE':
    case 'CANCELLED':
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
    SENT: 'Envoyée',
    VIEWED: 'Vue',
    PAID: 'Payée',
    OVERDUE: 'En retard',
    CANCELLED: 'Annulée',
  };
  return translations[status] || status;
}

/**
 * Composant serveur : Liste des factures avec pagination
 */
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  // Extraire les paramètres depuis les searchParams (Next.js 16+)
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const limit = 10; // Nombre d'items par page
  const status = params.status;
  const search = params.search;

  // Récupérer les factures depuis le serveur avec filtres
  const result = await getInvoicesAction(
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
              {result.error || 'Impossible de charger les factures'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { invoices, pagination } = result.data;

  // Calculer les statistiques financières
  const totalRevenue = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.total, 0);

  const pendingRevenue = invoices
    .filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + inv.total, 0);

  const overdueCount = invoices.filter((inv) => inv.status === 'OVERDUE').length;

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Factures</h1>
          <p className="text-muted-foreground">
            Gérez vos factures et suivez les paiements
          </p>
        </div>
        <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Link href="/dashboard/invoices/new">
            <Plus className="h-5 w-5" weight="fill" />
            Nouvelle facture
          </Link>
        </Button>
      </div>

      {/* Filtres et recherche */}
      <InvoicesFilters />

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total factures
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">
              Factures émises
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenus encaissés
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalRevenue.toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">
              Factures payées
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
              {pendingRevenue.toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">
              À encaisser
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En retard
            </CardTitle>
            <Badge variant="destructive" className="font-normal">
              {overdueCount}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Factures en retard
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des factures */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des factures</CardTitle>
          <CardDescription>
            {pagination.total} facture{pagination.total > 1 ? 's' : ''}{' '}
            enregistrée{pagination.total > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucune facture</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez par créer votre première facture
              </p>
              <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Link href="/dashboard/invoices/new">
                  <Plus className="h-5 w-5" weight="fill" />
                  Créer une facture
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date émission</TableHead>
                  <TableHead>Date échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-semibold">
                          {invoice.invoiceNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {invoice._count.items} ligne{invoice._count.items > 1 ? 's' : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.company.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {invoice.company.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.issueDate).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                        </span>
                        {invoice.status === 'PAID' && invoice.paidDate && (
                          <span className="text-xs text-green-600">
                            Payée le {new Date(invoice.paidDate).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(invoice.status)}>
                        {translateStatus(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-lg">
                          {invoice.total.toFixed(2)} {invoice.currency}
                        </span>
                        {invoice.discount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Remise: -{invoice.discount.toFixed(2)} {invoice.currency}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DownloadPDFButton
                          documentId={invoice.id}
                          documentType="invoice"
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
                              <Link href={`/dashboard/invoices/${invoice.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir les détails
                              </Link>
                            </DropdownMenuItem>
                            {invoice.status !== 'PAID' && (
                              <DropdownMenuItem>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marquer comme payée
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {invoices.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          baseUrl="/dashboard/invoices"
        />
      )}
    </div>
  );
}
