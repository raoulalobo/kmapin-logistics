/**
 * Page de Configuration des Prix (Admin uniquement)
 *
 * Permet aux administrateurs de configurer dynamiquement:
 * - Taux de base par kg
 * - Multiplicateurs par mode de transport
 * - Surcharges par type de cargo
 * - Surcharges par priorité
 * - Délais de livraison par mode
 * - Distances entre pays
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  CurrencyEur,
  Truck,
  Package,
  Clock,
  MapPin,
  FloppyDisk,
  Trash,
  Plus,
} from '@phosphor-icons/react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

import {
  getCurrentPricingConfig,
  updatePricingConfig,
  getAllCountryDistances,
  upsertCountryDistance,
  deleteCountryDistance,
  type PricingConfigInput,
  type CountryDistanceInput,
} from '@/modules/pricing-config';

export default function PricingConfigPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [distances, setDistances] = useState<any[]>([]);
  const [newDistance, setNewDistance] = useState({
    originCountry: '',
    destinationCountry: '',
    distanceKm: 0,
  });

  // Form pour la configuration générale
  const form = useForm<any>({
    defaultValues: {
      baseRatePerKg: 0.5,
      transportMultipliers: {
        ROAD: 1.0,
        SEA: 0.6,
        AIR: 3.0,
        RAIL: 0.8,
      },
      cargoTypeSurcharges: {
        GENERAL: 0,
        DANGEROUS: 0.5,
        PERISHABLE: 0.4,
        FRAGILE: 0.3,
        BULK: -0.1,
        CONTAINER: 0.2,
        PALLETIZED: 0.15,
        OTHER: 0.1,
      },
      prioritySurcharges: {
        STANDARD: 0,
        EXPRESS: 0.5,
        URGENT: 1.0,
      },
      deliverySpeedsPerMode: {
        ROAD: { min: 3, max: 7 },
        SEA: { min: 20, max: 45 },
        AIR: { min: 1, max: 3 },
        RAIL: { min: 7, max: 14 },
      },
    },
  });

  // Charger la configuration au montage
  useEffect(() => {
    loadConfiguration();
    loadDistances();
  }, []);

  async function loadConfiguration() {
    setIsFetching(true);
    const result = await getCurrentPricingConfig();
    if (result.success && result.data) {
      form.reset({
        baseRatePerKg: result.data.baseRatePerKg,
        transportMultipliers: result.data.transportMultipliers,
        cargoTypeSurcharges: result.data.cargoTypeSurcharges,
        prioritySurcharges: result.data.prioritySurcharges,
        deliverySpeedsPerMode: result.data.deliverySpeedsPerMode,
      });
    }
    setIsFetching(false);
  }

  async function loadDistances() {
    const result = await getAllCountryDistances();
    if (result.success) {
      setDistances(result.data);
    }
  }

  async function handleSaveConfig() {
    setIsLoading(true);
    const values = form.getValues();

    const result = await updatePricingConfig(values);

    if (result.success) {
      toast.success('Configuration sauvegardée avec succès');
    } else {
      toast.error(result.error || 'Erreur lors de la sauvegarde');
    }

    setIsLoading(false);
  }

  async function handleAddDistance() {
    if (!newDistance.originCountry || !newDistance.destinationCountry || newDistance.distanceKm <= 0) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const result = await upsertCountryDistance(newDistance);

    if (result.success) {
      toast.success('Distance ajoutée avec succès');
      setNewDistance({ originCountry: '', destinationCountry: '', distanceKm: 0 });
      loadDistances();
    } else {
      toast.error(result.error || 'Erreur lors de l\'ajout');
    }
  }

  async function handleDeleteDistance(originCountry: string, destinationCountry: string) {
    const result = await deleteCountryDistance(originCountry, destinationCountry);

    if (result.success) {
      toast.success('Distance supprimée avec succès');
      loadDistances();
    } else {
      toast.error(result.error || 'Erreur lors de la suppression');
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-12">
        <p>Chargement de la configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuration des Prix</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de tarification utilisés pour le calcul des devis
        </p>
      </div>

      <Separator />

      {/* Onglets de configuration */}
      <Tabs defaultValue="base" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="base">
            <CurrencyEur className="h-4 w-4 mr-2" />
            Taux de Base
          </TabsTrigger>
          <TabsTrigger value="transport">
            <Truck className="h-4 w-4 mr-2" />
            Transport
          </TabsTrigger>
          <TabsTrigger value="cargo">
            <Package className="h-4 w-4 mr-2" />
            Cargo
          </TabsTrigger>
          <TabsTrigger value="priority">
            <Clock className="h-4 w-4 mr-2" />
            Priorité
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Clock className="h-4 w-4 mr-2" />
            Délais
          </TabsTrigger>
          <TabsTrigger value="distances">
            <MapPin className="h-4 w-4 mr-2" />
            Distances
          </TabsTrigger>
        </TabsList>

        {/* Onglet 1 : Taux de Base */}
        <TabsContent value="base">
          <Card>
            <CardHeader>
              <CardTitle>Taux de Base</CardTitle>
              <CardDescription>
                Configurez le coût de base par kilogramme pour tous les transports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseRatePerKg">Taux de base (€/kg)</Label>
                <Input
                  id="baseRatePerKg"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...form.register('baseRatePerKg', { valueAsNumber: true })}
                />
                <p className="text-sm text-muted-foreground">
                  Prix de base appliqué par kilogramme de marchandise
                </p>
              </div>

              <Button onClick={handleSaveConfig} disabled={isLoading}>
                <FloppyDisk className="h-4 w-4 mr-2" />
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 2 : Multiplicateurs Transport */}
        <TabsContent value="transport">
          <Card>
            <CardHeader>
              <CardTitle>Multiplicateurs par Mode de Transport</CardTitle>
              <CardDescription>
                Facteurs multiplicatifs appliqués selon le mode de transport choisi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transport-road">Routier (ROAD)</Label>
                  <Input
                    id="transport-road"
                    type="number"
                    step="0.1"
                    min="0.1"
                    {...form.register('transportMultipliers.ROAD', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transport-sea">Maritime (SEA)</Label>
                  <Input
                    id="transport-sea"
                    type="number"
                    step="0.1"
                    min="0.1"
                    {...form.register('transportMultipliers.SEA', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transport-air">Aérien (AIR)</Label>
                  <Input
                    id="transport-air"
                    type="number"
                    step="0.1"
                    min="0.1"
                    {...form.register('transportMultipliers.AIR', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transport-rail">Ferroviaire (RAIL)</Label>
                  <Input
                    id="transport-rail"
                    type="number"
                    step="0.1"
                    min="0.1"
                    {...form.register('transportMultipliers.RAIL', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Exemple : Un multiplicateur de 3.0 pour l'aérien signifie que le transport aérien coûte 3x plus cher que le taux de base
              </p>

              <Button onClick={handleSaveConfig} disabled={isLoading}>
                <FloppyDisk className="h-4 w-4 mr-2" />
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 3 : Surcharges Cargo */}
        <TabsContent value="cargo">
          <Card>
            <CardHeader>
              <CardTitle>Surcharges par Type de Cargo</CardTitle>
              <CardDescription>
                Pourcentages de surcharge (ou réduction) selon le type de marchandise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cargo-general">Général (GENERAL)</Label>
                  <Input
                    id="cargo-general"
                    type="number"
                    step="0.1"
                    {...form.register('cargoTypeSurcharges.GENERAL', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-dangerous">Dangereux (DANGEROUS)</Label>
                  <Input
                    id="cargo-dangerous"
                    type="number"
                    step="0.1"
                    {...form.register('cargoTypeSurcharges.DANGEROUS', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-perishable">Périssable (PERISHABLE)</Label>
                  <Input
                    id="cargo-perishable"
                    type="number"
                    step="0.1"
                    {...form.register('cargoTypeSurcharges.PERISHABLE', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-fragile">Fragile (FRAGILE)</Label>
                  <Input
                    id="cargo-fragile"
                    type="number"
                    step="0.1"
                    {...form.register('cargoTypeSurcharges.FRAGILE', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-bulk">Vrac (BULK)</Label>
                  <Input
                    id="cargo-bulk"
                    type="number"
                    step="0.1"
                    {...form.register('cargoTypeSurcharges.BULK', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-container">Conteneur (CONTAINER)</Label>
                  <Input
                    id="cargo-container"
                    type="number"
                    step="0.1"
                    {...form.register('cargoTypeSurcharges.CONTAINER', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-palletized">Palettisé (PALLETIZED)</Label>
                  <Input
                    id="cargo-palletized"
                    type="number"
                    step="0.1"
                    {...form.register('cargoTypeSurcharges.PALLETIZED', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-other">Autre (OTHER)</Label>
                  <Input
                    id="cargo-other"
                    type="number"
                    step="0.1"
                    {...form.register('cargoTypeSurcharges.OTHER', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Valeurs positives = surcharge (ex: 0.5 = +50%), valeurs négatives = réduction (ex: -0.1 = -10%)
              </p>

              <Button onClick={handleSaveConfig} disabled={isLoading}>
                <FloppyDisk className="h-4 w-4 mr-2" />
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 4 : Surcharges Priorité */}
        <TabsContent value="priority">
          <Card>
            <CardHeader>
              <CardTitle>Surcharges par Priorité</CardTitle>
              <CardDescription>
                Pourcentages de surcharge selon le niveau de priorité du transport
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="priority-standard">Standard (STANDARD)</Label>
                  <Input
                    id="priority-standard"
                    type="number"
                    step="0.1"
                    min="0"
                    {...form.register('prioritySurcharges.STANDARD', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority-express">Express (EXPRESS)</Label>
                  <Input
                    id="priority-express"
                    type="number"
                    step="0.1"
                    min="0"
                    {...form.register('prioritySurcharges.EXPRESS', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority-urgent">Urgent (URGENT)</Label>
                  <Input
                    id="priority-urgent"
                    type="number"
                    step="0.1"
                    min="0"
                    {...form.register('prioritySurcharges.URGENT', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Exemple : 0.5 pour EXPRESS = +50% de surcharge, 1.0 pour URGENT = +100% (doublement du prix)
              </p>

              <Button onClick={handleSaveConfig} disabled={isLoading}>
                <FloppyDisk className="h-4 w-4 mr-2" />
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 5 : Délais de Livraison */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>Délais de Livraison par Mode</CardTitle>
              <CardDescription>
                Fourchettes de délais de livraison (en jours) pour chaque mode de transport
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Routier (ROAD) - Min (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register('deliverySpeedsPerMode.ROAD.min', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Routier (ROAD) - Max (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register('deliverySpeedsPerMode.ROAD.max', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Maritime (SEA) - Min (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register('deliverySpeedsPerMode.SEA.min', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maritime (SEA) - Max (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register('deliverySpeedsPerMode.SEA.max', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Aérien (AIR) - Min (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register('deliverySpeedsPerMode.AIR.min', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aérien (AIR) - Max (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register('deliverySpeedsPerMode.AIR.max', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ferroviaire (RAIL) - Min (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register('deliverySpeedsPerMode.RAIL.min', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ferroviaire (RAIL) - Max (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register('deliverySpeedsPerMode.RAIL.max', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Les délais estimés varient entre min et max selon la distance. Plus la distance est grande, plus on tend vers le max.
              </p>

              <Button onClick={handleSaveConfig} disabled={isLoading}>
                <FloppyDisk className="h-4 w-4 mr-2" />
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 6 : Distances */}
        <TabsContent value="distances">
          <Card>
            <CardHeader>
              <CardTitle>Distances entre Pays</CardTitle>
              <CardDescription>
                Gérez les distances en kilomètres entre les différents pays (codes ISO à 2 lettres)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formulaire d'ajout */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">Ajouter une nouvelle distance</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Pays d'origine (code ISO)</Label>
                    <Input
                      placeholder="FR"
                      maxLength={2}
                      value={newDistance.originCountry}
                      onChange={(e) =>
                        setNewDistance({ ...newDistance, originCountry: e.target.value.toUpperCase() })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pays de destination (code ISO)</Label>
                    <Input
                      placeholder="DE"
                      maxLength={2}
                      value={newDistance.destinationCountry}
                      onChange={(e) =>
                        setNewDistance({ ...newDistance, destinationCountry: e.target.value.toUpperCase() })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Distance (km)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newDistance.distanceKm || ''}
                      onChange={(e) =>
                        setNewDistance({ ...newDistance, distanceKm: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <Button onClick={handleAddDistance} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </div>

              {/* Table des distances */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origine</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Distance (km)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Aucune distance configurée
                        </TableCell>
                      </TableRow>
                    ) : (
                      distances.map((distance) => (
                        <TableRow key={distance.id}>
                          <TableCell className="font-mono">{distance.originCountry}</TableCell>
                          <TableCell className="font-mono">{distance.destinationCountry}</TableCell>
                          <TableCell>{distance.distanceKm.toLocaleString()} km</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteDistance(distance.originCountry, distance.destinationCountry)
                              }
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-muted-foreground">
                Utilisez des codes pays ISO à 2 lettres (ex: FR pour France, DE pour Allemagne, US pour États-Unis)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
