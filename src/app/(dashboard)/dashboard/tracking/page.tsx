/**
 * Page Tracking en Temps Réel
 *
 * Affiche toutes les expéditions en cours avec leur tracking détaillé.
 * Fonctionnalités :
 * - Vue globale des expéditions actives
 * - Statistiques rapides (en transit, en douane, livraison, etc.)
 * - Timeline détaillée pour chaque expédition
 * - Filtrage et recherche
 * - Liens vers les détails complets des expéditions
 */

import Link from 'next/link';
import { MapPin, Package, Airplane, Boat, Truck, Clock, ArrowRight, CheckCircle, House, Plus } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getActiveShipmentsWithTracking, getTrackingStats } from '@/modules/tracking';
import { TrackingTimeline } from '@/components/tracking/TrackingTimeline';

/**
 * Obtenir l'icône du mode de transport
 */
function getTransportIcon(modes: string[]) {
  if (modes.includes('AIR')) return <Airplane className="h-4 w-4" />;
  if (modes.includes('SEA')) return <Boat className="h-4 w-4" />;
  if (modes.includes('ROAD')) return <Truck className="h-4 w-4" />;
  return <Package className="h-4 w-4" />;
}

/**
 * Obtenir la variante du badge selon le statut
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'DELIVERED':
      return 'default';
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      return 'default';
    case 'AT_CUSTOMS':
    case 'CUSTOMS_CLEARED':
      return 'secondary';
    case 'ON_HOLD':
    case 'EXCEPTION':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default async function TrackingPage() {
  // Récupérer les expéditions actives et les statistiques
  const [shipments, stats] = await Promise.all([
    getActiveShipmentsWithTracking(),
    getTrackingStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Tracking en Temps Réel</h1>
          <p className="text-muted-foreground">
            Suivez vos expéditions en cours
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Package className="h-3 w-3" />
          {stats.totalActive} active{stats.totalActive > 1 ? 's' : ''}
        </Badge>
      </div>

      <Separator />

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prise en charge</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pickedUp}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Réceptionnées
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disponible</CardTitle>
            <House className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.readyForPickup}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Au point de retrait
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En transit</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Expéditions en cours
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En douane</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.atCustoms}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En attente de dédouanement
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En livraison</CardTitle>
            <Truck className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outForDelivery}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En route vers la destination
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Livrées aujourd&apos;hui</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveredToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Livraisons du jour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des expéditions en cours */}
      {shipments.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune expédition active</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Les expéditions sont créées automatiquement lors de la validation d&apos;un devis
            </p>
            <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Link href="/dashboard/quotes">
                <Plus className="h-5 w-5" weight="fill" />
                Voir les devis
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Expéditions actives ({shipments.length})
            </h2>
          </div>

          {shipments.map((shipment) => (
            <Card key={shipment.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {shipment.trackingNumber}
                      </CardTitle>
                      <Badge variant={getStatusVariant(shipment.status)}>
                        {shipment.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {shipment.originCity}, {shipment.originCountry}
                      </span>
                      <ArrowRight className="h-4 w-4 mx-1" />
                      <span>
                        {shipment.destinationCity}, {shipment.destinationCountry}
                      </span>
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {getTransportIcon(shipment.transportMode as string[])}
                        <span className="capitalize">{shipment.cargoType}</span>
                      </span>
                      <span>•</span>
                      <span>{shipment.weight} kg</span>
                      <span>•</span>
                      <span className="capitalize">{shipment.client.name}</span>
                      {shipment.estimatedDeliveryDate && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Livraison prévue:{' '}
                            {new Date(shipment.estimatedDeliveryDate).toLocaleDateString('fr-FR')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/shipments/${shipment.id}`}>
                      Voir détails
                    </Link>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Timeline de tracking */}
                {shipment.trackingEvents.length > 0 ? (
                  <TrackingTimeline events={shipment.trackingEvents} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Aucun événement de tracking pour cette expédition
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
