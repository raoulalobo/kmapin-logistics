/**
 * Composant : Tableau de Tarifs Standards
 *
 * Affiche les tarifs standards par destination avec filtres interactifs.
 * Permet aux utilisateurs de consulter rapidement les prix indicatifs
 * et de lancer un calcul pré-rempli.
 *
 * Fonctionnalités:
 * - Recherche par destination
 * - Filtre par mode de transport
 * - Bouton "Utiliser ce mode" pour pré-remplir le calculateur
 * - Pagination pour grandes listes
 *
 * @module components/pricing-table
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Truck, Ship, Plane, Train, TrendingUp, Loader2, Package } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

import { getStandardRatesAction } from '@/modules/pricing';
import { TransportMode } from '@prisma/client';
import type { StandardRate } from '@/modules/pricing/data/standard-rates';

/**
 * Traductions françaises pour les modes de transport
 */
const transportModeLabels: Record<TransportMode, { label: string; icon: any; color: string }> = {
  ROAD: { label: 'Routier', icon: Truck, color: 'text-blue-600' },
  SEA: { label: 'Maritime', icon: Ship, color: 'text-cyan-600' },
  AIR: { label: 'Aérien', icon: Plane, color: 'text-purple-600' },
  RAIL: { label: 'Ferroviaire', icon: Train, color: 'text-green-600' },
};

export function PricingTable() {
  /**
   * États des filtres
   */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<TransportMode | 'ALL'>('ALL');

  /**
   * Charger les tarifs avec TanStack Query
   */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['standard-rates', searchQuery, selectedMode],
    queryFn: async () => {
      const filters = {
        search: searchQuery || undefined,
        transportMode: selectedMode === 'ALL' ? undefined : selectedMode,
      };

      const result = await getStandardRatesAction(filters);
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Générer l'URL pour le calculateur pré-rempli
   * Les query params doivent être AVANT le hash pour être accessibles via useSearchParams()
   */
  const getCalculatorUrl = (rate: StandardRate) => {
    const params = new URLSearchParams({
      destination: rate.destination,
      destinationCode: rate.destinationCode,
      mode: rate.transportMode,
    });

    return `/?${params.toString()}#calculateur`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-[#003D82] to-[#002952] text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl text-white">Tarifs Standards</CardTitle>
              <CardDescription className="text-blue-100 text-base mt-1">
                Consultez nos prix indicatifs par destination et mode de transport
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Filtres */}
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            {/* Recherche par destination */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-base font-semibold flex items-center gap-2">
                <Search className="h-4 w-4 text-[#003D82]" />
                Rechercher une destination
              </Label>
              <Input
                id="search"
                placeholder="Ex: Allemagne, DE, Espagne..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Filtre par mode de transport */}
            <div className="space-y-2">
              <Label htmlFor="transport-mode" className="text-base font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#003D82]" />
                Mode de transport
              </Label>
              <Select
                value={selectedMode}
                onValueChange={(value) => setSelectedMode(value as TransportMode | 'ALL')}
              >
                <SelectTrigger id="transport-mode" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les modes</SelectItem>
                  {Object.entries(transportModeLabels).map(([value, { label, icon: Icon }]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tableau des tarifs */}
          <div className="rounded-lg border">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#003D82]" />
                <span className="ml-3 text-lg text-gray-600">Chargement des tarifs...</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Package className="h-12 w-12 text-red-400 mb-4" />
                <p className="text-lg font-medium text-gray-900">Erreur de chargement</p>
                <p className="text-sm text-gray-600 mt-1">
                  Impossible de charger les tarifs. Veuillez réessayer.
                </p>
              </div>
            ) : data && data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-bold text-gray-900">Destination</TableHead>
                    <TableHead className="font-bold text-gray-900">Mode de transport</TableHead>
                    <TableHead className="font-bold text-gray-900">Prix estimé</TableHead>
                    <TableHead className="font-bold text-gray-900">Délai</TableHead>
                    <TableHead className="font-bold text-gray-900 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((rate) => {
                    const { label, icon: Icon, color } = transportModeLabels[rate.transportMode];
                    return (
                      <TableRow key={rate.id} className="hover:bg-blue-50/50 transition-colors">
                        {/* Destination */}
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-gray-900">{rate.destination}</span>
                            <span className="text-xs text-gray-500">{rate.destinationCode}</span>
                          </div>
                        </TableCell>

                        {/* Mode de transport */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${color}`} />
                            <span className="text-gray-700">{label}</span>
                          </div>
                        </TableCell>

                        {/* Prix estimé */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#003D82]">
                              {rate.pricePerKg.toFixed(2)} € /kg
                            </span>
                            <span className="text-xs text-gray-500">
                              Min: {rate.minPrice} € - Max: {rate.maxPrice} €
                            </span>
                          </div>
                        </TableCell>

                        {/* Délai */}
                        <TableCell>
                          <span className="text-gray-700">
                            {rate.estimatedDaysMin === rate.estimatedDaysMax
                              ? `${rate.estimatedDaysMin} jour${rate.estimatedDaysMin > 1 ? 's' : ''}`
                              : `${rate.estimatedDaysMin}-${rate.estimatedDaysMax} jours`}
                          </span>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#003D82] text-[#003D82] hover:bg-blue-50"
                            asChild
                          >
                            <Link href={getCalculatorUrl(rate)}>
                              Utiliser ce mode
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Search className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-900">Aucun tarif trouvé</p>
                <p className="text-sm text-gray-600 mt-1">
                  Essayez de modifier vos filtres de recherche
                </p>
              </div>
            )}
          </div>

          {/* Note d'information */}
          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Tarifs indicatifs
                </p>
                <p className="text-sm text-blue-800">
                  Ces prix sont donnés à titre indicatif pour une marchandise générale.
                  Pour un devis précis adapté à votre besoin, utilisez notre{' '}
                  <Link href="/#calculateur" className="font-semibold underline hover:text-blue-900">
                    calculateur de devis
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
