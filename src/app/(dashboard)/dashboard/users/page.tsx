/**
 * Page : Gestion des Utilisateurs (Admin)
 *
 * Interface complète de gestion des utilisateurs permettant aux administrateurs de :
 * - Visualiser tous les utilisateurs avec statistiques (grille de cards)
 * - Créer de nouveaux utilisateurs
 * - Modifier les rôles et permissions
 * - Désactiver/réactiver des comptes
 * - Assigner des utilisateurs à des entreprises
 *
 * Sécurité : Réservé aux administrateurs uniquement
 *
 * @route /dashboard/users
 */

import Link from 'next/link';
import {
  UsersThree,
  Shield,
  CheckCircle,
  XCircle,
  Plus,
  Buildings,
  Phone,
  Package,
  FileText,
  Envelope,
  Prohibit,
  Key,
} from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { requireAdmin } from '@/lib/auth/config';
import { getUsersAction } from '@/modules/users';
import { getRoleLabel, getRoleBadgeVariant } from '@/modules/users';
import {
  UserCreateDialog,
  UserRoleAction,
  UserStatusAction,
  UserCompanyAction,
  UserPermissionsAction,
} from '@/components/users';

/**
 * Composant principal : Page de gestion des utilisateurs
 *
 * Server Component qui récupère les données et les affiche
 * Next.js 16 : searchParams est une Promise
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    role?: string;
    status?: string;
    companyId?: string;
  }>;
}) {
  // Vérifier que l'utilisateur est admin
  await requireAdmin();

  // Parser les searchParams (Next.js 16 - params est une Promise)
  const params = await searchParams;
  const page = parseInt(params.page || '1');

  // Récupérer les données avec filtres
  const result = await getUsersAction({
    page,
    limit: 20,
    search: params.search,
    role: params.role as any,
    status: (params.status as any) || 'all',
    companyId: params.companyId,
  });

  // Gestion des erreurs
  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs et leurs permissions
          </p>
        </div>
        <Card className="p-6">
          <p className="text-destructive">
            Erreur lors du chargement des utilisateurs :{' '}
            {result.error || 'Erreur inconnue'}
          </p>
        </Card>
      </div>
    );
  }

  const { users, stats, pagination } = result.data;
  const totalPages = pagination.totalPages;

  /**
   * Fonction helper pour générer les initiales d'un nom
   * Utilisé pour l'avatar
   */
  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-6">
      {/* En-tête de page avec bouton de création */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs et leurs permissions
          </p>
        </div>
        <UserCreateDialog>
          <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-5 w-5" weight="fill" />
            Nouvel utilisateur
          </Button>
        </UserCreateDialog>
      </div>

      <Separator />

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total utilisateurs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total utilisateurs
            </CardTitle>
            <UsersThree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        {/* Administrateurs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Administrateurs
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>

        {/* Actifs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.active}
            </div>
          </CardContent>
        </Card>

        {/* Désactivés */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Désactivés</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* TODO: Barre de filtres (MagnifyingGlass + Role + Status) */}
      {/* Pour l'instant, on affiche tous les utilisateurs */}
      {/* Cette fonctionnalité sera ajoutée dans une prochaine itération */}

      {/* Liste des utilisateurs */}
      {users.length === 0 ? (
        // État vide
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <UsersThree className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Aucun utilisateur trouvé
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {params.search
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par créer votre premier utilisateur'}
            </p>
            <UserCreateDialog>
              <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-5 w-5" weight="fill" />
                Créer un utilisateur
              </Button>
            </UserCreateDialog>
          </div>
        </Card>
      ) : (
        // Grille de cartes utilisateurs
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card
              key={user.id}
              className="hover:bg-accent/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar avec initiales */}
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      {/* Nom + Badge statut */}
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base truncate">
                          {user.name}
                        </CardTitle>
                        {user.emailVerified ? (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle className="mr-1 h-3 w-3 text-green-600" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <XCircle className="mr-1 h-3 w-3" />
                            Inactif
                          </Badge>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Envelope className="h-3 w-3" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Informations utilisateur */}
                <div className="space-y-2 text-sm">
                  {/* Rôle */}
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Rôle :</span>
                    <Badge variant={getRoleBadgeVariant(user.role as any)}>
                      {getRoleLabel(user.role as any)}
                    </Badge>
                  </div>

                  {/* Entreprise */}
                  <div className="flex items-center gap-2">
                    <Buildings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Entreprise :</span>
                    <span className="truncate">
                      {user.company?.name || 'Aucune'}
                    </span>
                  </div>

                  {/* Téléphone */}
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Statistiques d'activité */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {user._count?.createdShipments || 0} expédition(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {user._count?.createdInvoices || 0} facture(s)
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Boutons d'action (grille 2x2) */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Modifier le rôle */}
                  <UserRoleAction
                    userId={user.id}
                    currentRole={user.role as any}
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Shield className="mr-2 h-3 w-3" />
                      Rôle
                    </Button>
                  </UserRoleAction>

                  {/* Gérer les permissions */}
                  <UserPermissionsAction
                    userId={user.id}
                    userName={user.name}
                    userRole={user.role as any}
                    currentPermissions={
                      (user.permissions as any)?.custom || []
                    }
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Key className="mr-2 h-3 w-3" />
                      Permissions
                    </Button>
                  </UserPermissionsAction>

                  {/* Assigner entreprise */}
                  <UserCompanyAction
                    userId={user.id}
                    userName={user.name}
                    currentCompanyId={user.companyId}
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Buildings className="mr-2 h-3 w-3" />
                      Entreprise
                    </Button>
                  </UserCompanyAction>

                  {/* Activer/Désactiver */}
                  <UserStatusAction
                    userId={user.id}
                    userName={user.name}
                    currentStatus={user.emailVerified}
                  >
                    <Button
                      variant={user.emailVerified ? 'outline' : 'default'}
                      size="sm"
                      className="w-full"
                    >
                      {user.emailVerified ? (
                        <>
                          <Prohibit className="mr-2 h-3 w-3" />
                          Désactiver
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-3 w-3" />
                          Activer
                        </>
                      )}
                    </Button>
                  </UserStatusAction>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages} • {pagination.total} utilisateur
            {pagination.total > 1 ? 's' : ''} au total
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/users?page=${page - 1}${params.search ? `&search=${params.search}` : ''}${params.role ? `&role=${params.role}` : ''}${params.status ? `&status=${params.status}` : ''}`}
                >
                  Précédent
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/users?page=${page + 1}${params.search ? `&search=${params.search}` : ''}${params.role ? `&role=${params.role}` : ''}${params.status ? `&status=${params.status}` : ''}`}
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
