/**
 * Page : Dashboard Principal
 *
 * Vue d'ensemble de l'activité avec KPIs, statistiques
 * et raccourcis vers les fonctionnalités principales
 */

import { Suspense } from 'react';
import { getSession } from '@/lib/auth/config';
import {
  Package,
  TrendUp,
  UsersThree,
  CurrencyDollar,
  MapPin,
  Clock,
  WarningCircle,
  CheckCircle,
} from '@phosphor-icons/react/dist/ssr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  getDashboardStats,
  getRecentShipments,
  getRevenueChartData,
  getShipmentsChartData,
} from '@/modules/dashboard';
import { RevenueChart, ShipmentsChart } from '@/components/dashboard';

/**
 * Composant de carte KPI réutilisable
 */
function StatCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColor =
    trend === 'up'
      ? 'text-green-600'
      : trend === 'down'
      ? 'text-red-600'
      : 'text-muted-foreground';

  return (
    <Card className="dashboard-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <Icon className="h-4 w-4 text-[#003D82]" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{value}</div>
        {change && (
          <p className={`text-xs ${trendColor} mt-1`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Composant pour afficher une expédition récente
 */
function RecentShipment({
  id,
  tracking,
  destination,
  status,
  date,
}: {
  id: string;
  tracking: string;
  destination: string;
  status: string;
  date: Date;
}) {
  // Mapper les statuts aux configurations visuelles
  const statusConfig: Record<string, { label: string; color: string; icon: typeof MapPin }> = {
    PENDING: { label: 'En attente', color: 'text-orange-600 bg-orange-50', icon: Clock },
    CONFIRMED: { label: 'Confirmée', color: 'text-blue-600 bg-blue-50', icon: Package },
    IN_TRANSIT: { label: 'En transit', color: 'text-blue-600 bg-blue-50', icon: MapPin },
    AT_PORT: { label: 'Au port', color: 'text-purple-600 bg-purple-50', icon: MapPin },
    CUSTOMS: { label: 'Douane', color: 'text-yellow-600 bg-yellow-50', icon: WarningCircle },
    OUT_FOR_DELIVERY: { label: 'En livraison', color: 'text-indigo-600 bg-indigo-50', icon: TrendUp },
    DELIVERED: { label: 'Livrée', color: 'text-green-600 bg-green-50', icon: CheckCircle },
    CANCELLED: { label: 'Annulée', color: 'text-red-600 bg-red-50', icon: WarningCircle },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  // Formater la date relative
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  let timeAgo: string;

  if (diffInMinutes < 60) {
    timeAgo = `Il y a ${diffInMinutes}min`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    timeAgo = `Il y a ${hours}h`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    timeAgo = `Il y a ${days}j`;
  }

  return (
    <Link href={`/dashboard/shipments/${id}`}>
      <div className="flex items-center gap-4 py-3 hover:bg-muted/50 rounded-lg transition-colors px-2 -mx-2">
        <div className={`rounded-lg p-2 ${config.color}`}>
          <StatusIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-none">{tracking}</p>
          <p className="text-sm text-muted-foreground">{destination}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
      </div>
    </Link>
  );
}

/**
 * Page Dashboard
 */
export default async function DashboardPage() {
  // Récupérer l'utilisateur connecté
  const session = await getSession();
  const user = session?.user;
  const userRole = user?.role || 'CLIENT';

  // Déterminer si l'utilisateur est un CLIENT ou un ADMIN/MANAGER
  const isClient = userRole === 'CLIENT' || userRole === 'VIEWER';

  // Récupérer les données du dashboard
  const [stats, recentShipments, revenueData, shipmentsData] = await Promise.all([
    getDashboardStats(),
    getRecentShipments(4),
    getRevenueChartData(),
    getShipmentsChartData(),
  ]);

  // Formatter les changements avec signe + ou -
  const formatChange = (value: number, suffix: string = '% vs mois dernier') => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}${suffix}`;
  };

  return (
    <div className="space-y-8">
      {/* En-tête avec message de bienvenue */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          Bienvenue, {user?.name || 'Utilisateur'} 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Voici un aperçu de votre activité logistique
        </p>
      </div>

      {/* Cartes de statistiques (KPIs) */}
      <div className={`grid gap-4 md:grid-cols-2 ${isClient ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
        <StatCard
          title={isClient ? "Mes expéditions actives" : "Expéditions actives"}
          value={stats.activeShipments}
          change={formatChange(stats.shipmentsGrowth)}
          icon={Package}
          trend={stats.shipmentsGrowth >= 0 ? 'up' : 'down'}
        />

        {/* ADMIN/MANAGER uniquement : Clients actifs */}
        {!isClient && (
          <StatCard
            title="Clients actifs"
            value={stats.activeClients}
            change={`+${stats.newClientsThisMonth} nouveaux ce mois`}
            icon={UsersThree}
            trend={stats.newClientsThisMonth > 0 ? 'up' : 'neutral'}
          />
        )}

        {/* ADMIN/MANAGER uniquement : Chiffre d'affaires */}
        {!isClient && (
          <StatCard
            title="Chiffre d'affaires"
            value={`${stats.totalRevenue.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}`}
            change={formatChange(stats.revenueGrowth)}
            icon={CurrencyDollar}
            trend={stats.revenueGrowth >= 0 ? 'up' : 'down'}
          />
        )}
      </div>

      {/* Graphiques d'évolution - ADMIN/MANAGER uniquement */}
      {!isClient && (
        <div className="grid gap-6 md:grid-cols-2">
          <RevenueChart data={revenueData} />
          <ShipmentsChart data={shipmentsData} />
        </div>
      )}

      {/* Grille de contenu principal */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Expéditions récentes */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Expéditions récentes</CardTitle>
            <CardDescription>
              Aperçu de vos dernières expéditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentShipments.length > 0 ? (
                recentShipments.map((shipment) => (
                  <RecentShipment
                    key={shipment.id}
                    id={shipment.id}
                    tracking={shipment.trackingNumber}
                    destination={`${shipment.destination}, ${shipment.destinationCountry}`}
                    status={shipment.status}
                    date={shipment.createdAt}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune expédition récente
                </p>
              )}
            </div>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/dashboard/shipments">
                Voir toutes les expéditions
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Alertes et notifications */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Alertes</CardTitle>
            <CardDescription>
              Événements nécessitant votre attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Devis en attente de réponse */}
              {stats.pendingQuotes > 0 && (
                <Link href="/dashboard/quotes?status=SENT">
                  <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 hover:bg-blue-100 transition-colors cursor-pointer">
                    <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {stats.pendingQuotes} devi{stats.pendingQuotes > 1 ? 's' : ''} en attente
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Clients en attente de réponse
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              {/* Livraisons du jour (positif) */}
              {stats.deliveredToday > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {stats.deliveredToday} livraison{stats.deliveredToday > 1 ? 's' : ''} réussie{stats.deliveredToday > 1 ? 's' : ''} aujourd'hui
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Excellente performance
                    </p>
                  </div>
                </div>
              )}

              {/* Message si aucune alerte */}
              {stats.pendingQuotes === 0 && stats.deliveredToday === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune alerte pour le moment
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accédez rapidement aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-4 ${isClient ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {/* CLIENT : uniquement création de devis */}
            {isClient ? (
              <>
                <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6">
                  <Link href="/dashboard/quotes/new">
                    <CurrencyDollar className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Demander un devis</div>
                      <div className="text-xs text-muted-foreground">
                        Obtenir une estimation
                      </div>
                    </div>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6">
                  <Link href="/dashboard/tracking">
                    <MapPin className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Suivre mes colis</div>
                      <div className="text-xs text-muted-foreground">
                        Tracking en temps réel
                      </div>
                    </div>
                  </Link>
                </Button>
              </>
            ) : (
              /* ADMIN/MANAGER : toutes les actions */
              <>
                <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6">
                  <Link href="/dashboard/shipments">
                    <Package className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Expéditions</div>
                      <div className="text-xs text-muted-foreground">
                        Gérer les expéditions
                      </div>
                    </div>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6">
                  <Link href="/dashboard/quotes/new">
                    <CurrencyDollar className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Nouveau devis</div>
                      <div className="text-xs text-muted-foreground">
                        Générer un devis
                      </div>
                    </div>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6">
                  <Link href="/dashboard/clients/new">
                    <UsersThree className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Nouveau client</div>
                      <div className="text-xs text-muted-foreground">
                        Ajouter un client
                      </div>
                    </div>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
