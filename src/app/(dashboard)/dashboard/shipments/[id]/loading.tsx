/**
 * Skeleton de chargement pour la page Détail Expédition
 *
 * Affiché pendant le chargement des données de l'expédition
 * Structure : En-tête + Infos principales + Timeline + Documents
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function ShipmentDetailsLoading() {
  return (
    <div className="space-y-6">
      {/* En-tête : Bouton retour + Titre + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" /> {/* Bouton retour */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-[300px]" /> {/* Numéro tracking */}
            <Skeleton className="h-4 w-[200px]" /> {/* Date */}
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[120px]" /> {/* Bouton modifier */}
          <Skeleton className="h-10 w-[120px]" /> {/* Bouton supprimer */}
        </div>
      </div>

      {/* Badge de statut et paiement */}
      <div className="flex gap-3">
        <Skeleton className="h-7 w-[140px] rounded-full" />
        <Skeleton className="h-7 w-[120px] rounded-full" />
      </div>

      <Separator />

      {/* Grille : Informations principales */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Carte Origine */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[140px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-5 w-[180px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[90px]" />
              <Skeleton className="h-5 w-[160px]" />
            </div>
          </CardContent>
        </Card>

        {/* Carte Destination */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[140px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-5 w-[180px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[90px]" />
              <Skeleton className="h-5 w-[160px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Carte Détails de la marchandise */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-5 w-[120px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-5 w-[100px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[90px]" />
              <Skeleton className="h-5 w-[140px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline d'historique */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 4 événements simulés */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              {/* Icône + ligne verticale */}
              <div className="flex flex-col items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                {i < 4 && <div className="w-0.5 h-16 bg-border" />}
              </div>
              {/* Contenu de l'événement */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-[200px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Informations de facturation */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[220px]" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-[140px]" />
            <Skeleton className="h-5 w-[100px]" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-5 w-[120px]" />
            <Skeleton className="h-5 w-[80px]" />
          </div>
          <Separator />
          <div className="flex justify-between">
            <Skeleton className="h-6 w-[100px]" />
            <Skeleton className="h-6 w-[120px]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
