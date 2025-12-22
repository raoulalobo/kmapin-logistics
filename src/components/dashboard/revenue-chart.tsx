/**
 * Composant : Graphique d'évolution des revenus
 *
 * Affiche un graphique en aires montrant l'évolution des revenus
 * sur les 6 derniers mois avec gradient visuel
 *
 * @module components/dashboard
 */

'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyEur } from '@phosphor-icons/react';

/**
 * Props du composant RevenueChart
 */
interface RevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
  }>;
}

/**
 * Composant de tooltip personnalisé pour afficher les valeurs
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <CurrencyEur className="h-4 w-4 text-green-600" />
        <div>
          <p className="text-sm font-medium">{payload[0].payload.month}</p>
          <p className="text-lg font-bold text-green-600">
            {payload[0].value.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Graphique d'évolution des revenus
 */
export function RevenueChart({ data }: RevenueChartProps) {
  // Calculer le total pour affichage dans le titre
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Évolution des revenus</span>
          <span className="text-2xl font-bold text-green-600">
            {totalRevenue.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </span>
        </CardTitle>
        <CardDescription>
          Revenus des 6 derniers mois (factures payées)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) =>
                `${(value / 1000).toFixed(0)}k€`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#16a34a"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
