/**
 * Page : Détail et édition d'un dépôt
 *
 * Server Component affichant les informations complètes d'un dépôt :
 * - Infos générales (nom, code, adresse) avec possibilité d'édition (ADMIN)
 * - Liste des contacts avec ajout/modification/suppression
 * - Statistiques d'utilisation (nombre de devis et expéditions liés)
 *
 * @route /dashboard/depots/[id]
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, EnvelopeSimple, Star } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSession } from '@/lib/auth/config';
import { getDepot } from '@/modules/depots';
import { DepotForm } from '@/components/depots/depot-form';
import { DepotContactList } from '@/components/depots/depot-contact-list';

interface DepotDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DepotDetailPage({ params }: DepotDetailPageProps) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const depot = await getDepot(id);

  if (!depot) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/depots">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{depot.name}</h1>
              {depot.isDefault && (
                <Badge variant="default">Par défaut</Badge>
              )}
            </div>
            <p className="text-muted-foreground font-mono">{depot.code}</p>
          </div>
        </div>
      </div>

      {/* Grille 2 colonnes : Infos + Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche (2/3) : Informations du dépôt */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card infos si non-admin (lecture seule) */}
          {!isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {depot.description && (
                  <p className="text-sm text-muted-foreground">{depot.description}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="text-sm">
                      <p>{depot.address}</p>
                      <p>{depot.postalCode ? `${depot.postalCode} ` : ''}{depot.city}</p>
                      <p>{depot.country}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {depot.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{depot.phone}</span>
                      </div>
                    )}
                    {depot.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <EnvelopeSimple className="h-4 w-4 text-muted-foreground" />
                        <span>{depot.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Formulaire d'édition pour les admins */
            <Card>
              <CardHeader>
                <CardTitle>Modifier le dépôt</CardTitle>
              </CardHeader>
              <CardContent>
                <DepotForm depot={depot} />
              </CardContent>
            </Card>
          )}

          {/* Statistiques d'utilisation */}
          <Card>
            <CardHeader>
              <CardTitle>Utilisation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-accent/50">
                  <div className="text-2xl font-bold">{depot._count.quotes}</div>
                  <div className="text-sm text-muted-foreground">Devis liés</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/50">
                  <div className="text-2xl font-bold">{depot._count.shipments}</div>
                  <div className="text-sm text-muted-foreground">Expéditions liées</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite (1/3) : Contacts */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DepotContactList
                depotId={depot.id}
                contacts={depot.contacts}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
