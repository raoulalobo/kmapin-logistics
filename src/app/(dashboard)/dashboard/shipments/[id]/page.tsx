/**
 * Page Détail Expédition
 *
 * Affiche toutes les informations détaillées d'une expédition :
 * - Numéro de tracking et statut
 * - Informations d'origine et de destination
 * - Détails de la marchandise
 * - Historique de tracking (événements)
 * - Informations de facturation
 * - Boutons d'actions (modifier, supprimer, changer statut)
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  CurrencyEur,
  PencilSimple,
  Trash,
  Buildings,
  Scales,
  Cube,
  FileText,
  Warning,
  ShieldWarning,
  Clock,
  CheckCircle,
  User,
} from '@phosphor-icons/react/dist/ssr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getShipmentAction } from '@/modules/shipments';
import { ShipmentStatus } from '@/lib/db/enums';
import { getSession } from '@/lib/auth/config';
import { ShipmentAgentActions } from '@/components/shipments/shipment-agent-actions';

/**
 * Fonction utilitaire pour formater le statut en français
 * Labels adaptés au workflow agent :
 * - PENDING_APPROVAL = "Enregistré" (statut initial après création depuis devis)
 * - PICKED_UP = "Prise en charge"
 * - IN_TRANSIT = "En cours d'acheminement"
 * - AT_CUSTOMS = "En cours de dédouanement"
 * - READY_FOR_PICKUP = "À retirer"
 * - DELIVERED = "Retiré"
 */
function formatStatus(status: ShipmentStatus): string {
  const statusMap: Record<ShipmentStatus, string> = {
    DRAFT: 'Brouillon',
    PENDING_APPROVAL: 'Enregistré',
    APPROVED: 'Approuvé',
    PICKED_UP: 'Prise en charge',
    IN_TRANSIT: 'En cours d\'acheminement',
    AT_CUSTOMS: 'En cours de dédouanement',
    CUSTOMS_CLEARED: 'Dédouané',
    OUT_FOR_DELIVERY: 'En cours de livraison',
    READY_FOR_PICKUP: 'À retirer',
    DELIVERED: 'Retiré',
    CANCELLED: 'Annulé',
    ON_HOLD: 'En attente',
    EXCEPTION: 'Exception',
  };

  return statusMap[status] || status;
}

/**
 * Fonction utilitaire pour obtenir la variante du badge selon le statut
 * - default (vert) : DELIVERED, READY_FOR_PICKUP
 * - destructive (rouge) : CANCELLED, EXCEPTION
 * - secondary (gris) : DRAFT, PENDING_APPROVAL, ON_HOLD
 * - outline (bordure) : autres statuts en cours
 */
function getStatusVariant(status: ShipmentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'DELIVERED' || status === 'READY_FOR_PICKUP') return 'default';
  if (status === 'CANCELLED' || status === 'EXCEPTION') return 'destructive';
  if (status === 'DRAFT' || status === 'PENDING_APPROVAL' || status === 'ON_HOLD') return 'secondary';
  return 'outline';
}

/**
 * Fonction utilitaire pour formater le type de cargo en français
 */
function formatCargoType(type: string): string {
  const cargoMap: Record<string, string> = {
    GENERAL: 'Marchandise générale',
    FOOD: 'Alimentaire',
    ELECTRONICS: 'Électronique',
    PHARMACEUTICALS: 'Pharmaceutique',
    CHEMICALS: 'Produits chimiques',
    CONSTRUCTION: 'Construction',
    TEXTILES: 'Textiles',
    AUTOMOTIVE: 'Automobile',
    MACHINERY: 'Machines',
    PERISHABLE: 'Périssable',
    HAZARDOUS: 'Dangereux',
  };

  return cargoMap[type] || type;
}

/**
 * Fonction utilitaire pour formater le mode de transport en français
 */
function formatTransportMode(mode: string): string {
  const modeMap: Record<string, string> = {
    ROAD: 'Routier',
    SEA: 'Maritime',
    AIR: 'Aérien',
    RAIL: 'Ferroviaire',
  };

  return modeMap[mode] || mode;
}

/**
 * Fonction utilitaire pour formater la priorité en français
 */
function formatPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    STANDARD: 'Standard',
    EXPRESS: 'Express',
    URGENT: 'Urgent',
  };

  return priorityMap[priority] || priority;
}

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Récupérer l'expédition et la session en parallèle
  const [result, session] = await Promise.all([
    getShipmentAction(id),
    getSession(),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  const shipment = result.data;
  const userRole = session?.user?.role || 'CLIENT';
  const userName = session?.user?.name || session?.user?.email || 'Agent';

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/shipments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Package className="h-12 w-12 text-primary" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{shipment.trackingNumber}</h1>
              <p className="text-muted-foreground mt-1">
                {shipment.originCity}, {shipment.originCountry} → {shipment.destinationCity}, {shipment.destinationCountry}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant={getStatusVariant(shipment.status)} className="text-base px-4 py-2">
              {formatStatus(shipment.status)}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Client */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Buildings className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-semibold text-lg">{shipment.company.name}</p>
              <p className="text-sm text-muted-foreground">{shipment.company.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations détaillées */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Origine */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Point d'origine</CardTitle>
            <CardDescription>
              Adresse de collecte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Adresse complète</p>
                <div className="text-sm text-muted-foreground mt-1">
                  <p>{shipment.originAddress}</p>
                  <p>
                    {shipment.originPostalCode} {shipment.originCity}
                  </p>
                  <p>{shipment.originCountry}</p>
                </div>
              </div>
            </div>

            {shipment.originContact && (
              <div className="mt-3">
                <p className="text-sm font-medium">Contact</p>
                <p className="text-sm text-muted-foreground">{shipment.originContact}</p>
                {shipment.originPhone && (
                  <p className="text-sm text-muted-foreground">{shipment.originPhone}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Destination */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Point de destination</CardTitle>
            <CardDescription>
              Adresse de livraison
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Adresse complète</p>
                <div className="text-sm text-muted-foreground mt-1">
                  <p>{shipment.destinationAddress}</p>
                  <p>
                    {shipment.destinationPostalCode} {shipment.destinationCity}
                  </p>
                  <p>{shipment.destinationCountry}</p>
                </div>
              </div>
            </div>

            {shipment.destinationContact && (
              <div className="mt-3">
                <p className="text-sm font-medium">Contact</p>
                <p className="text-sm text-muted-foreground">{shipment.destinationContact}</p>
                {shipment.destinationPhone && (
                  <p className="text-sm text-muted-foreground">{shipment.destinationPhone}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Détails de la marchandise */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Détails de la marchandise</CardTitle>
          <CardDescription>
            Informations sur le contenu de l'expédition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-sm text-muted-foreground">
                  {formatCargoType(shipment.cargoType)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Scales className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Poids</p>
                <p className="text-sm text-muted-foreground">
                  {shipment.weight} kg
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Colis</p>
                <p className="text-sm text-muted-foreground">
                  {shipment.packageCount} colis
                </p>
              </div>
            </div>

            {shipment.volume && (
              <div className="flex items-center gap-3">
                <Cube className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Volume</p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.volume} m³
                  </p>
                </div>
              </div>
            )}

            {shipment.value && (
              <div className="flex items-center gap-3">
                <CurrencyEur className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Valeur</p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.value.toFixed(2)} {shipment.currency}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Priorité</p>
                <p className="text-sm text-muted-foreground">
                  {formatPriority(shipment.priority)}
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <p className="text-sm font-medium">Description</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {shipment.description}
            </p>
          </div>

          {shipment.specialInstructions && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium">Instructions spéciales</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {shipment.specialInstructions}
              </p>
            </div>
          )}

          {(shipment.isDangerous || shipment.isFragile) && (
            <div className="flex gap-4 mt-4">
              {shipment.isDangerous && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <ShieldWarning className="h-4 w-4" />
                  <span>Marchandise dangereuse</span>
                </div>
              )}
              {shipment.isFragile && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <Warning className="h-4 w-4" />
                  <span>Marchandise fragile</span>
                </div>
              )}
            </div>
          )}

          {shipment.transportMode && shipment.transportMode.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Modes de transport</p>
              <div className="flex gap-2">
                {shipment.transportMode.map((mode) => (
                  <Badge key={mode} variant="secondary">
                    {formatTransportMode(mode)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dates et coûts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shipment.requestedPickupDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Collecte souhaitée</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(shipment.requestedPickupDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            {shipment.estimatedDeliveryDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Livraison estimée</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(shipment.estimatedDeliveryDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            {shipment.actualPickupDate && (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Collecte réelle</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(shipment.actualPickupDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            {shipment.actualDeliveryDate && (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Livraison réelle</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(shipment.actualDeliveryDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Coûts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shipment.estimatedCost && (
              <div className="flex items-center gap-3">
                <CurrencyEur className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Coût estimé</p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.estimatedCost.toFixed(2)} {shipment.currency}
                  </p>
                </div>
              </div>
            )}

            {shipment.actualCost && (
              <div className="flex items-center gap-3">
                <CurrencyEur className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Coût réel</p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.actualCost.toFixed(2)} {shipment.currency}
                  </p>
                </div>
              </div>
            )}

            {shipment.invoice && (
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Facture</p>
                  <Link
                    href={`/dashboard/invoices/${shipment.invoice.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {shipment.invoice.invoiceNumber}
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historique de tracking */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Historique de tracking</CardTitle>
          <CardDescription>
            Événements et mises à jour de statut
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipment.trackingEvents && shipment.trackingEvents.length > 0 ? (
            <div className="relative space-y-4">
              {shipment.trackingEvents.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="relative flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-primary-foreground" />
                    </div>
                    {index < shipment.trackingEvents.length - 1 && (
                      <div className="h-full w-0.5 bg-border absolute top-8" style={{ height: '100%' }} />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium">{formatStatus(event.status)}</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                    {event.description && (
                      <p className="text-sm mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(event.timestamp).toLocaleString('fr-FR')}
                      </p>
                      {/* Afficher le nom de l'agent qui a effectué l'action */}
                      {event.performedBy && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {event.performedBy.name || event.performedBy.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun événement de tracking pour cette expédition
            </p>
          )}
        </CardContent>
      </Card>

      {/* Métadonnées */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Informations système</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date de création</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(shipment.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Dernière modification</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(shipment.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {shipment.createdBy && (
              <div className="flex items-center gap-3">
                <Buildings className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Créé par</p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.createdBy.name || shipment.createdBy.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ACTIONS WORKFLOW AGENT */}
      {/* Visible pour ADMIN et OPERATIONS_MANAGER */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {(userRole === 'ADMIN' || userRole === 'OPERATIONS_MANAGER') && (
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Actions Agent</CardTitle>
            <CardDescription>
              Gestion du workflow d'expédition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShipmentAgentActions
              shipmentId={shipment.id}
              trackingNumber={shipment.trackingNumber}
              shipmentStatus={shipment.status}
              originCountry={shipment.originCountry}
              destinationCountry={shipment.destinationCountry}
              userRole={userRole}
              agentName={userName}
            />
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ACTIONS GÉNÉRALES */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {shipment.status === 'DRAFT' && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/shipments/${shipment.id}/edit`}>
              <PencilSimple className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </Button>
          <Button variant="destructive" size="sm">
            <Trash className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      )}
    </div>
  );
}
