/**
 * Page Corbeille des Devis (Soft Delete)
 *
 * Affiche les devis supprimés (soft-deleted) avec possibilité de restauration.
 * Accessible uniquement aux ADMIN et OPERATIONS_MANAGER.
 *
 * Les devis supprimés sont ceux ayant un champ `deletedAt` non-null.
 * Chaque devis affiche :
 * - Le numéro de devis et le client
 * - La date de suppression et qui l'a supprimé
 * - Un bouton "Restaurer" pour remettre le devis dans la liste active
 *
 * @module app/(dashboard)/dashboard/quotes/trash
 */

import { requireAuth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Trash, FileText, MapPin, ArrowLeft, CurrencyEur } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getDeletedQuotesAction } from '@/modules/quotes';
import { QuoteRestoreButton } from '@/components/quotes';

/**
 * Labels français pour chaque statut de devis (réutilisé depuis la page principale)
 */
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  SENT: 'Envoyé',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
  IN_TREATMENT: 'En traitement',
  VALIDATED: 'Validé',
  CANCELLED: 'Annulé',
};

export default async function QuotesTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // Vérifier l'authentification et le rôle
  const session = await requireAuth();
  const userRole = session.user.role;

  // Rediriger les utilisateurs non autorisés
  if (userRole !== 'ADMIN' && userRole !== 'OPERATIONS_MANAGER') {
    redirect('/dashboard/quotes');
  }

  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const result = await getDeletedQuotesAction(page, 20);

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Corbeille</h1>
          <p className="text-muted-foreground">
            Devis supprimés pouvant être restaurés
          </p>
        </div>
        <Card className="p-6">
          <p className="text-destructive">
            {result.error || 'Erreur lors du chargement de la corbeille'}
          </p>
        </Card>
      </div>
    );
  }

  const { quotes, pagination } = result.data;

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Trash className="h-8 w-8 text-muted-foreground" />
            Corbeille
          </h1>
          <p className="text-muted-foreground">
            {pagination.total} devis supprimé{pagination.total > 1 ? 's' : ''} — cliquez sur &quot;Restaurer&quot; pour remettre un devis dans la liste active
          </p>
        </div>
        <Button variant="outline" size="lg" asChild className="gap-2">
          <Link href="/dashboard/quotes">
            <ArrowLeft className="h-5 w-5" />
            Retour aux devis
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Liste des devis supprimés */}
      {quotes.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Trash className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">La corbeille est vide</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Aucun devis supprimé pour le moment
            </p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/quotes">
                Retour aux devis
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote: any) => (
            <Card key={quote.id} className="hover:bg-accent/50 transition-colors border-dashed">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Informations principales */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-lg font-semibold text-muted-foreground">
                          {quote.quoteNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {quote.client?.name || 'Client inconnu'}
                        </p>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{quote.originCountry}</span>
                      </div>
                      <span className="text-muted-foreground">&rarr;</span>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{quote.destinationCountry}</span>
                      </div>
                    </div>

                    {/* Détails suppression */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        <CurrencyEur className="inline h-4 w-4 mr-1" />
                        {quote.estimatedCost.toFixed(2)} {quote.currency}
                      </span>
                      <span>&bull;</span>
                      <span>
                        Supprimé le {new Date(quote.deletedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {quote.deletedBy && (
                        <>
                          <span>&bull;</span>
                          <span>
                            Par {quote.deletedBy.name || quote.deletedBy.email}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Statut et actions */}
                  <div className="flex flex-col items-end gap-3">
                    {/* Badge de statut au moment de la suppression */}
                    <Badge variant="secondary" className="opacity-60">
                      {STATUS_LABELS[quote.status] || quote.status}
                    </Badge>

                    {/* Bouton de restauration */}
                    <QuoteRestoreButton
                      quoteId={quote.id}
                      quoteNumber={quote.quoteNumber}
                    />
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
            Page {pagination.page} sur {pagination.totalPages} &bull; {pagination.total} devis supprimé{pagination.total > 1 ? 's' : ''} au total
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/quotes/trash?page=${pagination.page - 1}`}>
                  Précédent
                </Link>
              </Button>
            )}
            {pagination.page < pagination.totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/quotes/trash?page=${pagination.page + 1}`}>
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
