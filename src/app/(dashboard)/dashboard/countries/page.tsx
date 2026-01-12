/**
 * Page de gestion des pays
 *
 * Interface CRUD complète pour gérer les pays d'origine et de destination
 * Accessible uniquement aux administrateurs
 */

import { Suspense } from 'react';
import { requireAdmin } from '@/lib/auth/config';
import { listCountries } from '@/modules/countries';
import { CountriesDataTable } from '@/components/countries/countries-data-table';
import { CreateCountryButton } from '@/components/countries/create-country-button';
import { Globe, CircleNotch } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Metadata de la page
 */
export const metadata = {
  title: 'Gestion des pays | Faso Fret Logistics',
  description: 'Gérer les pays d\'origine et de destination pour les expéditions',
};

/**
 * Page principale de gestion des pays
 *
 * Affiche un tableau avec tous les pays et permet d'ajouter, modifier ou supprimer des pays
 * Réservé aux administrateurs uniquement
 */
export default async function CountriesPage() {
  // Vérifier que l'utilisateur est administrateur
  await requireAdmin();

  // Récupérer tous les pays
  const countries = await listCountries();

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#003D82]/10">
              <Globe className="h-6 w-6 text-[#003D82]" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Gestion des pays</h1>
              <p className="text-gray-600">
                Gérez les pays d'origine et de destination pour les expéditions
              </p>
            </div>
          </div>
          <CreateCountryButton />
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="dashboard-card">
          <CardHeader>
            <CardDescription>Total des pays</CardDescription>
            <CardTitle className="text-3xl">{countries.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardDescription>Pays actifs</CardDescription>
            <CardTitle className="text-3xl">
              {countries.filter((c) => c.isActive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardDescription>Pays inactifs</CardDescription>
            <CardTitle className="text-3xl">
              {countries.filter((c) => !c.isActive).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tableau des pays */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Liste des pays</CardTitle>
          <CardDescription>
            Tous les pays disponibles pour les expéditions et devis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <CircleNotch className="h-12 w-12 animate-spin text-[#003D82]" />
                <span className="ml-3 text-lg text-gray-600">Chargement...</span>
              </div>
            }
          >
            <CountriesDataTable countries={countries} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
