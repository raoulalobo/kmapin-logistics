/**
 * Page Détail Devis
 *
 * Affiche toutes les informations détaillées d'un devis :
 * - Numéro de devis et statut
 * - Informations client
 * - Détails de la route et de la marchandise
 * - Tarification et validité
 * - Boutons d'actions (modifier, supprimer, accepter, rejeter)
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Calendar,
  Euro,
  Edit,
  Trash2,
  Building2,
  Weight,
  Box,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getQuoteAction } from '@/modules/quotes';
import { QuoteStatus } from '@/generated/prisma';

/**
 * Fonction utilitaire pour formater le statut en français
 */
function formatStatus(status: QuoteStatus): string {
  const statusMap: Record<QuoteStatus, string> = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    REJECTED: 'Rejeté',
    EXPIRED: 'Expiré',
    CANCELLED: 'Annulé',
  };

  return statusMap[status] || status;
}

/**
 * Fonction utilitaire pour obtenir la variante du badge selon le statut
 */
function getStatusVariant(status: QuoteStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'ACCEPTED') return 'default';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'destructive';
  if (status === 'DRAFT' || status === 'EXPIRED') return 'secondary';
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
 * Fonction utilitaire pour obtenir l'icône selon le statut
 */
function getStatusIcon(status: QuoteStatus) {
  switch (status) {
    case 'ACCEPTED':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'REJECTED':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'EXPIRED':
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    case 'SENT':
      return <Clock className="h-5 w-5 text-blue-600" />;
    default:
      return <FileText className="h-5 w-5 text-muted-foreground" />;
  }
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getQuoteAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const quote = result.data;

  // Vérifier si le devis est expiré
  const isExpired = new Date(quote.validUntil) < new Date();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/quotes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon(quote.status)}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{quote.quoteNumber}</h1>
              <p className="text-muted-foreground mt-1">
                {quote.originCountry} → {quote.destinationCountry}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={getStatusVariant(quote.status)} className="text-base px-4 py-2">
              {formatStatus(quote.status)}
            </Badge>
            {isExpired && quote.status === 'SENT' && (
              <Badge variant="secondary" className="text-base px-4 py-2">
                Expiré
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Alertes */}
      {isExpired && quote.status === 'SENT' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">Devis expiré</p>
                <p className="text-sm text-orange-700">
                  Ce devis a expiré le {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client */}
      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-semibold text-lg">{quote.company.name}</p>
              <p className="text-sm text-muted-foreground">{quote.company.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations détaillées */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Itinéraire */}
        <Card>
          <CardHeader>
            <CardTitle>Itinéraire</CardTitle>
            <CardDescription>
              Route de transport
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Origine</p>
                <p className="text-sm text-muted-foreground">{quote.originCountry}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Destination</p>
                <p className="text-sm text-muted-foreground">{quote.destinationCountry}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validité */}
        <Card>
          <CardHeader>
            <CardTitle>Validité</CardTitle>
            <CardDescription>
              Période de validité du devis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Créé le</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(quote.createdAt).toLocaleDateString('fr-FR', {
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
                <p className="text-sm font-medium">Valide jusqu'au</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(quote.validUntil).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détails de la marchandise */}
      <Card>
        <CardHeader>
          <CardTitle>Détails de la marchandise</CardTitle>
          <CardDescription>
            Informations sur le contenu à transporter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Box className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-sm text-muted-foreground">
                  {formatCargoType(quote.cargoType)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Weight className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Poids</p>
                <p className="text-sm text-muted-foreground">
                  {quote.weight} kg
                </p>
              </div>
            </div>

            {quote.volume && (
              <div className="flex items-center gap-3">
                <Box className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Volume</p>
                  <p className="text-sm text-muted-foreground">
                    {quote.volume} m³
                  </p>
                </div>
              </div>
            )}
          </div>

          {quote.transportMode && quote.transportMode.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Modes de transport</p>
              <div className="flex gap-2">
                {quote.transportMode.map((mode) => (
                  <Badge key={mode} variant="secondary">
                    {formatTransportMode(mode)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tarification */}
      <Card>
        <CardHeader>
          <CardTitle>Tarification</CardTitle>
          <CardDescription>
            Montant du devis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Euro className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Coût estimé</p>
              <p className="text-3xl font-bold">
                {quote.estimatedCost.toFixed(2)} {quote.currency}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique des modifications */}
      {(quote.acceptedAt || quote.rejectedAt) && (
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quote.acceptedAt && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Accepté le</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(quote.acceptedAt).toLocaleString('fr-FR')}
                  </p>
                  {quote.acceptedBy && (
                    <p className="text-xs text-muted-foreground">
                      Par {quote.acceptedBy.name || quote.acceptedBy.email}
                    </p>
                  )}
                </div>
              </div>
            )}

            {quote.rejectedAt && (
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Rejeté le</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(quote.rejectedAt).toLocaleString('fr-FR')}
                  </p>
                  {quote.rejectedBy && (
                    <p className="text-xs text-muted-foreground">
                      Par {quote.rejectedBy.name || quote.rejectedBy.email}
                    </p>
                  )}
                  {quote.rejectionReason && (
                    <p className="text-sm mt-1">
                      <span className="font-medium">Raison :</span> {quote.rejectionReason}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card>
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
                  {new Date(quote.createdAt).toLocaleDateString('fr-FR', {
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
                  {new Date(quote.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {quote.createdBy && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Créé par</p>
                  <p className="text-sm text-muted-foreground">
                    {quote.createdBy.name || quote.createdBy.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        {(quote.status === 'DRAFT' || quote.status === 'SENT') && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/quotes/${quote.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </Button>
        )}

        {quote.status === 'DRAFT' && (
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        )}

        {quote.status === 'SENT' && !isExpired && (
          <>
            <Button variant="default" size="sm">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Accepter
            </Button>
            <Button variant="destructive" size="sm">
              <XCircle className="mr-2 h-4 w-4" />
              Rejeter
            </Button>
          </>
        )}

        {quote.status === 'ACCEPTED' && !quote.shipment && (
          <Button variant="default" size="sm" asChild>
            <Link href={`/dashboard/shipments/new?quoteId=${quote.id}`}>
              <FileText className="mr-2 h-4 w-4" />
              Créer une expédition
            </Link>
          </Button>
        )}

        {quote.shipment && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/shipments/${quote.shipment.id}`}>
              <FileText className="mr-2 h-4 w-4" />
              Voir l'expédition
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
