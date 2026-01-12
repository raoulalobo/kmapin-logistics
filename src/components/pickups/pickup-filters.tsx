/**
 * Composant Filtres pour les Demandes d'Enlèvement
 *
 * Permet de filtrer les demandes par statut, date, texte, etc.
 * Utilisé dans la page de liste back-office (US-3.1)
 */

'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PickupStatus, PickupTimeSlot } from '@/lib/db/enums';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, Search, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES ET SCHÉMA
// ============================================

/**
 * Schéma de validation des filtres
 */
const pickupFiltersSchema = z.object({
  // Recherche textuelle (tracking number, email, phone, adresse)
  search: z.string().optional(),

  // Filtres par statut (multi-select)
  statuses: z.array(z.nativeEnum(PickupStatus)).optional(),

  // Plage de dates (date de création)
  dateFrom: z.string().optional(), // Format: YYYY-MM-DD
  dateTo: z.string().optional(),

  // Filtres binaires
  onlyUnattached: z.boolean().optional(), // Seulement les non rattachés
  onlyWithTransporter: z.boolean().optional(), // Seulement avec transporteur

  // Créneau horaire
  timeSlot: z.nativeEnum(PickupTimeSlot).optional(),

  // Tri
  sortBy: z.enum(['createdAt', 'requestedDate', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PickupFilters = z.infer<typeof pickupFiltersSchema>;

interface PickupFiltersProps {
  initialValues?: Partial<PickupFilters>;
  onFiltersChange: (filters: PickupFilters) => void;
  onReset?: () => void;
  compact?: boolean; // Mode compact (une ligne)
  className?: string;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Labels des statuts
 */
const STATUS_LABELS: Record<PickupStatus, string> = {
  [PickupStatus.NOUVEAU]: 'Nouveau',
  [PickupStatus.PRISE_EN_CHARGE]: 'Prise en charge',
  [PickupStatus.EFFECTUE]: 'Effectué',
  [PickupStatus.ANNULE]: 'Annulé',
};

/**
 * Labels des créneaux horaires
 */
const TIME_SLOT_LABELS: Record<PickupTimeSlot, string> = {
  [PickupTimeSlot.MORNING]: 'Matin',
  [PickupTimeSlot.AFTERNOON]: 'Après-midi',
  [PickupTimeSlot.SPECIFIC_TIME]: 'Heure précise',
  [PickupTimeSlot.FLEXIBLE]: 'Flexible',
};

/**
 * Options de tri
 */
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date de création' },
  { value: 'requestedDate', label: 'Date souhaitée' },
  { value: 'status', label: 'Statut' },
] as const;

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Composant de filtres pour les demandes d'enlèvement
 *
 * @param initialValues - Valeurs initiales des filtres
 * @param onFiltersChange - Callback appelé quand les filtres changent
 * @param onReset - Callback appelé lors du reset
 * @param compact - Mode compact (une seule ligne)
 * @param className - Classes CSS additionnelles
 *
 * @example
 * ```tsx
 * <PickupFilters
 *   initialValues={{ statuses: [PickupStatus.NOUVEAU] }}
 *   onFiltersChange={(filters) => {
 *     // Refetch avec nouveaux filtres
 *     fetchPickups(filters);
 *   }}
 * />
 * ```
 */
export function PickupFilters({
  initialValues,
  onFiltersChange,
  onReset,
  compact = false,
  className,
}: PickupFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const form = useForm<PickupFilters>({
    resolver: zodResolver(pickupFiltersSchema),
    defaultValues: {
      search: initialValues?.search || '',
      statuses: initialValues?.statuses || [],
      dateFrom: initialValues?.dateFrom || '',
      dateTo: initialValues?.dateTo || '',
      onlyUnattached: initialValues?.onlyUnattached || false,
      onlyWithTransporter: initialValues?.onlyWithTransporter || false,
      timeSlot: initialValues?.timeSlot,
      sortBy: initialValues?.sortBy || 'createdAt',
      sortOrder: initialValues?.sortOrder || 'desc',
    },
  });

  // Appliquer les filtres
  const handleApplyFilters = (data: PickupFilters) => {
    onFiltersChange(data);
  };

  // Reset les filtres
  const handleReset = () => {
    form.reset({
      search: '',
      statuses: [],
      dateFrom: '',
      dateTo: '',
      onlyUnattached: false,
      onlyWithTransporter: false,
      timeSlot: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    if (onReset) {
      onReset();
    } else {
      // Appliquer les filtres vides
      onFiltersChange({
        search: '',
        statuses: [],
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    }
  };

  // Compter les filtres actifs
  const activeFiltersCount = (() => {
    let count = 0;
    const values = form.getValues();

    if (values.search) count++;
    if (values.statuses && values.statuses.length > 0) count++;
    if (values.dateFrom || values.dateTo) count++;
    if (values.onlyUnattached) count++;
    if (values.onlyWithTransporter) count++;
    if (values.timeSlot) count++;

    return count;
  })();

  if (compact && !isExpanded) {
    // Mode compact replié : barre de recherche + bouton expand
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (numéro, email, téléphone, adresse)..."
                value={form.watch('search') || ''}
                onChange={(e) => {
                  form.setValue('search', e.target.value);
                  // Auto-submit sur recherche textuelle
                  handleApplyFilters(form.getValues());
                }}
                className="pl-10"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExpanded(true)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mode complet déplié
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtres</span>
              {activeFiltersCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({activeFiltersCount} actif{activeFiltersCount > 1 ? 's' : ''})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Filtrez les demandes d&apos;enlèvement selon vos critères
            </CardDescription>
          </div>

          {compact && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleApplyFilters)}
            className="space-y-6"
          >
            {/* Recherche textuelle */}
            <FormField
              control={form.control}
              name="search"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recherche</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Numéro de suivi, email, téléphone, adresse..."
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Recherche dans tous les champs textuels
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Filtres par statut */}
            <div className="space-y-2">
              <Label>Statuts</Label>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(PickupStatus).map((status) => {
                  const statuses = form.watch('statuses') || [];
                  const isChecked = statuses.includes(status);

                  return (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const currentStatuses = form.getValues('statuses') || [];
                          const updatedStatuses = checked
                            ? [...currentStatuses, status]
                            : currentStatuses.filter((s) => s !== status);
                          form.setValue('statuses', updatedStatuses, { shouldDirty: true });
                        }}
                      />
                      <Label
                        htmlFor={`status-${status}`}
                        className="font-normal cursor-pointer"
                      >
                        {STATUS_LABELS[status]}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plage de dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="date" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="date" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Créneau horaire */}
            <FormField
              control={form.control}
              name="timeSlot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Créneau horaire</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les créneaux" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">Tous les créneaux</SelectItem>
                      {Object.values(PickupTimeSlot).map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {TIME_SLOT_LABELS[slot]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Filtres binaires */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="onlyUnattached"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label className="font-normal cursor-pointer">
                      Uniquement les demandes non rattachées à un compte
                    </Label>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="onlyWithTransporter"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label className="font-normal cursor-pointer">
                      Uniquement les demandes avec transporteur assigné
                    </Label>
                  </FormItem>
                )}
              />
            </div>

            {/* Tri */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sortBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trier par</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="desc">Décroissant</SelectItem>
                        <SelectItem value="asc">Croissant</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={activeFiltersCount === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
              <Button type="submit">
                <Filter className="h-4 w-4 mr-2" />
                Appliquer les filtres
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
