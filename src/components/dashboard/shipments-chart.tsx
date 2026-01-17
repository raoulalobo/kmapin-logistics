/**
 * Composant : Graphique d'évolution des expéditions
 *
 * Affiche un graphique en barres comparant le nombre total d'expéditions
 * avec le nombre de livraisons réussies sur les 6 derniers mois
 *
 * @module components/dashboard
 */

'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from '@phosphor-icons/react';

/**
 * Props du composant ShipmentsChart
 */
interface ShipmentsChartProps {
  data: Array<{
    month: string;
    total: number;
    delivered: number;
  }>;
}

/**
 * Composant de tooltip personnalisé
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const deliveryRate = payload[0].payload.total > 0
    ? ((payload[0].payload.delivered / payload[0].payload.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <div className="space-y-2">
        <p className="text-sm font-medium">{payload[0].payload.month}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="font-semibold text-blue-600">{payload[0].value}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Livrées</span>
            <span className="font-semibold text-green-600">{payload[1].value}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t">
            <span className="text-xs text-muted-foreground">Taux</span>
            <span className="font-semibold">{deliveryRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Graphique d'évolution des expéditions
 */
export function ShipmentsChart({ data }: ShipmentsChartProps) {
  // Calculer les totaux
  const totalShipments = data.reduce((sum, item) => sum + item.total, 0);
  const totalDelivered = data.reduce((sum, item) => sum + item.delivered, 0);
  const overallRate = totalShipments > 0
    ? ((totalDelivered / totalShipments) * 100).toFixed(1)
    : '0';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Évolution des expéditions</span>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{totalShipments}</span>
          </div>
        </CardTitle>
        <CardDescription>
          Expéditions des 6 derniers mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '14px',
              }}
              iconType="circle"
            />
            <Bar
              dataKey="total"
              name="Total expéditions"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="delivered"
              name="Livrées"
              fill="#16a34a"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
