/**
 * Page Rapports et Analytics
 *
 * Affiche une vue d'ensemble détaillée des performances de l'entreprise.
 * Réutilise les statistiques du module dashboard existant.
 * Présente des KPIs sur :
 * - Chiffre d'affaires et croissance
 * - Expéditions et taux de livraison
 * - Clients actifs
 * - Alertes et notifications
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChartBar,
  TrendUp,
  TrendDown,
  UsersThreeThree,
  Package,
  CurrencyEur,
  WarningCircle,
  CheckCircle,
  Clock,
  FileText,
} from '@phosphor-icons/react/dist/ssr';
import { getDashboardStats, getRevenueChartData, getShipmentsChartData } from '@/modules/dashboard';

/**
 * Composant pour afficher un KPI avec icône et variation
 */
function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <Card className="dashboard-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trend && trendValue && (
            <Badge variant={trend === 'up' ? 'default' : 'destructive'} className="text-xs">
              {trend === 'up' ? (
                <TrendUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trendValue}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ReportsPage() {
  // Récupérer les statistiques depuis le module dashboard
  const stats = await getDashboardStats();
  const revenueChartData = await getRevenueChartData();
  const shipmentsChartData = await getShipmentsChartData();

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Rapports et Analytics</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de vos performances
        </p>
      </div>

      <Separator />

      {/* KPIs principaux - Section Financière */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance Financière</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KPICard
            title="Chiffre d'affaires total"
            value={`${stats.totalRevenue.toLocaleString('fr-FR')} €`}
            subtitle="Mois en cours"
            icon={CurrencyEur}
            trend={stats.revenueGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(stats.revenueGrowth).toFixed(1)}% vs mois dernier`}
          />

          <KPICard
            title="Revenus en attente"
            value={`${stats.pendingRevenue.toLocaleString('fr-FR')} €`}
            subtitle={`${stats.pendingInvoices} facture(s) en attente`}
            icon={Clock}
          />

          <KPICard
            title="Factures en retard"
            value={stats.overdueInvoices}
            subtitle="À relancer"
            icon={WarningCircle}
          />
        </div>
      </div>

      <Separator />

      {/* KPIs Opérationnels - Expéditions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance Opérationnelle</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Expéditions totales"
            value={stats.totalShipments}
            subtitle="Depuis le début"
            icon={Package}
            trend={stats.shipmentsGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(stats.shipmentsGrowth).toFixed(1)}% vs mois dernier`}
          />

          <KPICard
            title="Expéditions actives"
            value={stats.activeShipments}
            subtitle="En cours de traitement"
            icon={Package}
          />

          <KPICard
            title="Taux de livraison"
            value={`${stats.deliveryRate.toFixed(1)}%`}
            subtitle="Livraisons réussies"
            icon={CheckCircle}
          />

          <KPICard
            title="Livrées aujourd'hui"
            value={stats.deliveredToday}
            subtitle="Livraisons du jour"
            icon={Package}
          />
        </div>
      </div>

      <Separator />

      {/* KPIs Clients */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Gestion Clients</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title="Clients totaux"
            value={stats.totalClients}
            subtitle="Base clients"
            icon={UsersThree}
          />

          <KPICard
            title="Clients actifs"
            value={stats.activeClients}
            subtitle="Avec expéditions en cours"
            icon={UsersThree}
          />

          <KPICard
            title="Nouveaux clients"
            value={stats.newClientsThisMonth}
            subtitle="Ce mois-ci"
            icon={UsersThree}
          />
        </div>
      </div>

      <Separator />

      {/* Alertes et Notifications */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Alertes</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Devis en attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                À traiter ou envoyer
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <WarningCircle className="h-4 w-4 text-orange-500" />
                Factures impayées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground mt-1">
                En attente de paiement
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <WarningCircle className="h-4 w-4 text-red-500" />
                Factures en retard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overdueInvoices}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Échues et impayées
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Données brutes pour graphiques (en attendant les composants de graphiques) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Évolution sur 6 mois</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Données revenus */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBar className="h-5 w-5" />
                Revenus mensuels
              </CardTitle>
              <CardDescription>
                Évolution des revenus sur les 6 derniers mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {revenueChartData.map((item) => (
                  <div key={item.month} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{item.month}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.revenue.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Données expéditions */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Expéditions mensuelles
              </CardTitle>
              <CardDescription>
                Évolution des expéditions sur les 6 derniers mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {shipmentsChartData.map((item) => (
                  <div key={item.month} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{item.month}</span>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Total: {item.total}</span>
                      <span className="text-green-600">Livrées: {item.delivered}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Note pour futures améliorations */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <ChartBar className="h-8 w-8 text-muted-foreground" />
            <div>
              <h3 className="font-semibold mb-1">Graphiques à venir</h3>
              <p className="text-sm text-muted-foreground">
                Des graphiques interactifs avec Recharts seront ajoutés prochainement
                pour visualiser l&apos;évolution des revenus, expéditions et autres métriques.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
