/**
 * Composant PackageFieldArray — Gestion dynamique des colis dans un devis
 *
 * Basé sur useFieldArray de React Hook Form, ce composant permet d'ajouter,
 * modifier et supprimer des lignes de colis dans le formulaire de devis.
 *
 * Chaque ligne représente un type de colis avec :
 * - Description (optionnelle)
 * - Quantité (nombre de colis identiques)
 * - Type de marchandise (cargoType)
 * - Poids unitaire (kg)
 * - Dimensions unitaires (L × l × H en cm)
 *
 * @example
 * // Dans un formulaire React Hook Form :
 * <PackageFieldArray control={form.control} />
 *
 * @module components/quotes
 */

'use client';

import { useFieldArray, type Control } from 'react-hook-form';
import { Plus, Trash, Package } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Labels français pour les types de marchandise
 * Correspondance entre les valeurs enum CargoType et leur affichage
 */
const CARGO_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'Générale',
  DANGEROUS: 'Dangereuse',
  PERISHABLE: 'Périssable',
  FRAGILE: 'Fragile',
  BULK: 'Vrac',
  CONTAINER: 'Conteneur',
  PALLETIZED: 'Palettisée',
  OTHER: 'Autre',
};

/**
 * Type du formulaire attendu par le composant
 * Le formulaire parent doit avoir un champ `packages` de type array
 */
interface PackageFieldArrayForm {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packages: any[];
  // Accepte n'importe quel autre champ du formulaire parent
  [key: string]: unknown;
}

interface PackageFieldArrayProps {
  /** Control de React Hook Form du formulaire parent */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

/**
 * Composant de gestion dynamique des colis (lignes de packages)
 *
 * Utilise useFieldArray pour gérer un tableau de colis dans le formulaire.
 * Chaque ligne peut être ajoutée, modifiée ou supprimée indépendamment.
 *
 * Pattern : "Array Form" — chaque ligne est un sous-formulaire avec ses propres champs validés.
 * Le bouton "Ajouter un colis" insère une nouvelle ligne avec des valeurs par défaut.
 * Le bouton "Supprimer" retire une ligne (minimum 1 colis requis).
 */
export function PackageFieldArray({ control }: PackageFieldArrayProps) {
  // useFieldArray gère l'ajout/suppression de lignes dans le tableau `packages`
  // Il fournit : fields (les lignes), append (ajouter), remove (supprimer)
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'packages',
  });

  return (
    <div className="space-y-4">
      {/* En-tête avec compteur de colis */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {fields.length} {fields.length > 1 ? 'types de colis' : 'type de colis'}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            // Ajouter une nouvelle ligne avec des valeurs par défaut
            append({
              description: '',
              quantity: 1,
              cargoType: 'GENERAL',
              weight: undefined,
              length: undefined,
              width: undefined,
              height: undefined,
            })
          }
        >
          <Plus className="h-4 w-4" />
          Ajouter un colis
        </Button>
      </div>

      {/* Liste des lignes de colis */}
      {fields.map((field, index) => (
        <Card key={field.id} className="border-dashed">
          <CardContent className="pt-4 pb-4 space-y-3">
            {/* En-tête de la ligne : numéro + bouton supprimer */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">
                Colis #{index + 1}
              </span>
              {/* Autoriser la suppression seulement si plus d'un colis */}
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => remove(index)}
                  title="Supprimer ce colis"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Ligne 1 : Description + Quantité + Type */}
            <div className="grid gap-3 md:grid-cols-[1fr_100px_160px]">
              {/* Description (optionnelle) */}
              <FormField
                control={control}
                name={`packages.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ex: "Tablette Samsung", "Cartons vêtements"'
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantité */}
              <FormField
                control={control}
                name={`packages.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Quantité *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseInt(val, 10));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type de marchandise */}
              <FormField
                control={control}
                name={`packages.${index}.cargoType`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CARGO_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Ligne 2 : Poids + Dimensions (L × l × H) */}
            <div className="grid gap-3 md:grid-cols-4">
              {/* Poids unitaire */}
              <FormField
                control={control}
                name={`packages.${index}.weight`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Poids unitaire (kg) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Ex: 15"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Longueur */}
              <FormField
                control={control}
                name={`packages.${index}.length`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Longueur (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="L"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Largeur */}
              <FormField
                control={control}
                name={`packages.${index}.width`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Largeur (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="l"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hauteur */}
              <FormField
                control={control}
                name={`packages.${index}.height`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Hauteur (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="H"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Message si aucun colis (ne devrait pas arriver grâce au min(1)) */}
      {fields.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun colis ajouté</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 gap-2"
            onClick={() =>
              append({
                description: '',
                quantity: 1,
                cargoType: 'GENERAL',
                weight: undefined,
                length: undefined,
                width: undefined,
                height: undefined,
              })
            }
          >
            <Plus className="h-4 w-4" />
            Ajouter le premier colis
          </Button>
        </div>
      )}
    </div>
  );
}
