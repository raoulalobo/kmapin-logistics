/**
 * Page : Liste des Dépôts
 *
 * Server Component affichant tous les dépôts actifs sous forme de cards.
 * Chaque card montre le nom, code, ville/pays, badge "Par défaut" et count contacts.
 * Bouton "Nouveau dépôt" visible uniquement pour les ADMIN.
 *
 * @route /dashboard/depots
 */

import Link from 'next/link';
import { Plus, Warehouse, MapPin, Users } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSession } from '@/lib/auth/config';
import { listDepots } from '@/modules/depots';

export default async function DepotsPage() {
  const session = await getSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const depots = await listDepots();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dépôts</h1>
          <p className="text-muted-foreground">
            Gérez les dépôts et entrepôts de l&apos;entreprise
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/depots/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau dépôt
            </Button>
          </Link>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total dépôts</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{depots.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Villes couvertes</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(depots.map((d) => d.city)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {depots.reduce((sum, d) => sum + d._count.contacts, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des dépôts en cards */}
      {depots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Aucun dépôt</h3>
            <p className="text-muted-foreground text-center mt-1">
              Commencez par créer votre premier dépôt pour associer des adresses à vos devis et expéditions.
            </p>
            {isAdmin && (
              <Link href="/dashboard/depots/new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un dépôt
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {depots.map((depot) => (
            <Link key={depot.id} href={`/dashboard/depots/${depot.id}`}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{depot.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">
                        {depot.code}
                      </p>
                    </div>
                    {depot.isDefault && (
                      <Badge variant="default" className="shrink-0">
                        Par défaut
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Ville / Pays */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{depot.city}, {depot.country}</span>
                  </div>

                  {/* Nombre de contacts */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>
                      {depot._count.contacts} contact{depot._count.contacts !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Téléphone / Email */}
                  {(depot.phone || depot.email) && (
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      {depot.phone && <p>{depot.phone}</p>}
                      {depot.email && <p>{depot.email}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
