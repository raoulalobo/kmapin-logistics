/**
 * Tableau de données des pays
 *
 * Affiche tous les pays dans un tableau avec actions (éditer, supprimer, activer/désactiver)
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DotsThree, PencilSimple, Trash, Power } from '@phosphor-icons/react';
import { deleteCountry, toggleCountryStatus } from '@/modules/countries';
import { CountryFormDialog } from './country-form-dialog';

interface Country {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CountriesDataTableProps {
  /** Liste des pays à afficher */
  countries: Country[];
}

/**
 * Tableau de données des pays avec actions CRUD
 *
 * @param countries - Liste des pays
 *
 * @example
 * ```tsx
 * <CountriesDataTable countries={countries} />
 * ```
 */
export function CountriesDataTable({ countries }: CountriesDataTableProps) {
  const router = useRouter();
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [deletingCountry, setDeletingCountry] = useState<Country | null>(null);

  /**
   * Bascule l'état actif/inactif d'un pays
   */
  async function handleToggleStatus(country: Country) {
    try {
      await toggleCountryStatus(country.id);
      toast.success(
        `Pays ${country.isActive ? 'désactivé' : 'activé'} avec succès`
      );
      router.refresh();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      toast.error('Erreur lors du changement de statut');
    }
  }

  /**
   * Supprime un pays
   */
  async function handleDelete() {
    if (!deletingCountry) return;

    try {
      await deleteCountry(deletingCountry.id);
      toast.success('Pays supprimé avec succès');
      setDeletingCountry(null);
      router.refresh();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la suppression'
      );
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  Aucun pays enregistré
                </TableCell>
              </TableRow>
            ) : (
              countries.map((country) => (
                <TableRow key={country.id}>
                  <TableCell className="font-mono font-semibold">
                    {country.code}
                  </TableCell>
                  <TableCell className="font-medium">
                    {country.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={country.isActive ? 'default' : 'secondary'}
                      className={
                        country.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {country.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {new Date(country.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <DotsThree className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setEditingCountry(country)}
                          className="cursor-pointer"
                        >
                          <PencilSimple className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(country)}
                          className="cursor-pointer"
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {country.isActive ? 'Désactiver' : 'Activer'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingCountry(country)}
                          className="cursor-pointer text-red-600"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog d'édition */}
      {editingCountry && (
        <CountryFormDialog
          open={!!editingCountry}
          onOpenChange={(open) => !open && setEditingCountry(null)}
          mode="edit"
          country={editingCountry}
        />
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog
        open={!!deletingCountry}
        onOpenChange={(open) => !open && setDeletingCountry(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le pays{' '}
              <strong>{deletingCountry?.name}</strong> ({deletingCountry?.code}) ?
              <br />
              <br />
              Cette action est irréversible et peut affecter les expéditions et devis existants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
