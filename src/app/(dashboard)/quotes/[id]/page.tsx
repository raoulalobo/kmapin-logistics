/**
 * Page : Détails d'un devis
 *
 * Affiche toutes les informations d'un devis :
 * - Informations générales (numéro, client, statut)
 * - Route (origine → destination)
 * - Détails de la marchandise
 * - Modes de transport
 * - Coût estimé et validité
 * - Factures associées
 *
 * @route /dashboard/quotes/[id]
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Package,
  Truck,
  CurrencyEur,
  Calendar,
  Building,
  CheckCircle,
  XCircle,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { getQuoteAction } from '@/modules/quotes';
import { TransportMode } from '@/lib/db/enums';
import { QuoteActions } from '@/components/quotes/quote-actions';
import { DocumentsSection } from '@/components/documents';

/**
 * Mapper les statuts de devis vers des variantes de badge
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACCEPTED':
    case 'VALIDATED':
      return 'default';
    case 'DRAFT':
    case 'EXPIRED':
      return 'secondary';
    case 'REJECTED':
    case 'CANCELLED':
      return 'destructive';
    case 'SUBMITTED':
    case 'SENT':
    case 'IN_TREATMENT':
      return 'outline';
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
    SUBMITTED: 'Soumis',       // Nouveau : soumis par le client, en attente d'offre
    SENT: 'Offre envoyée',     // Renommé : offre formelle de l'agent
    ACCEPTED: 'Accepté',
    REJECTED: 'Rejeté',
    EXPIRED: 'Expiré',
    IN_TREATMENT: 'En traitement',
    VALIDATED: 'Validé',
    CANCELLED: 'Annulé',
  };
  return translations[status] || status;
}

/**
 * Traduire les types de cargo en français
 */
function translateCargoType(type: string): string {
  const translations: Record<string, string> = {
    GENERAL: 'Marchandise générale',
    FRAGILE: 'Fragile',
    PERISHABLE: 'Périssable',
    DANGEROUS: 'Dangereuse',
    OVERSIZED: 'Hors gabarit',
    HIGH_VALUE: 'Haute valeur',
  };
  return translations[type] || type;
}

/**
 * Traduire les modes de transport en français
 */
function translateTransportMode(mode: TransportMode): string {
  const translations: Record<TransportMode, string> = {
    [TransportMode.SEA]: 'Maritime',
    [TransportMode.AIR]: 'Aérien',
    [TransportMode.ROAD]: 'Routier',
    [TransportMode.RAIL]: 'Ferroviaire',
  };
  return translations[mode];
}

/**
 * Composant serveur : Détails d'un devis
 */
export default async function QuoteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Récupérer le devis
  const result = await getQuoteAction(id);

  // Gérer les erreurs
  if (!result.success || !result.data) {
    notFound();
  }

  const quote = result.data;

  // Calculer si le devis est expiré et les jours restants
  const now = new Date();
  const validUntil = new Date(quote.validUntil);
  const isExpired = now > validUntil;
  const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/quotes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-mono">
              {quote.quoteNumber}
            </h1>
            <p className="text-muted-foreground">
              Détails du devis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(quote.status)} className="text-lg px-4 py-2">
            {translateStatus(quote.status)}
          </Badge>
        </div>
      </div>

      {/* Alerte d'expiration */}
      {isExpired && quote.status === 'SENT' && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <WarningCircle className="h-5 w-5" />
              <p className="text-sm font-medium">
                Ce devis a expiré le {validUntil.toLocaleDateString('fr-FR')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerte expiration proche */}
      {!isExpired && quote.status === 'SENT' && daysLeft <= 3 && daysLeft >= 0 && (
        <Card className="border-orange-600">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-600">
              <WarningCircle className="h-5 w-5" />
              <p className="text-sm font-medium">
                Ce devis expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client</p>
              {/* Fallback si client non enregistré */}
              <p className="text-lg font-semibold">{quote.client?.name || quote.originContactName || 'Client non enregistré'}</p>
              <p className="text-sm text-muted-foreground">{quote.client?.email || quote.originContactEmail || '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dates importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Créé le</span>
              <span className="font-medium">
                {new Date(quote.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valide jusqu'au</span>
              <span className={`font-medium ${isExpired ? 'text-destructive' : daysLeft <= 3 ? 'text-orange-600' : ''}`}>
                {validUntil.toLocaleDateString('fr-FR')}
              </span>
            </div>
            {quote.status === 'SENT' && !isExpired && daysLeft >= 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Jours restants</span>
                <span className={`font-semibold ${daysLeft <= 3 ? 'text-orange-600' : 'text-green-600'}`}>
                  {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {quote.acceptedAt && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Accepté le</span>
                  <span className="font-medium text-green-600">
                    {new Date(quote.acceptedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </>
            )}
            {quote.rejectedAt && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Rejeté le</span>
                  <span className="font-medium text-destructive">
                    {new Date(quote.rejectedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Route */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Itinéraire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-2">
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-semibold text-lg">{quote.originCountry}</p>
              <p className="text-sm text-muted-foreground">Origine</p>
            </div>
            <div className="flex-1 mx-8">
              <Separator className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2">
                  <Truck className="h-6 w-6 text-muted-foreground" />
                </div>
              </Separator>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-2">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <p className="font-semibold text-lg">{quote.destinationCountry}</p>
              <p className="text-sm text-muted-foreground">Destination</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Marchandise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Détails de la marchandise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge variant="secondary">{translateCargoType(quote.cargoType)}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Poids</span>
              <span className="font-medium">{quote.weight} kg</span>
            </div>
            {quote.volume && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Volume</span>
                <span className="font-medium">{quote.volume} m³</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transport */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Modes de transport
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quote.transportMode.map((mode) => (
                <Badge key={mode} variant="outline" className="text-sm">
                  {translateTransportMode(mode)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coût */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CurrencyEur className="h-5 w-5" />
            Tarification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Coût estimé</p>
              <p className="text-3xl font-bold text-primary">
                {quote.estimatedCost.toFixed(2)} {quote.currency}
              </p>
            </div>
            {quote.status === 'ACCEPTED' && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Devis accepté</p>
                  <p className="text-xs text-green-700">
                    Le {new Date(quote.acceptedAt!).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            )}
            {quote.status === 'REJECTED' && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-md">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">Devis rejeté</p>
                  <p className="text-xs text-red-700">
                    Le {new Date(quote.rejectedAt!).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions sur le devis */}
      <QuoteActions
        quoteId={quote.id}
        quoteStatus={quote.status}
        isExpired={isExpired}
      />

      {/* Gestion documentaire */}
      <DocumentsSection entityId={id} entityType="quote" />
    </div>
  );
}
