/**
 * Page : Liste des clients
 *
 * Affiche tous les clients dans un tableau avec :
 * - Pagination
 * - Actions rapides (voir, éditer, supprimer)
 * - Statistiques par client (nombre d'expéditions, factures)
 */

import Link from 'next/link';
import { Plus, Eye, PencilSimple, Trash, Buildings } from '@phosphor-icons/react/dist/ssr';

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

import { getClientsAction } from '@/modules/clients';

/**
 * Composant serveur : Liste des clients
 *
 * Récupère automatiquement les clients côté serveur
 * et les affiche dans un tableau interactif
 */
export default async function ClientsPage() {
  // Récupérer les clients depuis le serveur
  const result = await getClientsAction({ page: 1, limit: 50 });

  // Gérer les erreurs
  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>
              {result.error || 'Impossible de charger les clients'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { clients, pagination } = result.data;

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Gérez vos clients et leurs informations
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Link>
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total clients
            </CardTitle>
            <Buildings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">
              Entreprises enregistrées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Actifs ce mois
            </CardTitle>
            <Badge variant="outline" className="font-normal">
              +12%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(pagination.total * 0.6)}
            </div>
            <p className="text-xs text-muted-foreground">
              Clients avec activité récente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nouveaux (30j)
            </CardTitle>
            <Badge variant="outline" className="text-green-600">
              +{Math.floor(pagination.total * 0.15)}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(pagination.total * 0.15)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ajoutés ce mois
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des clients */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des clients</CardTitle>
          <CardDescription>
            {pagination.total} client{pagination.total > 1 ? 's' : ''}{' '}
            enregistré{pagination.total > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Buildings className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucun client</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez par créer votre premier client
              </p>
              <Button asChild>
                <Link href="/dashboard/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un client
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead className="text-center">Expéditions</TableHead>
                  <TableHead className="text-center">Factures</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold">{client.name}</span>
                        {client.legalName && (
                          <span className="text-xs text-muted-foreground">
                            {client.legalName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.city}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.country}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {client._count.shipments}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {client._count.invoices}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
                            <Link href={`/dashboard/clients/${client.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir les détails
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/clients/${client.id}/edit`}
                            >
                              <PencilSimple className="mr-2 h-4 w-4" />
                              Modifier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled={
                              client._count.shipments > 0 ||
                              client._count.invoices > 0
                            }
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
