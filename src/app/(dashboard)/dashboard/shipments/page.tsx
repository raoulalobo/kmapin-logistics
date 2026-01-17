/**
 * Page Liste des Expéditions
 *
 * Affiche toutes les expéditions avec :
 * - Recherche par numéro de tracking, origine, destination
 * - Filtrage par statut
 * - Pagination
 * - Liens vers les détails et création
 * - Statistiques rapides (nombre d'expéditions actives, livrées)
 *
 * Utilise le module shipments existant avec getShipmentsAction
 */

import Link from 'next/link';
import { Plus, Package, MapPin, Calendar, TrendUp, CheckCircle, Clock } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getShipmentsAction } from '@/modules/shipments';
import { ShipmentStatus } from '@/lib/db/enums';

/**
 * Fonction utilitaire pour formater le statut en français
 */
function formatStatus(status: ShipmentStatus): string {
  const statusMap: Record<ShipmentStatus, string> = {
    DRAFT: 'Brouillon',
    PENDING_APPROVAL: 'En attente d\'approbation',
    APPROVED: 'Approuvé',
    PICKED_UP: 'Collecté',
    IN_TRANSIT: 'En transit',
    AT_CUSTOMS: 'En douane',
    OUT_FOR_DELIVERY: 'En cours de livraison',
    DELIVERED: 'Livré',
    CANCELLED: 'Annulé',
    ON_HOLD: 'En attente',
  };

  return statusMap[status] || status;
}

/**
 * Fonction utilitaire pour obtenir la variante du badge selon le statut
 */
function getStatusVariant(status: ShipmentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'DELIVERED') return 'default';
  if (status === 'CANCELLED') return 'destructive';
  if (status === 'DRAFT' || status === 'PENDING_APPROVAL') return 'secondary';
  return 'outline';
}

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const result = await getShipmentsAction(
    page,
    20,
    undefined,
    params.status,
    params.search
  );

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Expéditions</h1>
          <p className="text-muted-foreground">
            Gérez vos expéditions et suivez leur statut
          </p>
        </div>
        <Card className="p-6">
          <p className="text-destructive">Erreur lors du chargement des expéditions</p>
        </Card>
      </div>
    );
  }

  const { shipments, pagination } = result.data;

  // Calculer les statistiques
  const stats = {
    total: pagination.total,
    inTransit: shipments.filter(s =>
      ['IN_TRANSIT', 'AT_CUSTOMS', 'OUT_FOR_DELIVERY', 'PICKED_UP'].includes(s.status)
    ).length,
    delivered: shipments.filter(s => s.status === 'DELIVERED').length,
    pending: shipments.filter(s =>
      ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(s.status)
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Expéditions</h1>
          <p className="text-muted-foreground">
            Gérez vos expéditions et suivez leur statut
          </p>
        </div>
        <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Link href="/dashboard/shipments/new">
            <Plus className="h-5 w-5" weight="fill" />
            Nouvelle expédition
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total expéditions</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Toutes les expéditions
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En transit</CardTitle>
            <TrendUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Actuellement en cours
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Livrées</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Livrées avec succès
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Brouillons et approvals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des expéditions */}
      {shipments.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune expédition trouvée</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {params.search
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par créer votre première expédition'}
            </p>
            <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Link href="/dashboard/shipments/new">
                <Plus className="h-5 w-5" weight="fill" />
                Créer une expédition
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {shipments.map((shipment) => (
            <Card key={shipment.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Informations principales */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-primary" />
                      <div>
                        <Link
                          href={`/dashboard/shipments/${shipment.id}`}
                          className="text-lg font-semibold hover:underline"
                        >
                          {shipment.trackingNumber}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {shipment.client.name}
                        </p>
                      </div>
                    </div>

                    {/* Itinéraire */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{shipment.originCity}, {shipment.originCountry}</span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{shipment.destinationCity}, {shipment.destinationCountry}</span>
                      </div>
                    </div>

                    {/* Détails marchandise */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{shipment.cargoType}</span>
                      <span>•</span>
                      <span>{shipment.weight} kg</span>
                      <span>•</span>
                      <span>{shipment.packageCount} colis</span>
                      {shipment._count.trackingEvents > 0 && (
                        <>
                          <span>•</span>
                          <span>{shipment._count.trackingEvents} événements</span>
                        </>
                      )}
                    </div>

                    {/* Dates */}
                    {shipment.estimatedDeliveryDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Livraison estimée: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Statut et actions */}
                  <div className="flex flex-col items-end gap-3">
                    <Badge variant={getStatusVariant(shipment.status)}>
                      {formatStatus(shipment.status)}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/shipments/${shipment.id}`}>
                        Voir détails
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} sur {pagination.totalPages} • {pagination.total} expédition{pagination.total > 1 ? 's' : ''} au total
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/shipments?page=${pagination.page - 1}${params.status ? `&status=${params.status}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                >
                  Précédent
                </Link>
              </Button>
            )}
            {pagination.page < pagination.totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/shipments?page=${pagination.page + 1}${params.status ? `&status=${params.status}` : ''}${params.search ? `&search=${params.search}` : ''}`}
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
