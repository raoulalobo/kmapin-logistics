/**
 * Page Liste des Clients
 *
 * Affiche tous les clients (entreprises) avec :
 * - Recherche par nom, email, taxId
 * - Pagination
 * - Liens vers les détails et création
 * - Statistiques rapides (nombre d'expéditions, factures)
 *
 * Utilise le module clients existant avec getClientsAction
 */

import Link from 'next/link';
import { Plus, Building2, Mail, Phone, MapPin, Package, Euro } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getClientsAction } from '@/modules/clients';
import { UnauthorizedAccess } from '@/components/errors';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  // Next.js 16 : searchParams est une Promise
  const params = await searchParams;
  const page = parseInt(params.page || '1');

  const result = await getClientsAction({
    page,
    limit: 20,
    search: params.search,
  });

  // Gestion des erreurs avec affichage convivial
  if (!result.success || !result.data) {
    // Vérifier si c'est une erreur de permission
    const isForbidden = result.error?.includes('Forbidden') || result.error?.includes('permission');

    if (isForbidden) {
      return (
        <UnauthorizedAccess
          resource="la liste des clients"
          message="Vous n'avez pas les permissions nécessaires pour consulter la liste des clients. Cette fonctionnalité est réservée aux administrateurs et gestionnaires."
        />
      );
    }

    // Erreur générique (problème technique)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Gérez vos clients et entreprises
          </p>
        </div>
        <Card className="p-6">
          <p className="text-destructive">
            Erreur lors du chargement des clients : {result.error || 'Erreur inconnue'}
          </p>
        </Card>
      </div>
    );
  }

  const { clients, pagination } = result.data;
  const totalPages = pagination.totalPages;

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Gérez vos clients et entreprises
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des clients */}
      {clients.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun client trouvé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {params.search
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par créer votre premier client'}
            </p>
            <Button asChild>
              <Link href="/dashboard/clients/new">
                <Plus className="mr-2 h-4 w-4" />
                Créer un client
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((company) => (
            <Card key={company.id} className="hover:bg-accent/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      {company.taxId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          TVA: {company.taxId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Coordonnées */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{company.email}</span>
                  </div>
                  {company.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm">{company.city}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.country}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Statistiques */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {company._count?.shipments || 0} expédition(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {company._count?.invoices || 0} facture(s)
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/dashboard/clients/${company.id}`}>
                      Voir détails
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages} • {pagination.total} client{pagination.total > 1 ? 's' : ''} au total
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/clients?page=${page - 1}${params.search ? `&search=${params.search}` : ''}`}
                >
                  Précédent
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/clients?page=${page + 1}${params.search ? `&search=${params.search}` : ''}`}
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
