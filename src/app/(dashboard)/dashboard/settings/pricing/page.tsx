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

import { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
} from '@phosphor-icons/react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  getCurrentPricingConfig,
  updatePricingConfig,
  getAllCountryDistances,
  upsertCountryDistance,
  deleteCountryDistance,
  type PricingConfigInput,
  type CountryDistanceInput,
} from '@/modules/pricing-config';
import {
  getTransportRates,
  createTransportRate,
  updateTransportRate,
  deleteTransportRate,
  toggleTransportRateStatus,
} from '@/modules/transport-rates';
import { listCountries } from '@/modules/countries/actions/country.actions';
import { TransportMode } from '@/lib/db/enums';

export default function PricingConfigPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [distances, setDistances] = useState<any[]>([]);
  const [newDistance, setNewDistance] = useState({
    originCountry: '',
    destinationCountry: '',
    distanceKm: 0,
  });

  // États pour la gestion des tarifs de transport
  const [transportRates, setTransportRates] = useState<any[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [activeCountries, setActiveCountries] = useState<any[]>([]);
  const [newRate, setNewRate] = useState({
    originCountryCode: 'FR',
    destinationCountryCode: '',
    transportMode: 'SEA' as TransportMode,
    ratePerKg: 0,
    ratePerM3: 0,
    notes: '',
    isActive: true,
  });

  // États pour le modal d'édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);

  // Ref pour empêcher form.reset() d'écraser les édits utilisateur
  // Protège contre le double-fire de useEffect en React 19 StrictMode
  const isConfigLoadedRef = useRef(false);

  // Form pour la configuration générale
  const form = useForm<any>({
    defaultValues: {
      volumetricWeightRatios: {
        AIR: 167,
        ROAD: 333,
        SEA: 1,
      },
      useVolumetricWeightPerMode: {
        AIR: true,
        ROAD: true,
        SEA: false,
      },
      transportMultipliers: {
        ROAD: 1.0,
        SEA: 0.6,
        AIR: 3.0,
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
        NORMAL: 0.1,

        URGENT: 0.3,
      },
      deliverySpeedsPerMode: {
        ROAD: { min: 3, max: 7 },
        SEA: { min: 20, max: 45 },
        AIR: { min: 1, max: 3 },
      },
    },
  });

  // Charger la configuration au montage
  useEffect(() => {
    loadConfiguration();
    loadDistances();
    loadTransportRates();
    loadActiveCountries();
  }, []);

  async function loadConfiguration() {
    // Ne charger qu'une seule fois pour éviter d'écraser les édits utilisateur
    // (React 19 StrictMode fire useEffect 2x en dev, causant une race condition
    //  où le 2e appel async écrase les modifications déjà saisies par l'utilisateur)
    if (isConfigLoadedRef.current) return;

    setIsFetching(true);
    const result = await getCurrentPricingConfig();
    if (result.success && result.data) {
      form.reset({
        volumetricWeightRatios: result.data.volumetricWeightRatios,
        useVolumetricWeightPerMode: result.data.useVolumetricWeightPerMode,
        transportMultipliers: result.data.transportMultipliers,
        cargoTypeSurcharges: result.data.cargoTypeSurcharges,
        prioritySurcharges: result.data.prioritySurcharges,
        deliverySpeedsPerMode: result.data.deliverySpeedsPerMode,
      });
      isConfigLoadedRef.current = true; // Marquer comme chargé, empêcher tout reset ultérieur
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
      // Re-synchroniser le baseline du formulaire après sauvegarde réussie
      // pour que isDirty se remette à false et que les valeurs sauvées
      // deviennent la nouvelle référence du formulaire
      form.reset(values);
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

  // === FONCTIONS POUR LES TARIFS DE TRANSPORT ===

  async function loadActiveCountries() {
    const countries = await listCountries(true); // true = uniquement les pays actifs
    setActiveCountries(countries);
  }

  async function loadTransportRates() {
    setIsLoadingRates(true);
    const result = await getTransportRates({});
    if (result.success) {
      setTransportRates(result.data);
    }
    setIsLoadingRates(false);
  }

  async function handleCreateRate() {
    // Validation adaptée au mode : maritime = €/UP (via ratePerM3), autres = €/kg
    const isSea = newRate.transportMode === 'SEA';
    if (!newRate.destinationCountryCode) {
      toast.error('Veuillez sélectionner un pays de destination');
      return;
    }
    if (isSea && newRate.ratePerM3 <= 0) {
      toast.error('Le tarif par UP (€/UP) doit être positif');
      return;
    }
    if (!isSea && newRate.ratePerKg <= 0) {
      toast.error('Le tarif par kg (€/kg) doit être positif');
      return;
    }

    setIsLoading(true);
    const result = await createTransportRate(newRate);

    if (result.success) {
      toast.success('Tarif créé avec succès');
      setNewRate({
        originCountryCode: 'FR',
        destinationCountryCode: '',
        transportMode: 'SEA' as TransportMode,
        ratePerKg: 0,
        ratePerM3: 0,
        notes: '',
        isActive: true,
      });
      loadTransportRates();
    } else {
      toast.error(result.error || 'Erreur lors de la création');
    }
    setIsLoading(false);
  }

  /**
   * Ouvrir le modal d'édition avec les données du tarif
   */
  function handleOpenEditModal(rate: any) {
    setEditingRate({
      id: rate.id,
      originCountryCode: rate.originCountryCode,
      destinationCountryCode: rate.destinationCountryCode,
      transportMode: rate.transportMode,
      ratePerKg: rate.ratePerKg,
      ratePerM3: rate.ratePerM3,
      notes: rate.notes || '',
      isActive: rate.isActive,
    });
    setIsEditModalOpen(true);
  }

  /**
   * Sauvegarder les modifications du tarif
   */
  async function handleSaveEdit() {
    if (!editingRate || !editingRate.id) return;

    // Validation adaptée au mode : maritime = €/UP (via ratePerM3), autres = €/kg
    const isSeaEdit = editingRate.transportMode === 'SEA';
    if (isSeaEdit && editingRate.ratePerM3 <= 0) {
      toast.error('Le tarif par UP (€/UP) doit être positif');
      return;
    }
    if (!isSeaEdit && editingRate.ratePerKg <= 0) {
      toast.error('Le tarif par kg (€/kg) doit être positif');
      return;
    }

    setIsLoading(true);
    const { id, ...data } = editingRate;
    const result = await updateTransportRate(id, data);

    if (result.success) {
      toast.success('Tarif mis à jour avec succès');
      setIsEditModalOpen(false);
      setEditingRate(null);
      loadTransportRates();
    } else {
      toast.error(result.error || 'Erreur lors de la mise à jour');
    }
    setIsLoading(false);
  }

  async function handleDeleteRate(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) return;

    setIsLoading(true);
    const result = await deleteTransportRate(id);

    if (result.success) {
      toast.success('Tarif supprimé avec succès');
      loadTransportRates();
    } else {
      toast.error(result.error || 'Erreur lors de la suppression');
    }
    setIsLoading(false);
  }

  async function handleToggleRateStatus(id: string, isActive: boolean) {
    setIsLoading(true);
    const result = await toggleTransportRateStatus(id, isActive);

    if (result.success) {
      toast.success(`Tarif ${isActive ? 'activé' : 'désactivé'} avec succès`);
      loadTransportRates();
    } else {
      toast.error(result.error || 'Erreur lors du changement de statut');
    }
    setIsLoading(false);
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
        <h1 className="text-4xl font-bold tracking-tight">Configuration des Prix</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de tarification utilisés pour le calcul des devis
        </p>
      </div>

      <Separator />

      {/* Onglets de configuration */}
      <Tabs defaultValue="rates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="rates">
            <Truck className="h-4 w-4 mr-2" />
            Tarifs Routes
          </TabsTrigger>
          <TabsTrigger value="volumetric">
            <Package className="h-4 w-4 mr-2" />
            Poids Vol.
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

        {/* Onglet 1 : Tarifs par Routes */}
        <TabsContent value="rates">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Tarifs par Routes (TransportRate)</CardTitle>
              <CardDescription>
                Configurez les tarifs spécifiques par route (origine → destination) et mode de transport.
                Ces tarifs ont la priorité sur les tarifs par défaut.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formulaire de création */}
              <div className="border rounded-lg p-4 space-y-4 bg-blue-50/50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Créer un nouveau tarif
                </h3>
                <div className="grid gap-4 md:grid-cols-6">
                  <div className="space-y-2">
                    <Label>Origine *</Label>
                    <Select
                      value={newRate.originCountryCode}
                      onValueChange={(value) =>
                        setNewRate({ ...newRate, originCountryCode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCountries.map((country) => (
                          <SelectItem key={country.id} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-mono">{country.code}</span>
                              <span>{country.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Destination *</Label>
                    <Select
                      value={newRate.destinationCountryCode}
                      onValueChange={(value) =>
                        setNewRate({ ...newRate, destinationCountryCode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCountries.map((country) => (
                          <SelectItem key={country.id} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-mono">{country.code}</span>
                              <span>{country.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mode *</Label>
                    <Select
                      value={newRate.transportMode}
                      onValueChange={(value) =>
                        setNewRate({ ...newRate, transportMode: value as TransportMode })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEA">🌊 Maritime</SelectItem>
                        <SelectItem value="AIR">✈️ Aérien</SelectItem>
                        <SelectItem value="ROAD">🚛 Routier</SelectItem>
                                      </SelectContent>
                    </Select>
                  </div>

                  {/* Champ tarif conditionnel : €/UP pour maritime, €/kg pour les autres */}
                  {newRate.transportMode === 'SEA' ? (
                    <div className="space-y-2">
                      <Label>€/UP *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="465.00"
                        value={newRate.ratePerM3 || ''}
                        onChange={(e) =>
                          setNewRate({ ...newRate, ratePerM3: parseFloat(e.target.value) || 0, ratePerKg: 0 })
                        }
                      />
                      <p className="text-xs text-muted-foreground">UP = Unité Payante = max(tonnes, m³)</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>€/kg *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="7.25"
                        value={newRate.ratePerKg || ''}
                        onChange={(e) =>
                          setNewRate({ ...newRate, ratePerKg: parseFloat(e.target.value) || 0, ratePerM3: 0 })
                        }
                      />
                    </div>
                  )}

                  <div className="flex items-end">
                    <Button
                      onClick={handleCreateRate}
                      disabled={isLoading}
                      size="lg"
                      className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-5 w-5" weight="fill" />
                      Créer
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Input
                    placeholder="Maritime via Abidjan, délai 30-45j..."
                    value={newRate.notes}
                    onChange={(e) => setNewRate({ ...newRate, notes: e.target.value })}
                  />
                </div>
              </div>

              {/* Liste des tarifs */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">
                  Tarifs configurés ({transportRates.length})
                </h3>

                {isLoadingRates ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chargement des tarifs...
                  </div>
                ) : transportRates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    Aucun tarif configuré. Créez-en un ci-dessus.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Route</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead className="text-right">Tarif</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transportRates.map((rate) => (
                          <TableRow key={rate.id}>
                            <TableCell className="font-mono">
                              <span className="font-semibold">{rate.originCountryCode}</span>
                              {' → '}
                              <span className="font-semibold">{rate.destinationCountryCode}</span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {rate.transportMode === 'SEA' && '🌊 Maritime'}
                                {rate.transportMode === 'AIR' && '✈️ Aérien'}
                                {rate.transportMode === 'ROAD' && '🚛 Routier'}
                              </span>
                            </TableCell>
                            {/* Tarif contextuel : €/UP pour maritime, €/kg pour les autres */}
                            <TableCell className="text-right font-semibold">
                              {rate.transportMode === 'SEA'
                                ? `${rate.ratePerM3.toFixed(2)} €/UP`
                                : `${rate.ratePerKg.toFixed(2)} €/kg`
                              }
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {rate.notes || '-'}
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => handleToggleRateStatus(rate.id, !rate.isActive)}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  rate.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {rate.isActive ? '✓ Actif' : '✗ Inactif'}
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditModal(rate)}
                                  disabled={isLoading}
                                  title="Éditer le tarif"
                                >
                                  <FloppyDisk className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRate(rate.id)}
                                  disabled={isLoading}
                                  title="Supprimer le tarif"
                                >
                                  <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Important :</strong> Les tarifs configurés ici ont la priorité absolue sur les tarifs par défaut.
                  Si aucun tarif spécifique n'existe pour une route, le système utilisera les tarifs de l'onglet "Transport" (€/kg ou €/m³ selon le mode).
                </p>
              </div>

              {/* Modal d'édition de tarif */}
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Modifier le tarif de transport</DialogTitle>
                    <DialogDescription>
                      Modifiez les informations du tarif pour la route{' '}
                      {editingRate?.originCountryCode} → {editingRate?.destinationCountryCode}
                    </DialogDescription>
                  </DialogHeader>

                  {editingRate && (
                    <div className="grid gap-4 py-4">
                      {/* Route (lecture seule) */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Origine</Label>
                          <Input
                            value={editingRate.originCountryCode}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Destination</Label>
                          <Input
                            value={editingRate.destinationCountryCode}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                      </div>

                      {/* Mode (lecture seule) */}
                      <div className="space-y-2">
                        <Label>Mode de transport</Label>
                        <Input
                          value={
                            editingRate.transportMode === 'SEA' ? '🌊 Maritime' :
                            editingRate.transportMode === 'AIR' ? '✈️ Aérien' :
                            '🚛 Routier'
                          }
                          disabled
                          className="bg-gray-50"
                        />
                        <p className="text-xs text-muted-foreground">
                          Pour changer la route ou le mode, créez un nouveau tarif
                        </p>
                      </div>

                      {/* Tarif conditionnel : €/UP pour maritime, €/kg pour les autres */}
                      <div className="space-y-2">
                        {editingRate.transportMode === 'SEA' ? (
                          <>
                            <Label htmlFor="edit-ratePerM3">Tarif par UP (€/UP) *</Label>
                            <Input
                              id="edit-ratePerM3"
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={editingRate.ratePerM3}
                              onChange={(e) =>
                                setEditingRate({
                                  ...editingRate,
                                  ratePerM3: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                            <p className="text-xs text-muted-foreground">UP = Unité Payante = max(tonnes, m³)</p>
                          </>
                        ) : (
                          <>
                            <Label htmlFor="edit-ratePerKg">Tarif par kg (€/kg) *</Label>
                            <Input
                              id="edit-ratePerKg"
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={editingRate.ratePerKg}
                              onChange={(e) =>
                                setEditingRate({
                                  ...editingRate,
                                  ratePerKg: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          </>
                        )}
                      </div>

                      {/* Notes (modifiable) */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-notes">Notes (optionnel)</Label>
                        <Input
                          id="edit-notes"
                          placeholder="Maritime via Abidjan, délai 30-45j..."
                          value={editingRate.notes}
                          onChange={(e) =>
                            setEditingRate({
                              ...editingRate,
                              notes: e.target.value,
                            })
                          }
                        />
                      </div>

                      {/* Statut (modifiable) */}
                      <div className="flex items-center space-x-2">
                        <input
                          id="edit-isActive"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={editingRate.isActive}
                          onChange={(e) =>
                            setEditingRate({
                              ...editingRate,
                              isActive: e.target.checked,
                            })
                          }
                        />
                        <Label htmlFor="edit-isActive" className="cursor-pointer">
                          Tarif actif (coché = utilisé dans les calculs)
                        </Label>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setIsEditModalOpen(false)}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={isLoading}
                      size="lg"
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <FloppyDisk className="h-5 w-5" weight="fill" />
                      {isLoading ? 'Sauvegarde en cours...' : 'Sauvegarder'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 3 : Poids Volumétrique */}
        <TabsContent value="volumetric">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Configuration du Poids Volumétrique</CardTitle>
              <CardDescription>
                Configurez les ratios de conversion volume → poids et l'activation par mode
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ratios Volumétriques */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Ratios de Conversion (kg/m³)</h3>
                <p className="text-sm text-muted-foreground">
                  Définit combien de kilogrammes équivaut 1 mètre cube pour chaque mode de transport
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="volumetric-air">Aérien (AIR)</Label>
                    <Input
                      id="volumetric-air"
                      type="number"
                      step="1"
                      min="1"
                      {...form.register('volumetricWeightRatios.AIR', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Standard : 167 kg/m³ (ratio 1/6 = 6000 cm³/kg)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="volumetric-road">Routier (ROAD)</Label>
                    <Input
                      id="volumetric-road"
                      type="number"
                      step="1"
                      min="1"
                      {...form.register('volumetricWeightRatios.ROAD', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Standard : 333 kg/m³ (ratio 1/3 = 3000 cm³/kg)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="volumetric-sea">Maritime (SEA)</Label>
                    <Input
                      id="volumetric-sea"
                      type="number"
                      step="1"
                      min="1"
                      {...form.register('volumetricWeightRatios.SEA', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Non utilisé (système Unité Payante - UP)
                    </p>
                  </div>



                </div>
              </div>

              <Separator />

              {/* Activation par Mode */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Activation du Poids Volumétrique</h3>
                <p className="text-sm text-muted-foreground">
                  Active ou désactive le calcul du poids volumétrique pour chaque mode
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="use-volumetric-air">Aérien (AIR)</Label>
                      <p className="text-xs text-muted-foreground">
                        Facturer au MAX(poids réel, poids volumétrique)
                      </p>
                    </div>
                    <input
                      id="use-volumetric-air"
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300"
                      {...form.register('useVolumetricWeightPerMode.AIR')}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="use-volumetric-road">Routier (ROAD)</Label>
                      <p className="text-xs text-muted-foreground">
                        Facturer au MAX(poids réel, poids volumétrique)
                      </p>
                    </div>
                    <input
                      id="use-volumetric-road"
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300"
                      {...form.register('useVolumetricWeightPerMode.ROAD')}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4 bg-gray-50">
                    <div className="space-y-0.5">
                      <Label htmlFor="use-volumetric-sea" className="text-gray-500">Maritime (SEA)</Label>
                      <p className="text-xs text-gray-500">
                        Utilise Unité Payante (UP) au lieu du poids vol.
                      </p>
                    </div>
                    <input
                      id="use-volumetric-sea"
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300"
                      disabled
                      {...form.register('useVolumetricWeightPerMode.SEA')}
                    />
                  </div>



                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note Maritime :</strong> Le mode maritime utilise le système
                  "Poids ou Mesure" (Unité Payante = UP) où l'on facture sur
                  MAX(poids en tonnes, volume en m³). Le poids volumétrique classique ne s'applique pas.
                </p>
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={isLoading}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FloppyDisk className="h-5 w-5" weight="fill" />
                {isLoading ? 'Sauvegarde en cours...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Transport : Tarifs par Mode */}
        <TabsContent value="transport">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Tarifs par Mode de Transport</CardTitle>
              <CardDescription>
                Tarif appliqué par mode quand aucune route spécifique n'est configurée
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transport-road">Routier - ROAD (€/kg)</Label>
                  <Input
                    id="transport-road"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10000"
                    {...form.register('transportMultipliers.ROAD', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transport-sea">Maritime - SEA (€/m³)</Label>
                  <Input
                    id="transport-sea"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10000"
                    {...form.register('transportMultipliers.SEA', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transport-air">Aérien - AIR (€/kg)</Label>
                  <Input
                    id="transport-air"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10000"
                    {...form.register('transportMultipliers.AIR', { valueAsNumber: true })}
                  />
                </div>



              </div>

              <p className="text-sm text-muted-foreground">
                Exemple : AIR = 15 €/kg, ROAD = 3 €/kg, SEA = 4 €/m³
              </p>

              <Button
                onClick={handleSaveConfig}
                disabled={isLoading}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FloppyDisk className="h-5 w-5" weight="fill" />
                {isLoading ? 'Sauvegarde en cours...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 3 : Surcharges Cargo */}
        <TabsContent value="cargo">
          <Card className="dashboard-card">
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
                    min="-1"
                    max="5"
                    {...form.register('cargoTypeSurcharges.GENERAL', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-dangerous">Dangereux (DANGEROUS)</Label>
                  <Input
                    id="cargo-dangerous"
                    type="number"
                    step="0.1"
                    min="-1"
                    max="5"
                    {...form.register('cargoTypeSurcharges.DANGEROUS', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-perishable">Périssable (PERISHABLE)</Label>
                  <Input
                    id="cargo-perishable"
                    type="number"
                    step="0.1"
                    min="-1"
                    max="5"
                    {...form.register('cargoTypeSurcharges.PERISHABLE', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-fragile">Fragile (FRAGILE)</Label>
                  <Input
                    id="cargo-fragile"
                    type="number"
                    step="0.1"
                    min="-1"
                    max="5"
                    {...form.register('cargoTypeSurcharges.FRAGILE', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-bulk">Vrac (BULK)</Label>
                  <Input
                    id="cargo-bulk"
                    type="number"
                    step="0.1"
                    min="-1"
                    max="5"
                    {...form.register('cargoTypeSurcharges.BULK', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-container">Conteneur (CONTAINER)</Label>
                  <Input
                    id="cargo-container"
                    type="number"
                    step="0.1"
                    min="-1"
                    max="5"
                    {...form.register('cargoTypeSurcharges.CONTAINER', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-palletized">Palettisé (PALLETIZED)</Label>
                  <Input
                    id="cargo-palletized"
                    type="number"
                    step="0.1"
                    min="-1"
                    max="5"
                    {...form.register('cargoTypeSurcharges.PALLETIZED', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo-other">Autre (OTHER)</Label>
                  <Input
                    id="cargo-other"
                    type="number"
                    step="0.1"
                    min="-1"
                    max="5"
                    {...form.register('cargoTypeSurcharges.OTHER', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Plage : -1 à 5. Positif = surcharge (ex: 0.5 = +50%), négatif = réduction (ex: -0.1 = -10%, -1 = -100% gratuit)
              </p>

              <Button
                onClick={handleSaveConfig}
                disabled={isLoading}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FloppyDisk className="h-5 w-5" weight="fill" />
                {isLoading ? 'Sauvegarde en cours...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 4 : Surcharges Priorité */}
        <TabsContent value="priority">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Surcharges par Priorité</CardTitle>
              <CardDescription>
                Pourcentages de surcharge selon le niveau de priorité du transport
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priority-standard">Standard (STANDARD)</Label>
                  <Input
                    id="priority-standard"
                    type="number"
                    step="0.01"
                    min="-1"
                    max="5"
                    {...form.register('prioritySurcharges.STANDARD', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Livraison normale (généralement 0%)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority-normal">Normal (NORMAL)</Label>
                  <Input
                    id="priority-normal"
                    type="number"
                    step="0.01"
                    min="-1"
                    max="5"
                    {...form.register('prioritySurcharges.NORMAL', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Livraison accélérée (recommandé : 0.1 = +10%)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority-urgent">Urgent (URGENT)</Label>
                  <Input
                    id="priority-urgent"
                    type="number"
                    step="0.01"
                    min="-1"
                    max="5"
                    {...form.register('prioritySurcharges.URGENT', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Livraison urgente (recommandé : 0.3 = +30%)
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Info :</strong> Les coefficients sont appliqués multiplicativement sur le coût de base.
                  Par exemple, une surcharge de 0.3 pour URGENT sur un coût de base de 100€ donnera un prix final de 130€.
                </p>
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={isLoading}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FloppyDisk className="h-5 w-5" weight="fill" />
                {isLoading ? 'Sauvegarde en cours...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 5 : Délais de Livraison */}
        <TabsContent value="delivery">
          <Card className="dashboard-card">
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



              </div>

              <p className="text-sm text-muted-foreground">
                Les délais estimés varient entre min et max selon la distance. Plus la distance est grande, plus on tend vers le max.
              </p>

              <Button
                onClick={handleSaveConfig}
                disabled={isLoading}
                size="lg"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FloppyDisk className="h-5 w-5" weight="fill" />
                {isLoading ? 'Sauvegarde en cours...' : 'Sauvegarder'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet 6 : Distances */}
        <TabsContent value="distances">
          <Card className="dashboard-card">
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
                    <Button
                      onClick={handleAddDistance}
                      size="lg"
                      className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-5 w-5" weight="fill" />
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
