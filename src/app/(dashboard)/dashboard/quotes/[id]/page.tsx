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
  CurrencyEur,
  PencilSimple,
  Trash,
  Buildings,
  Scales,
  Cube,
  Package,
  CheckCircle,
  XCircle,
  WarningCircle,
  Clock,
} from '@phosphor-icons/react/dist/ssr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getQuoteAction } from '@/modules/quotes';
import { QuoteStatus } from '@/lib/db/enums';
import { getSession } from '@/lib/auth/config';
import { QuoteAgentActions } from '@/components/quotes/quote-agent-actions';

/**
 * Fonction utilitaire pour formater le statut en français
 * Inclut les nouveaux statuts du workflow agent
 */
function formatStatus(status: QuoteStatus): string {
  const statusMap: Record<QuoteStatus, string> = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    REJECTED: 'Rejeté',
    EXPIRED: 'Expiré',
    IN_TREATMENT: 'En traitement',
    VALIDATED: 'Validé',
    CANCELLED: 'Annulé',
  };

  return statusMap[status] || status;
}

/**
 * Fonction utilitaire pour obtenir la variante du badge selon le statut
 * Inclut les nouveaux statuts du workflow agent
 */
function getStatusVariant(status: QuoteStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'ACCEPTED' || status === 'VALIDATED') return 'default';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'destructive';
  if (status === 'DRAFT' || status === 'EXPIRED') return 'secondary';
  if (status === 'IN_TREATMENT') return 'outline'; // Bleu/outline pour "en cours"
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
 * Inclut les nouveaux statuts du workflow agent
 */
function getStatusIcon(status: QuoteStatus) {
  switch (status) {
    case 'ACCEPTED':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'VALIDATED':
      return <CheckCircle className="h-5 w-5 text-emerald-600" />;
    case 'REJECTED':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'CANCELLED':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'EXPIRED':
      return <WarningCircle className="h-5 w-5 text-orange-600" />;
    case 'SENT':
      return <Clock className="h-5 w-5 text-blue-600" />;
    case 'IN_TREATMENT':
      return <Clock className="h-5 w-5 text-primary" />;
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

  // Récupérer le devis et la session en parallèle
  const [result, session] = await Promise.all([
    getQuoteAction(id),
    getSession(),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  const quote = result.data;
  const userRole = session?.user?.role || 'CLIENT';

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
              <h1 className="text-4xl font-bold tracking-tight">{quote.quoteNumber}</h1>
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
              <WarningCircle className="h-5 w-5 text-orange-600" />
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
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Buildings className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-semibold text-lg">{quote.client?.name || quote.contactName || 'Non assigné'}</p>
              <p className="text-sm text-muted-foreground">{quote.client?.email || quote.contactEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations détaillées */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Itinéraire */}
        <Card className="dashboard-card">
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
        <Card className="dashboard-card">
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
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Détails de la marchandise</CardTitle>
          <CardDescription>
            Informations sur le contenu à transporter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-sm text-muted-foreground">
                  {formatCargoType(quote.cargoType)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Scales className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Poids</p>
                <p className="text-sm text-muted-foreground">
                  {quote.weight} kg
                </p>
              </div>
            </div>

            {quote.length && quote.width && quote.height && (
              <div className="flex items-center gap-3">
                <Cube className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dimensions</p>
                  <p className="text-sm text-muted-foreground">
                    {quote.length} × {quote.width} × {quote.height} m
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
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Tarification</CardTitle>
          <CardDescription>
            Montant du devis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <CurrencyEur className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Coût estimé</p>
              <p className="text-4xl font-bold">
                {quote.estimatedCost.toFixed(2)} {quote.currency}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique des modifications */}
      {(quote.acceptedAt || quote.rejectedAt) && (
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quote.acceptedAt && (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Accepté le</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(quote.acceptedAt).toLocaleString('fr-FR')}
                  </p>
                  {quote.user && (
                    <p className="text-xs text-muted-foreground">
                      Par {quote.user.name || quote.user.email}
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
                  {quote.user && (
                    <p className="text-xs text-muted-foreground">
                      Par {quote.user.name || quote.user.email}
                    </p>
                  )}
                  {quote.cancelReason && (
                    <p className="text-sm mt-1">
                      <span className="font-medium">Raison :</span> {quote.cancelReason}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

            {quote.user && (
              <div className="flex items-center gap-3">
                <Buildings className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Créé par</p>
                  <p className="text-sm text-muted-foreground">
                    {quote.user.name || quote.user.email}
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
              Traitement et gestion du devis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuoteAgentActions
              quoteId={quote.id}
              quoteNumber={quote.quoteNumber}
              quoteStatus={quote.status}
              estimatedCost={quote.estimatedCost}
              currency={quote.currency}
              originCountry={quote.originCountry}
              destinationCountry={quote.destinationCountry}
              userRole={userRole}
            />
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ACTIONS GÉNÉRALES */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-2 flex-wrap">
        {/* Modifier - visible pour DRAFT et SENT */}
        {(quote.status === 'DRAFT' || quote.status === 'SENT') && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/quotes/${quote.id}/edit`}>
              <PencilSimple className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </Button>
        )}

        {/* Supprimer - visible pour DRAFT uniquement */}
        {quote.status === 'DRAFT' && (
          <Button variant="destructive" size="sm">
            <Trash className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        )}

        {/* Voir l'expédition - visible si une expédition est liée */}
        {quote.shipment && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/shipments/${quote.shipment.id}`}>
              <FileText className="mr-2 h-4 w-4" />
              Voir l'expédition ({quote.shipment.trackingNumber})
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
