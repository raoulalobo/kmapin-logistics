/**
 * Page Détail Client
 *
 * Affiche toutes les informations détaillées d'un client :
 * - Informations générales (nom, coordonnées, adresse)
 * - Statistiques (expéditions, factures, chiffre d'affaires)
 * - Liste des expéditions récentes
 * - Liste des factures récentes
 * - Boutons d'actions (modifier, supprimer)
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Buildings,
  Envelope,
  Phone,
  MapPin,
  Globe,
  PencilSimple,
  Trash,
  Package,
  FileText,
  CurrencyEur,
  Calendar,
} from '@phosphor-icons/react/dist/ssr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getClientAction } from '@/modules/clients';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getClientAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const client = result.data;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Buildings className="h-12 w-12 text-primary" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{client.name}</h1>
              {client.legalName && (
                <p className="text-muted-foreground">{client.legalName}</p>
              )}
              {client.taxId && (
                <p className="text-sm text-muted-foreground mt-1">
                  TVA: {client.taxId}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/clients/${id}/edit`}>
                <PencilSimple className="mr-2 h-4 w-4" />
                Modifier
              </Link>
            </Button>
            <Button variant="destructive" size="sm">
              <Trash className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expéditions</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client._count?.shipments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total depuis la création
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Devis</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client._count?.quotes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total établis
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client._count?.documents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Fichiers associés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informations détaillées */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Coordonnées */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
            <CardDescription>
              Informations de contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Envelope className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <a
                  href={`mailto:${client.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {client.email}
                </a>
              </div>
            </div>

            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Téléphone</p>
                  <a
                    href={`tel:${client.phone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {client.phone}
                  </a>
                </div>
              </div>
            )}

            {client.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Site web</p>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adresse */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
            <CardDescription>
              Localisation du siège social
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Adresse complète</p>
                <div className="text-sm text-muted-foreground mt-1">
                  <p>{client.address}</p>
                  <p>
                    {client.postalCode} {client.city}
                  </p>
                  <p>{client.country}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  {new Date(client.createdAt).toLocaleDateString('fr-FR', {
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
                  {new Date(client.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expéditions récentes */}
      <Card className="dashboard-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Expéditions récentes</CardTitle>
              <CardDescription>
                Les 5 dernières expéditions de ce client
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/shipments?clientId=${id}`}>
                Voir toutes
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {client.shipments && client.shipments.length > 0 ? (
            <div className="space-y-3">
              {client.shipments.slice(0, 5).map((shipment: any) => (
                <Link
                  key={shipment.id}
                  href={`/dashboard/shipments/${shipment.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{shipment.trackingNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {shipment.destinationCity}, {shipment.destinationCountry}
                      </p>
                    </div>
                  </div>
                  <Badge>{shipment.status}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune expédition pour ce client
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
