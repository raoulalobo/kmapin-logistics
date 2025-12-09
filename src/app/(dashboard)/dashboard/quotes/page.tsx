/**
 * Page Liste des Devis
 *
 * Affiche tous les devis avec :
 * - Recherche par numéro de devis, client, route
 * - Filtrage par statut
 * - Pagination
 * - Liens vers les détails et création
 * - Statistiques rapides (brouillons, envoyés, acceptés, rejetés)
 *
 * Utilise le module quotes existant avec getQuotesAction
 */

import Link from 'next/link';
import { Plus, FileText, MapPin, Euro, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getQuotesAction } from '@/modules/quotes';
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
    GENERAL: 'Général',
    FOOD: 'Alimentaire',
    ELECTRONICS: 'Électronique',
    PHARMACEUTICALS: 'Pharma',
    CHEMICALS: 'Chimique',
    CONSTRUCTION: 'Construction',
    TEXTILES: 'Textile',
    AUTOMOTIVE: 'Auto',
    MACHINERY: 'Machines',
    PERISHABLE: 'Périssable',
    HAZARDOUS: 'Dangereux',
  };

  return cargoMap[type] || type;
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const result = await getQuotesAction(
    page,
    20,
    undefined,
    params.status as QuoteStatus | undefined,
    params.search
  );

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devis</h1>
          <p className="text-muted-foreground">
            Gérez vos devis et estimations tarifaires
          </p>
        </div>
        <Card className="p-6">
          <p className="text-destructive">Erreur lors du chargement des devis</p>
        </Card>
      </div>
    );
  }

  const { quotes, pagination } = result.data;

  // Calculer les statistiques
  const stats = {
    total: pagination.total,
    draft: quotes.filter(q => q.status === 'DRAFT').length,
    sent: quotes.filter(q => q.status === 'SENT').length,
    accepted: quotes.filter(q => q.status === 'ACCEPTED').length,
    rejected: quotes.filter(q => q.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devis</h1>
          <p className="text-muted-foreground">
            Gérez vos devis et estimations tarifaires
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/quotes/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau devis
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total devis</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tous les devis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Envoyés</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En attente de réponse
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Acceptés</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Devis validés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Non envoyés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des devis */}
      {quotes.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun devis trouvé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {params.search
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par créer votre premier devis'}
            </p>
            <Button asChild>
              <Link href="/dashboard/quotes/new">
                <Plus className="mr-2 h-4 w-4" />
                Créer un devis
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card key={quote.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Informations principales */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <Link
                          href={`/dashboard/quotes/${quote.id}`}
                          className="text-lg font-semibold hover:underline"
                        >
                          {quote.quoteNumber}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {quote.company.name}
                        </p>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{quote.originCountry}</span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{quote.destinationCountry}</span>
                      </div>
                    </div>

                    {/* Détails */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatCargoType(quote.cargoType)}</span>
                      <span>•</span>
                      <span>{quote.weight} kg</span>
                      {quote.volume && (
                        <>
                          <span>•</span>
                          <span>{quote.volume} m³</span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        Valide jusqu'au {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {/* Coût */}
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {quote.estimatedCost.toFixed(2)} {quote.currency}
                      </span>
                    </div>
                  </div>

                  {/* Statut et actions */}
                  <div className="flex flex-col items-end gap-3">
                    <Badge variant={getStatusVariant(quote.status)}>
                      {formatStatus(quote.status)}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/quotes/${quote.id}`}>
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
            Page {pagination.page} sur {pagination.totalPages} • {pagination.total} devis au total
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/quotes?page=${pagination.page - 1}${params.status ? `&status=${params.status}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                >
                  Précédent
                </Link>
              </Button>
            )}
            {pagination.page < pagination.totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/quotes?page=${pagination.page + 1}${params.status ? `&status=${params.status}` : ''}${params.search ? `&search=${params.search}` : ''}`}
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
