/**
 * Page : Tableau de Bord des Enlèvements
 *
 * Affiche la liste des demandes d'enlèvement avec :
 * - Filtres par statut, date, transporteur
 * - Actions rapides (assigner, changer statut)
 * - Statistiques en temps réel
 * - Vue calendaire des enlèvements planifiés
 *
 * Route protégée accessible aux rôles :
 * - ADMIN : accès complet
 * - OPERATIONS_MANAGER : gestion complète
 * - FINANCE_MANAGER : lecture seule
 * - CLIENT : voir ses propres demandes
 *
 * @module app/(dashboard)/pickups
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
  Funnel,
  Download,
} from '@phosphor-icons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { listPickupRequestsAction } from '@/modules/pickups';
import { PickupStatus } from '@/generated/prisma';

/**
 * Traductions françaises pour les statuts
 */
const statusLabels: Record<PickupStatus, { label: string; color: string }> = {
  REQUESTED: { label: 'Demandé', color: 'bg-gray-500' },
  SCHEDULED: { label: 'Planifié', color: 'bg-blue-500' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-500' },
  COMPLETED: { label: 'Terminé', color: 'bg-green-500' },
  CANCELED: { label: 'Annulé', color: 'bg-red-500' },
};

export default function PickupsPage() {
  /**
   * État des filtres
   */
  const [statusFilter, setStatusFilter] = useState<PickupStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  /**
   * Charger les demandes d'enlèvement
   */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pickups', statusFilter, page],
    queryFn: async () => {
      const result = await listPickupRequestsAction({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit,
        sortBy: 'requestedDate',
        sortOrder: 'asc',
      });
      return result;
    },
    staleTime: 30 * 1000, // 30 secondes
  });

  /**
   * Statistiques calculées
   */
  const stats = data?.data
    ? {
        total: data.pagination.total,
        requested: data.data.filter((p) => p.status === PickupStatus.REQUESTED).length,
        scheduled: data.data.filter((p) => p.status === PickupStatus.SCHEDULED).length,
        inProgress: data.data.filter((p) => p.status === PickupStatus.IN_PROGRESS).length,
        completed: data.data.filter((p) => p.status === PickupStatus.COMPLETED).length,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Gestion des Enlèvements
          </h1>
          <p className="text-gray-600 mt-1">
            Planifiez et suivez les enlèvements de colis en temps réel
          </p>
        </div>
        <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Link href="/dashboard/pickups/new">
            <Plus className="h-5 w-5" weight="fill" />
            Nouvelle demande
          </Link>
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Demandes d'enlèvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À planifier</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.requested || 0}</div>
            <p className="text-xs text-muted-foreground">
              En attente de planification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planifiés</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.scheduled || 0}</div>
            <p className="text-xs text-muted-foreground">
              Enlèvements programmés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <Truck className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inProgress || 0}</div>
            <p className="text-xs text-muted-foreground">
              Transporteurs en route
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et tableau */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Demandes d'enlèvement</CardTitle>
              <CardDescription>
                Liste de toutes les demandes avec filtres et actions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as PickupStatus | 'ALL')}
              >
                <SelectTrigger className="w-[180px]">
                  <Funnel className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  {Object.entries(statusLabels).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <XCircle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-lg font-medium text-gray-900">Erreur de chargement</p>
              <p className="text-sm text-gray-600 mt-1">
                Impossible de charger les demandes d'enlèvement
              </p>
            </div>
          ) : data && data.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Expédition</TableHead>
                    <TableHead>Adresse d'enlèvement</TableHead>
                    <TableHead>Date demandée</TableHead>
                    <TableHead>Transporteur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((pickup) => (
                    <TableRow key={pickup.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/shipments/${pickup.shipmentId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {pickup.shipment.trackingNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pickup.pickupCity}</div>
                          <div className="text-sm text-gray-500">
                            {pickup.pickupAddress}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {format(new Date(pickup.requestedDate), 'dd MMM yyyy', {
                              locale: fr,
                            })}
                          </div>
                          <div className="text-sm text-gray-500">
                            {pickup.timeSlot === 'MORNING' && 'Matin (8h-12h)'}
                            {pickup.timeSlot === 'AFTERNOON' && 'Après-midi (12h-17h)'}
                            {pickup.timeSlot === 'EVENING' && 'Soirée (17h-20h)'}
                            {pickup.timeSlot === 'SPECIFIC_TIME' &&
                              `À ${pickup.pickupTime}`}
                            {pickup.timeSlot === 'FLEXIBLE' && 'Flexible'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {pickup.transporter ? (
                          <div>
                            <div className="font-medium">{pickup.transporter.name}</div>
                            {pickup.driverName && (
                              <div className="text-sm text-gray-500">
                                {pickup.driverName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Non assigné</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusLabels[pickup.status].color}>
                          {statusLabels[pickup.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/pickups/${pickup.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    Page {data.pagination.page} sur {data.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= data.pagination.totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900">
                Aucune demande d'enlèvement
              </p>
              <p className="text-sm text-gray-600 mt-1 mb-4">
                Créez votre première demande pour commencer
              </p>
              <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Link href="/dashboard/pickups/new">
                  <Plus className="h-5 w-5" weight="fill" />
                  Nouvelle demande
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
